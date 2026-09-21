import { FirestoreUserProfile, Env } from "../types";

let cachedSaToken: { token: string; expiresAt: number } | null = null;

/**
 * Parses raw Firestore REST API field values into plain JavaScript values.
 */
export function parseFirestoreValue(val: any): any {
  if (!val || typeof val !== "object") return val;

  if ("stringValue" in val) return val.stringValue;
  if ("booleanValue" in val) return val.booleanValue;
  if ("integerValue" in val) return parseInt(val.integerValue, 10);
  if ("doubleValue" in val) return parseFloat(val.doubleValue);
  if ("timestampValue" in val) return val.timestampValue;
  if ("nullValue" in val) return null;
  if ("arrayValue" in val) {
    const values = val.arrayValue.values || [];
    return values.map(parseFirestoreValue);
  }
  if ("mapValue" in val) {
    const fields = val.mapValue.fields || {};
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      result[k] = parseFirestoreValue(v);
    }
    return result;
  }
  return val;
}

export function parseFirestoreDocument(docData: any): any {
  if (!docData || !docData.fields) return null;
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(docData.fields)) {
    result[key] = parseFirestoreValue(val);
  }
  return result;
}

/**
 * Converts a PEM private key string to a CryptoKey for Web Crypto RS256 signing.
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const cleanPem = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\r?\n/g, "")
    .replace(/\s+/g, "");

  const binary = atob(cleanPem);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
}

function base64UrlEncode(data: Uint8Array | string): string {
  const str = typeof data === "string" ? data : String.fromCharCode(...data);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Generates an OAuth 2.0 Access Token using a Google Service Account key.
 * Caches token for 50 minutes (validity is 60 minutes).
 */
async function getServiceAccountAccessToken(serviceAccountJson: string): Promise<string> {
  const now = Date.now();
  if (cachedSaToken && cachedSaToken.expiresAt > now) {
    return cachedSaToken.token;
  }

  const sa = JSON.parse(serviceAccountJson);
  const nowInSec = Math.floor(now / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: nowInSec,
    exp: nowInSec + 3600,
    scope: "https://www.googleapis.com/auth/datastore",
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const stringToSign = `${encodedHeader}.${encodedPayload}`;

  const privateKey = await importPrivateKey(sa.private_key);
  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(stringToSign)
  );

  const assertion = `${stringToSign}.${base64UrlEncode(new Uint8Array(signatureBuffer))}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Failed to obtain Google service account token: ${tokenRes.status} - ${err}`);
  }

  const tokenData = (await tokenRes.json()) as { access_token: string; expires_in?: number };
  const expiresIn = tokenData.expires_in || 3600;

  cachedSaToken = {
    token: tokenData.access_token,
    expiresAt: now + (expiresIn - 300) * 1000, // Refresh 5 mins early
  };

  return cachedSaToken.token;
}

/**
 * Fetches a user document from Firestore using the Firestore REST API.
 * Uses Service Account token if configured, otherwise falls back to user token.
 */
export async function fetchUserFromFirestore(
  uid: string,
  userToken: string,
  env: Env
): Promise<FirestoreUserProfile | null> {
  const projectId = env.FIREBASE_PROJECT_ID || "crackflow";
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;

  let authHeader = `Bearer ${userToken}`;

  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const saToken = await getServiceAccountAccessToken(env.FIREBASE_SERVICE_ACCOUNT_JSON);
      authHeader = `Bearer ${saToken}`;
    } catch (saErr: any) {
      console.warn("[Firestore] Service account token error, falling back to user token:", saErr?.message || saErr);
    }
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Firestore REST API returned ${response.status}: ${errorBody}`);
  }

  const doc = await response.json();
  const data = parseFirestoreDocument(doc);
  return data as FirestoreUserProfile;
}

/**
 * Converts a JS object/primitive into Firestore REST field format.
 */
export function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    return Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
  }
  if (typeof val === "string") {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

/**
 * Gets a valid Authorization header for Firestore REST API writes (Service Account required).
 */
async function getAdminAuthHeader(env: Env): Promise<string> {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is required for Firestore write operations.");
  }
  const token = await getServiceAccountAccessToken(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  return `Bearer ${token}`;
}

/**
 * Updates a user's entitlement / profile fields in Firestore.
 */
export async function updateUserInFirestore(
  uid: string,
  fields: Partial<FirestoreUserProfile>,
  env: Env
): Promise<void> {
  const projectId = env.FIREBASE_PROJECT_ID || "crackflow";
  const authHeader = await getAdminAuthHeader(env);

  const fieldPaths = Object.keys(fields);
  if (fieldPaths.length === 0) return;

  const updateMaskQuery = fieldPaths.map((p) => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join("&");
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}?${updateMaskQuery}`;

  const firestoreFields: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    firestoreFields[k] = toFirestoreValue(v);
  }

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: firestoreFields }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Failed to update user in Firestore (${response.status}): ${errBody}`);
  }
}

/**
 * Checks if a Stripe webhook event has already been successfully processed.
 * Uses dedicated collection: stripeWebhookEvents/{eventId}
 */
export async function checkWebhookEventProcessed(eventId: string, env: Env): Promise<boolean> {
  const projectId = env.FIREBASE_PROJECT_ID || "crackflow";
  const authHeader = await getAdminAuthHeader(env);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stripeWebhookEvents/${eventId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 200) {
    return true; // Already processed
  }
  if (response.status === 404) {
    return false; // Not processed yet
  }

  const errText = await response.text();
  console.warn(`[Firestore] checkWebhookEventProcessed unexpected status ${response.status}: ${errText}`);
  return false;
}

/**
 * Records a processed Stripe webhook event in stripeWebhookEvents/{eventId}.
 * Uses createDocument with documentId query param. Returns true if created, false if already existed (409 Conflict).
 */
export async function recordWebhookEvent(
  eventId: string,
  eventType: string,
  uid: string,
  env: Env
): Promise<boolean> {
  const projectId = env.FIREBASE_PROJECT_ID || "crackflow";
  const authHeader = await getAdminAuthHeader(env);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/stripeWebhookEvents?documentId=${encodeURIComponent(
    eventId
  )}`;

  const fields = {
    stripeEventId: toFirestoreValue(eventId),
    eventType: toFirestoreValue(eventType),
    uid: toFirestoreValue(uid),
    processedAt: toFirestoreValue(new Date().toISOString()),
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });

  if (response.status === 200 || response.status === 201) {
    return true;
  }

  if (response.status === 409) {
    // Already created concurrently
    return false;
  }

  const errBody = await response.text();
  throw new Error(`Failed to record webhook event in Firestore (${response.status}): ${errBody}`);
}

/**
 * Finds user by stripe customerId using Firestore runQuery if metadata.uid was missing.
 */
export async function getUserByCustomerId(
  customerId: string,
  env: Env
): Promise<{ uid: string; profile: FirestoreUserProfile } | null> {
  const projectId = env.FIREBASE_PROJECT_ID || "crackflow";
  const authHeader = await getAdminAuthHeader(env);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

  const queryPayload = {
    structuredQuery: {
      from: [{ collectionId: "users" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "customerId" },
          op: "EQUAL",
          value: { stringValue: customerId },
        },
      },
      limit: 1,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(queryPayload),
  });

  if (!res.ok) {
    return null;
  }

  const results = (await res.json()) as any[];
  if (!Array.isArray(results) || results.length === 0 || !results[0].document) {
    return null;
  }

  const doc = results[0].document;
  const docName = doc.name || "";
  const uid = docName.split("/").pop() || "";
  const profile = parseFirestoreDocument(doc) as FirestoreUserProfile;

  return { uid, profile };
}
