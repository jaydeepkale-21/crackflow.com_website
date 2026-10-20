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

import {
  DEFAULT_MONTHLY_FAIR_USE_SECONDS,
  DEFAULT_YEARLY_FAIR_USE_SECONDS,
  DEFAULT_LIFETIME_FAIR_USE_SECONDS,
  DEFAULT_AUTH_CACHE_TTL_MS,
} from "../config/plans";

const entitlementCache = new Map<string, { profile: any; expiresAt: number }>();

/**
 * Event-driven cache invalidation: Clears isolate-local cached entitlement for a user.
 */
export function invalidateEntitlementCache(uid: string): void {
  entitlementCache.delete(uid);
}

/**
 * Event-driven cache update: Updates isolate-local cached entitlement with fresh authoritative state.
 */
export function updateCachedEntitlement(uid: string, profile: any): void {
  entitlementCache.set(uid, {
    profile,
    expiresAt: Date.now() + DEFAULT_AUTH_CACHE_TTL_MS,
  });
}

/**
 * Event-driven cache update: Updates cached screen solves balance safely.
 */
export function updateCachedEntitlementScreenSolves(uid: string, remainingSolves: number): void {
  const cached = entitlementCache.get(uid);
  if (cached && cached.profile) {
    cached.profile.screenSolvesRemaining = remainingSolves;
  }
}

/**
 * Retrieves valid cached profile if available and not expired.
 */
export function getCachedProfile(uid: string): any | null {
  const cached = entitlementCache.get(uid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.profile;
  }
  return null;
}

/**
 * Shared helper: Enforces active paid subscription/pack entitlement.
 * Authoritative time & fair-use balance calculation.
 * Throws HttpError(403) on failure with UPGRADE_REQUIRED or USAGE_EXHAUSTED.
 */
export async function requireActiveEntitlement(
  user: AuthenticatedUser,
  env: Env,
  customMessage?: string,
  forceFresh: boolean = false
): Promise<EntitledUser> {
  const now = Date.now();
  let profile = null;
  let cacheStatus = "MISS (Fetched from Firestore)";

  const cached = forceFresh ? null : entitlementCache.get(user.uid);
  if (cached && cached.expiresAt > now) {
    const remainingSec = Math.round((cached.expiresAt - now) / 1000);
    cacheStatus = `HIT (expires in ${remainingSec}s)`;
    profile = cached.profile;
  } else {
    try {
      profile = await fetchUserFromFirestore(user.uid, user.rawToken, env);
      if (profile) {
        // Safe 60s bounded fallback cache TTL across pack and subscription tiers
        const ttl = DEFAULT_AUTH_CACHE_TTL_MS;
        entitlementCache.set(user.uid, { profile, expiresAt: now + ttl });
        cacheStatus = `MISS (Cached for ${ttl / 1000}s)`;
      } else {
        entitlementCache.delete(user.uid);
      }
    } catch (err: any) {
      console.error(`[requireActiveEntitlement] Error reading profile for ${user.uid}:`, err);
    }
  }

  const planTier = profile?.planTier || "none";
  const subscriptionStatus = profile?.subscriptionStatus || "none";
  const isLifetime = profile?.lifetime === true || planTier === "lifetime";

  // Determine accessType
  const isPack =
    profile?.accessType === "pack" ||
    ["interview_1h", "interview_6h", "interview_24h"].includes(planTier);
  const isSub =
    profile?.accessType === "subscription" ||
    ["monthly", "yearly", "starter", "pro", "lifetime"].includes(planTier);

  const accessType: "pack" | "subscription" = isPack ? "pack" : "subscription";

  let remainingSeconds = 0;
  let hasActiveAccess = false;
  let errorCode = "UPGRADE_REQUIRED";
  let failureReason = "An active paid plan is required to start an interview.";

  if (isPack) {
    // Pack-based time access
    const totalSec =
      profile?.packTotalSeconds ||
      (planTier === "interview_1h"
        ? 3600
        : planTier === "interview_6h"
        ? 21600
        : planTier === "interview_24h"
        ? 86400
        : 0);
    const usedSec = profile?.packUsedSeconds || 0;
    remainingSeconds = Math.max(0, totalSec - usedSec);

    const isPackExpired = profile?.packExpiresAt
      ? new Date(profile.packExpiresAt).getTime() < now
      : false;

    if (isPackExpired) {
      errorCode = "EXPIRED";
      failureReason = "Your CrackFlow interview pack has reached its calendar expiration date.";
      hasActiveAccess = false;
    } else if (remainingSeconds <= 0) {
      errorCode = "USAGE_EXHAUSTED";
      failureReason = "Your interview time has been exhausted. Please purchase additional hours to continue.";
      hasActiveAccess = false;
    } else {
      hasActiveAccess = true;
    }
  } else if (isSub) {
    // Subscription-based access (with internal fair-use tracking)
    const isActive = subscriptionStatus === "active" || isLifetime;
    const isPeriodExpired =
      !isLifetime && profile?.currentPeriodEnd
        ? new Date(profile.currentPeriodEnd).getTime() < now
        : false;

    // Check if new billing cycle started -> reset fair-use if applicable
    let fairUseUsed = profile?.subscriptionUsedSeconds || 0;
    if (
      profile?.currentPeriodStart &&
      profile?.lastFairUseResetPeriod &&
      profile.lastFairUseResetPeriod !== profile.currentPeriodStart
    ) {
      // Billing cycle renewed: reset fair use used to 0
      fairUseUsed = 0;
    }

    const defaultFairUse = isLifetime
      ? DEFAULT_LIFETIME_FAIR_USE_SECONDS
      : planTier === "yearly"
      ? DEFAULT_YEARLY_FAIR_USE_SECONDS
      : DEFAULT_MONTHLY_FAIR_USE_SECONDS;

    const fairUseTotal = profile?.subscriptionFairUseSeconds || defaultFairUse;
    remainingSeconds = Math.max(0, fairUseTotal - fairUseUsed);

    if (!isActive) {
      errorCode = "UPGRADE_REQUIRED";
      failureReason = "An active subscription is required to access CrackFlow.";
      hasActiveAccess = false;
    } else if (isPeriodExpired) {
      errorCode = "EXPIRED";
      failureReason = "Your CrackFlow subscription billing period has expired. Please renew.";
      hasActiveAccess = false;
    } else if (remainingSeconds <= 0) {
      errorCode = "USAGE_EXHAUSTED";
      failureReason = "Fair-use interview limit reached for the current billing cycle. Please contact support.";
      hasActiveAccess = false;
    } else {
      hasActiveAccess = true;
    }
  }

  if (!hasActiveAccess) {
    entitlementCache.delete(user.uid);
    throw new HttpError(
      403,
      errorCode,
      customMessage || failureReason,
      {
        hasActiveAccess: false,
        planTier,
        accessType,
        remainingSeconds,
      }
    );
  }

  const isUnlimitedSolves = isSub;
  const screenSolvesRemaining = profile?.screenSolvesRemaining ?? (
    isPack
      ? (planTier === "interview_1h" ? 234 : planTier === "interview_6h" ? 587 : planTier === "interview_24h" ? 1175 : 0)
      : (planTier === "yearly" || isLifetime ? 5880 : 1175)
  );
  const screenshotAccessAllowed = hasActiveAccess && screenSolvesRemaining > 0;

  return {
    ...user,
    profile,
    hasActiveAccess: true,
    planTier,
    accessType,
    remainingSeconds,
    cacheStatus,
    screenSolvesRemaining,
    isUnlimitedSolves,
    screenshotAccessAllowed,
  };
}

