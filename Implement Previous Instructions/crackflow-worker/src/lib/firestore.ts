import { FirestoreUserProfile, Env, InterviewSessionDoc, DailyApiUsageDoc } from "../types";

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
 * Wraps fetch with automatic retry on transient socket drops or 503/429 responses.
 */
async function fetchWithRetry(url: string, init?: RequestInit, retries = 2): Promise<Response> {
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(url, init);
      if ((res.status === 503 || res.status === 429) && attempt < retries) {
        attempt++;
        await new Promise((r) => setTimeout(r, 200 * attempt));
        continue;
      }
      return res;
    } catch (err: any) {
      if (attempt < retries) {
        attempt++;
        await new Promise((r) => setTimeout(r, 250 * attempt));
        continue;
      }
      throw err;
    }
  }
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

  const response = await fetchWithRetry(url, {
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

  const response = await fetchWithRetry(url, {
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

  const response = await fetchWithRetry(url, {
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

  const response = await fetchWithRetry(url, {
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

/**
 * Atomically increments usage in Firestore using the Firestore REST API :commit endpoint
 * with FieldTransform.increment.
 * This guarantees race-condition-free accounting when requests happen simultaneously.
 */
export async function atomicIncrementUsage(
  uid: string,
  accessType: "pack" | "subscription",
  durationSeconds: number,
  env: Env
): Promise<void> {
  if (durationSeconds <= 0) return;

  const projectId = env.FIREBASE_PROJECT_ID || "crackflow";
  const authHeader = await getAdminAuthHeader(env);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;

  const fieldToIncrement =
    accessType === "pack" ? "packUsedSeconds" : "subscriptionUsedSeconds";
  const userDocPath = `projects/${projectId}/databases/(default)/documents/users/${uid}`;

  const commitPayload = {
    writes: [
      {
        transform: {
          document: userDocPath,
          fieldTransforms: [
            {
              fieldPath: fieldToIncrement,
              increment: {
                integerValue: durationSeconds.toString(),
              },
            },
          ],
        },
      },
      {
        update: {
          name: userDocPath,
          fields: {
            updatedAt: { stringValue: new Date().toISOString() },
          },
        },
        updateMask: {
          fieldPaths: ["updatedAt"],
        },
      },
    ],
  };

  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commitPayload),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[Firestore] atomicIncrementUsage failed (${response.status}): ${errText}`);
    throw new Error(`Failed to atomically deduct usage in Firestore: ${response.status}`);
  }
}

/**
 * Creates an interview session document in sessions/{sessionId}.
 */
export async function createSessionInFirestore(
  session: InterviewSessionDoc,
  env: Env
): Promise<void> {
  const projectId = env.FIREBASE_PROJECT_ID || "crackflow";
  const authHeader = await getAdminAuthHeader(env);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/sessions?documentId=${encodeURIComponent(
    session.sessionId
  )}`;

  const firestoreFields: Record<string, any> = {};
  for (const [k, v] of Object.entries(session)) {
    firestoreFields[k] = toFirestoreValue(v);
  }

  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: firestoreFields }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`[Firestore] createSessionInFirestore failed (${response.status}): ${err}`);
    throw new Error(`Failed to create interview session: ${response.status}`);
  }
}

/**
 * Finds the currently active interview session for a user, if one exists.
 */
export async function getActiveSessionFromFirestore(
  uid: string,
  env: Env
): Promise<InterviewSessionDoc | null> {
  const projectId = env.FIREBASE_PROJECT_ID || "crackflow";
  const authHeader = await getAdminAuthHeader(env);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

  const queryPayload = {
    structuredQuery: {
      from: [{ collectionId: "sessions" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: "uid" },
                op: "EQUAL",
                value: { stringValue: uid },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: "status" },
                op: "EQUAL",
                value: { stringValue: "active" },
              },
            },
          ],
        },
      },
      limit: 1,
    },
  };

  const res = await fetchWithRetry(url, {
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
  return parseFirestoreDocument(doc) as InterviewSessionDoc;
}

/**
 * Fetches an interview session document directly by sessionId.
 */
export async function getSessionByIdFromFirestore(
  sessionId: string,
  env: Env
): Promise<InterviewSessionDoc | null> {
  const projectId = env.FIREBASE_PROJECT_ID || "crackflow";
  const authHeader = await getAdminAuthHeader(env);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/sessions/${encodeURIComponent(
    sessionId
  )}`;

  const response = await fetchWithRetry(url, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const err = await response.text();
    console.warn(`[Firestore] getSessionByIdFromFirestore error ${response.status}: ${err}`);
    return null;
  }

  const doc = await response.json();
  return parseFirestoreDocument(doc) as InterviewSessionDoc;
}


/**
 * Updates an interview session document in sessions/{sessionId}.
 */
export async function updateSessionInFirestore(
  sessionId: string,
  fields: Partial<InterviewSessionDoc>,
  env: Env
): Promise<void> {
  const projectId = env.FIREBASE_PROJECT_ID || "crackflow";
  const authHeader = await getAdminAuthHeader(env);

  const fieldPaths = Object.keys(fields);
  if (fieldPaths.length === 0) return;

  const updateMaskQuery = fieldPaths
    .map((p) => `updateMask.fieldPaths=${encodeURIComponent(p)}`)
    .join("&");
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/sessions/${encodeURIComponent(
    sessionId
  )}?${updateMaskQuery}`;

  const firestoreFields: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    firestoreFields[k] = toFirestoreValue(v);
  }

  const response = await fetchWithRetry(url, {
    method: "PATCH",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: firestoreFields }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`[Firestore] updateSessionInFirestore failed (${response.status}): ${err}`);
    throw new Error(`Failed to update interview session: ${response.status}`);
  }
}

/**
 * Records an API usage event asynchronously into daily aggregated metrics:
 * Document: usage/{uid}_{YYYY-MM-DD} (or via runQuery/commit)
 * Tracks: totalApiCalls, endpoint counters, rejectedCalls, rateLimitedCalls
 */
export async function recordApiUsage(
  uid: string,
  endpoint: string,
  isRejected: boolean,
  isRateLimited: boolean,
  env: Env
): Promise<void> {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) return;

  try {
    const projectId = env.FIREBASE_PROJECT_ID || "crackflow";
    const authHeader = await getAdminAuthHeader(env);
    const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const docId = `${uid}_${dateStr}`;
    const docPath = `projects/${projectId}/databases/(default)/documents/usage/${docId}`;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;

    const fieldTransforms: any[] = [
      {
        fieldPath: "totalApiCalls",
        increment: { integerValue: "1" },
      },
    ];

    if (endpoint.includes("/v1/ai/complete")) {
      fieldTransforms.push({
        fieldPath: "aiCompleteCalls",
        increment: { integerValue: "1" },
      });
    } else if (endpoint.includes("/v1/stt/token")) {
      fieldTransforms.push({
        fieldPath: "sttTokenCalls",
        increment: { integerValue: "1" },
      });
    } else if (endpoint.includes("/v1/interview/start")) {
      fieldTransforms.push({
        fieldPath: "interviewStartCalls",
        increment: { integerValue: "1" },
      });
    } else if (endpoint.includes("/v1/session/end")) {
      fieldTransforms.push({
        fieldPath: "sessionEndCalls",
        increment: { integerValue: "1" },
      });
    } else if (endpoint.includes("/v1/me")) {
      fieldTransforms.push({
        fieldPath: "meCalls",
        increment: { integerValue: "1" },
      });
    }

    if (isRejected) {
      fieldTransforms.push({
        fieldPath: "rejectedCalls",
        increment: { integerValue: "1" },
      });
    }

    if (isRateLimited) {
      fieldTransforms.push({
        fieldPath: "rateLimitedCalls",
        increment: { integerValue: "1" },
      });
    }

    const payload = {
      writes: [
        {
          transform: {
            document: docPath,
            fieldTransforms,
          },
        },
        {
          update: {
            name: docPath,
            fields: {
              uid: { stringValue: uid },
              date: { stringValue: dateStr },
              updatedAt: { stringValue: new Date().toISOString() },
            },
          },
          updateMask: {
            fieldPaths: ["uid", "date", "updatedAt"],
          },
        },
      ],
    };

    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.warn("[Analytics] Error saving daily API usage:", err?.message || err);
    });
  } catch (err) {
    console.warn("[Analytics] Error in recordApiUsage:", err);
  }
}

export interface ScreenQuotaReservationResult {
  success: boolean;
  remainingSolves: number;
  isUnlimited: boolean;
  alreadyReserved?: boolean;
  error?: "USER_NOT_FOUND" | "SCREEN_QUOTA_EXHAUSTED" | "SCREEN_ACCESS_EXPIRED" | "SCREEN_QUOTA_RESERVATION_FAILED";
}

/**
 * Fetches raw Firestore document representation including doc.updateTime (for OCC preconditions).
 */
export async function fetchRawUserDocFromFirestore(
  uid: string,
  env: Env
): Promise<{ name: string; updateTime: string; fields: Record<string, any> } | null> {
  const projectId = env.FIREBASE_PROJECT_ID || "crackflow";
  const authHeader = await getAdminAuthHeader(env);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;

  const response = await fetchWithRetry(url, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Firestore GET raw user returned ${response.status}: ${err}`);
  }

  const doc = await response.json() as any;
  return {
    name: doc.name,
    updateTime: doc.updateTime,
    fields: doc.fields || {},
  };
}

/**
 * Concurrency-Safe Durable Quota Reservation.
 * Uses Optimistic Concurrency Control (OCC) via currentDocument.updateTime.
 * Guarantees zero-floor enforcement: concurrent requests CANNOT drive remainingSolves below zero.
 * Supports idempotency: retries with same idempotencyKey do not double-charge.
 */
export async function atomicReserveScreenQuota(
  uid: string,
  idempotencyKey: string,
  env: Env
): Promise<ScreenQuotaReservationResult> {
  const projectId = env.FIREBASE_PROJECT_ID || "crackflow";
  const authHeader = await getAdminAuthHeader(env);
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rawDoc = await fetchRawUserDocFromFirestore(uid, env);
    if (!rawDoc) {
      return { success: false, remainingSolves: 0, isUnlimited: false, error: "USER_NOT_FOUND" };
    }

    const profile = parseFirestoreDocument(rawDoc) as FirestoreUserProfile;
    const isSub = profile.accessType === "subscription" || ["monthly", "yearly", "lifetime"].includes(profile.planTier);

    // Check plan expiration
    const now = Date.now();
    if (profile.accessType === "pack" && profile.packExpiresAt) {
      if (new Date(profile.packExpiresAt).getTime() < now) {
        return { success: false, remainingSolves: 0, isUnlimited: false, error: "SCREEN_ACCESS_EXPIRED" };
      }
    }
    if (isSub && !profile.lifetime && profile.currentPeriodEnd) {
      if (new Date(profile.currentPeriodEnd).getTime() < now) {
        return { success: false, remainingSolves: 0, isUnlimited: true, error: "SCREEN_ACCESS_EXPIRED" };
      }
    }

    // Idempotency check: if this exact idempotencyKey was already reserved, return success
    if (
      profile.lastScreenshotReservation &&
      profile.lastScreenshotReservation.idempotencyKey === idempotencyKey &&
      profile.lastScreenshotReservation.status === "reserved"
    ) {
      return {
        success: true,
        remainingSolves: profile.screenSolvesRemaining || 0,
        isUnlimited: isSub,
        alreadyReserved: true,
      };
    }

    let currentRemaining = profile.screenSolvesRemaining ?? 0;
    let currentUsed = profile.screenSolvesUsed ?? 0;

    // Subscription Period-aware reset
    if (isSub && profile.screenQuotaPeriodEnd) {
      const periodEndMs = new Date(profile.screenQuotaPeriodEnd).getTime();
      if (now > periodEndMs) {
        const cycleDays = profile.planTier === "yearly" ? 365 : 30;
        const newPeriodEnd = new Date(now + cycleDays * 24 * 60 * 60 * 1000).toISOString();
        const quota = profile.planTier === "yearly" ? 5880 : 1175;
        currentRemaining = quota;
        currentUsed = 0;
      }
    }

    // Strict zero-floor enforcement: cannot drive quota below zero
    if (currentRemaining <= 0) {
      return { success: false, remainingSolves: 0, isUnlimited: isSub, error: "SCREEN_QUOTA_EXHAUSTED" };
    }

    const newRemaining = currentRemaining - 1;
    const newUsed = currentUsed + 1;
    const nowIso = new Date().toISOString();

    const commitPayload = {
      writes: [
        {
          update: {
            name: rawDoc.name,
            fields: {
              ...rawDoc.fields,
              screenSolvesRemaining: { integerValue: newRemaining.toString() },
              screenSolvesUsed: { integerValue: newUsed.toString() },
              updatedAt: { stringValue: nowIso },
              lastScreenshotReservation: {
                mapValue: {
                  fields: {
                    idempotencyKey: { stringValue: idempotencyKey },
                    reservedAt: { stringValue: nowIso },
                    status: { stringValue: "reserved" },
                  },
                },
              },
            },
          },
          updateMask: {
            fieldPaths: ["screenSolvesRemaining", "screenSolvesUsed", "updatedAt", "lastScreenshotReservation"],
          },
          currentDocument: {
            updateTime: rawDoc.updateTime,
          },
        },
      ],
    };

    const commitRes = await fetchWithRetry(commitUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commitPayload),
    });

    if (commitRes.status === 200) {
      return {
        success: true,
        remainingSolves: newRemaining,
        isUnlimited: isSub,
        alreadyReserved: false,
      };
    }

    // HTTP 409 ABORTED or 412 PRECONDITION_FAILED means concurrent update changed the document
    if (commitRes.status === 409 || commitRes.status === 412) {
      await new Promise((r) => setTimeout(r, 40 * (attempt + 1)));
      continue;
    }

    const errBody = await commitRes.text();
    console.error(`[Firestore] atomicReserveScreenQuota error (${commitRes.status}):`, errBody);
    return {
      success: false,
      remainingSolves: currentRemaining,
      isUnlimited: isSub,
      error: "SCREEN_QUOTA_RESERVATION_FAILED",
    };
  }

  return {
    success: false,
    remainingSolves: 0,
    isUnlimited: false,
    error: "SCREEN_QUOTA_RESERVATION_FAILED",
  };
}

/**
 * Idempotent atomic refund of a screenshot credit if Gemini fails before streaming starts.
 */
export async function refundScreenQuota(
  uid: string,
  idempotencyKey: string,
  reason: string,
  env: Env
): Promise<void> {
  const projectId = env.FIREBASE_PROJECT_ID || "crackflow";
  const authHeader = await getAdminAuthHeader(env);
  const userDocPath = `projects/${projectId}/databases/(default)/documents/users/${uid}`;
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;

  const nowIso = new Date().toISOString();
  const commitPayload = {
    writes: [
      {
        transform: {
          document: userDocPath,
          fieldTransforms: [
            {
              fieldPath: "screenSolvesRemaining",
              increment: { integerValue: "1" },
            },
            {
              fieldPath: "screenSolvesUsed",
              increment: { integerValue: "-1" },
            },
          ],
        },
      },
      {
        update: {
          name: userDocPath,
          fields: {
            updatedAt: { stringValue: nowIso },
            lastScreenshotReservation: {
              mapValue: {
                fields: {
                  idempotencyKey: { stringValue: idempotencyKey },
                  reservedAt: { stringValue: nowIso },
                  status: { stringValue: "refunded" },
                  refundReason: { stringValue: reason },
                },
              },
            },
          },
        },
        updateMask: {
          fieldPaths: ["updatedAt", "lastScreenshotReservation"],
        },
      },
    ],
  };

  const response = await fetchWithRetry(commitUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commitPayload),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[Firestore] refundScreenQuota failed (${response.status}): ${errText}`);
  }
}


