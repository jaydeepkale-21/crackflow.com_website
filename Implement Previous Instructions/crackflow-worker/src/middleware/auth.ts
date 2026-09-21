import { DecodedFirebaseToken, Env, AuthenticatedUser, EntitledUser } from "../types";
import { fetchUserFromFirestore } from "../lib/firestore";

interface JwkKey {
  kty: string;
  alg: string;
  use: string;
  kid: string;
  n: string;
  e: string;
}

interface JwksResponse {
  keys: JwkKey[];
}

let cachedJwks: { keys: JwkKey[]; expiresAt: number } | null = null;

function base64UrlToUint8Array(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeJwtPart<T>(part: string): T {
  const bytes = base64UrlToUint8Array(part);
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text);
}

/**
 * Fetch Google's public JWK certificates used to verify Firebase ID tokens.
 * Caches in memory according to Cache-Control or default 1 hour.
 */
async function getGoogleJwks(): Promise<JwkKey[]> {
  const now = Date.now();
  if (cachedJwks && cachedJwks.expiresAt > now) {
    return cachedJwks.keys;
  }

  const res = await fetch(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch Google public JWKs: ${res.status}`);
  }

  let maxAge = 3600;
  const cacheControl = res.headers.get("cache-control");
  if (cacheControl) {
    const match = cacheControl.match(/max-age=(\d+)/);
    if (match) {
      maxAge = parseInt(match[1], 10);
    }
  }

  const data = (await res.json()) as JwksResponse;
  cachedJwks = {
    keys: data.keys,
    expiresAt: now + maxAge * 1000,
  };
  return data.keys;
}

/**
 * Verifies a Firebase ID token using Web Crypto API.
 * Validates cryptographic signature, expiry, audience, issuer, and subject.
 */
export async function verifyFirebaseToken(
  token: string,
  projectId: string
): Promise<DecodedFirebaseToken> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format: Token must have 3 segments.");
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = decodeJwtPart<{ alg: string; kid: string }>(headerB64);
  const payload = decodeJwtPart<DecodedFirebaseToken>(payloadB64);

  if (header.alg !== "RS256") {
    throw new Error(`Unsupported token algorithm: ${header.alg}. Expected RS256.`);
  }

  if (!header.kid) {
    throw new Error("JWT header missing 'kid' field.");
  }

  const keys = await getGoogleJwks();
  const matchingKey = keys.find((k) => k.kid === header.kid);
  if (!matchingKey) {
    throw new Error("No matching public key found for token's kid.");
  }

  // Import key into Web Crypto
  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    matchingKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["verify"]
  );

  // Verify signature
  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlToUint8Array(signatureB64);

  const isValid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    signature,
    signedData
  );

  if (!isValid) {
    throw new Error("Invalid token signature.");
  }

  // Validate standard Firebase claims
  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (payload.exp <= nowInSeconds) {
    throw new Error("Firebase ID token has expired.");
  }

  if (payload.iat > nowInSeconds + 300) {
    // 5 min tolerance for clock drift
    throw new Error("Firebase ID token issued in the future.");
  }

  const expectedIssuer = `https://securetoken.google.com/${projectId}`;
  if (payload.iss !== expectedIssuer) {
    throw new Error(`Invalid token issuer: expected ${expectedIssuer}, got ${payload.iss}`);
  }

  if (payload.aud !== projectId) {
    throw new Error(`Invalid token audience: expected ${projectId}, got ${payload.aud}`);
  }

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Firebase ID token subject (sub) must be a non-empty string.");
  }

  return {
    ...payload,
    uid: payload.sub,
  };
}

/**
 * Extracts Bearer token from Request Authorization header.
 */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;

  const parts = authHeader.trim().split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1];
  }
  return null;
}

export class HttpError extends Error {
  status: number;
  code: string;
  details?: any;

  constructor(status: number, code: string, message: string, details?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Shared helper: Verifies caller's Firebase ID token.
 * Throws HttpError(401) on failure.
 */
export async function requireAuthenticatedUser(
  request: Request,
  env: Env
): Promise<AuthenticatedUser> {
  const token = extractBearerToken(request);
  if (!token) {
    throw new HttpError(
      401,
      "UNAUTHORIZED",
      "Missing or malformed Authorization header. Expected: Bearer <ID_TOKEN>"
    );
  }

  try {
    const decoded = await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID || "crackflow");
    return {
      uid: decoded.uid,
      email: decoded.email,
      decoded,
      rawToken: token,
    };
  } catch (err: any) {
    throw new HttpError(
      401,
      "INVALID_TOKEN",
      `Token verification failed: ${err.message || err}`
    );
  }
}

/**
 * Shared helper: Enforces active paid subscription/lifetime license.
 * Throws HttpError(403) on failure with UPGRADE_REQUIRED.
 */
export async function requireActiveEntitlement(
  user: AuthenticatedUser,
  env: Env,
  customMessage?: string
): Promise<EntitledUser> {
  let profile = null;
  try {
    profile = await fetchUserFromFirestore(user.uid, user.rawToken, env);
  } catch (err: any) {
    console.error(`[requireActiveEntitlement] Error reading profile for ${user.uid}:`, err);
  }

  const planTier = profile?.planTier || "none";
  const subscriptionStatus = profile?.subscriptionStatus || "none";
  const isLifetime = profile?.lifetime === true || planTier === "lifetime";
  const isActive = subscriptionStatus === "active" || isLifetime;
  const hasActiveAccess = isActive && ["starter", "pro", "lifetime"].includes(planTier);

  if (!hasActiveAccess) {
    throw new HttpError(
      403,
      "UPGRADE_REQUIRED",
      customMessage || "An active paid plan is required to start an interview.",
      {
        hasActiveAccess: false,
        planTier,
      }
    );
  }

  return {
    ...user,
    profile,
    hasActiveAccess: true,
    planTier,
  };
}
