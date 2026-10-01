import { Env, AuthenticatedUser } from "../types";
import { HttpError } from "../middleware/auth";

interface CodeEntry {
  uid: string;
  email?: string;
  expiresAt: number;
  claimed: boolean;
}

interface SessionEntry {
  uid?: string;
  email?: string;
  code?: string;
  expiresAt: number;
  claimed: boolean;
}

// In-memory single-use exchange stores (60s validity)
const exchangeCodes = new Map<string, CodeEntry>();
const exchangeSessions = new Map<string, SessionEntry>();

function cleanExpired(): void {
  const now = Date.now();
  for (const [code, entry] of exchangeCodes.entries()) {
    if (entry.expiresAt < now) {
      exchangeCodes.delete(code);
    }
  }
  for (const [session, entry] of exchangeSessions.entries()) {
    if (entry.expiresAt < now) {
      exchangeSessions.delete(session);
    }
  }
}

function base64UrlEncode(data: Uint8Array | string): string {
  const str = typeof data === "string" ? data : String.fromCharCode(...data);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

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

/**
 * Signs a standard Firebase Custom Auth Token (JWT) with RS256
 * using the Google Service Account private key.
 */
export async function createCustomToken(
  serviceAccountJson: string,
  uid: string,
  claims?: Record<string, any>
): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const nowInSec = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    iat: nowInSec,
    exp: nowInSec + 3600, // 1 hour validity
    uid: uid,
    claims: claims || {},
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

  return `${stringToSign}.${base64UrlEncode(new Uint8Array(signatureBuffer))}`;
}

/**
 * POST /v1/auth/exchange/create
 * Authenticated website calls this with user's Firebase token to issue a 60s exchange code.
 */
export async function handleCreateExchangeCode(
  request: Request,
  user: AuthenticatedUser,
  _env: Env
): Promise<Response> {
  cleanExpired();

  let session: string | undefined;
  try {
    const body = (await request.json().catch(() => ({}))) as { session?: string };
    session = body.session;
  } catch {
    // Body optional
  }

  // Generate random 16-character alphanumeric code
  const randomBytes = new Uint8Array(12);
  crypto.getRandomValues(randomBytes);
  const code = "cf_" + Array.from(randomBytes, (b) => b.toString(36).padStart(2, "0")).join("").substring(0, 16);

  const expiresAt = Date.now() + 60 * 1000; // 60 seconds

  exchangeCodes.set(code, {
    uid: user.decoded.uid,
    email: user.decoded.email,
    expiresAt,
    claimed: false,
  });

  if (session && typeof session === "string" && session.trim().length > 0) {
    exchangeSessions.set(session.trim(), {
      uid: user.decoded.uid,
      email: user.decoded.email,
      code,
      expiresAt,
      claimed: false,
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      code,
      expiresIn: 60,
      uid: user.decoded.uid,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * POST /v1/auth/exchange/claim
 * Desktop claims the 60s single-use exchange code to obtain a Firebase Custom Token for the SAME UID.
 */
export async function handleClaimExchangeCode(
  request: Request,
  env: Env
): Promise<Response> {
  cleanExpired();

  let body: any;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "INVALID_BODY", "Request body must be valid JSON");
  }

  const { code } = body || {};
  if (!code || typeof code !== "string") {
    throw new HttpError(400, "INVALID_CODE", "An authorization code must be provided");
  }

  const entry = exchangeCodes.get(code.trim());
  if (!entry || entry.expiresAt < Date.now()) {
    if (entry) exchangeCodes.delete(code.trim());
    throw new HttpError(400, "EXPIRED_CODE", "The authorization code is invalid or has expired.");
  }

  if (entry.claimed) {
    throw new HttpError(400, "CODE_ALREADY_USED", "This authorization code has already been claimed.");
  }

  entry.claimed = true;
  exchangeCodes.delete(code.trim());

  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new HttpError(500, "CONFIG_ERROR", "Firebase Service Account is not configured in Worker");
  }

  const customToken = await createCustomToken(
    env.FIREBASE_SERVICE_ACCOUNT_JSON,
    entry.uid,
    entry.email ? { email: entry.email } : undefined
  );

  return new Response(
    JSON.stringify({
      success: true,
      customToken,
      uid: entry.uid,
      email: entry.email || null,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * GET /v1/auth/exchange/poll?session=...
 * Desktop can poll this while waiting for browser login.
 */
export async function handlePollExchangeSession(
  request: Request,
  env: Env
): Promise<Response> {
  cleanExpired();

  const url = new URL(request.url);
  const session = url.searchParams.get("session");

  if (!session) {
    throw new HttpError(400, "INVALID_SESSION", "Session parameter is required");
  }

  const entry = exchangeSessions.get(session.trim());
  if (!entry || entry.expiresAt < Date.now()) {
    if (entry) exchangeSessions.delete(session.trim());
    return new Response(
      JSON.stringify({ success: false, pending: true, expired: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  if (entry.claimed) {
    return new Response(
      JSON.stringify({ success: false, claimed: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!entry.uid) {
    return new Response(
      JSON.stringify({ success: false, pending: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  entry.claimed = true;
  exchangeSessions.delete(session.trim());

  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new HttpError(500, "CONFIG_ERROR", "Firebase Service Account is not configured in Worker");
  }

  const customToken = await createCustomToken(
    env.FIREBASE_SERVICE_ACCOUNT_JSON,
    entry.uid,
    entry.email ? { email: entry.email } : undefined
  );

  return new Response(
    JSON.stringify({
      success: true,
      customToken,
      uid: entry.uid,
      email: entry.email || null,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
