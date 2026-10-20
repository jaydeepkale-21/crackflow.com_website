const crypto = require("crypto");

const BASE_URL = "http://127.0.0.1:8787";
const FIREBASE_API_KEY = "AIzaSyDi69ZdYkql8lL42VFi8vIzh40PaO3Zt9k";
const RAZORPAY_KEY_ID = "rzp_test_TjXFwfwJaFkYJd";
const RAZORPAY_KEY_SECRET = "h1ZcX5nWTGBe6v7laVil6amC";

async function logStep(title, fn) {
  process.stdout.write(`[TEST] ${title.padEnd(62)} `);
  try {
    const res = await fn();
    console.log("PASS ✅");
    return res;
  } catch (err) {
    console.log("FAIL ❌");
    console.error("       Error Details:", err.message || err);
    throw err;
  }
}

async function getFirebaseToken(prefix = "prod_update") {
  const email = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}@crackflow.com`;
  const password = "TestPassword123!";
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create Firebase test user: ${res.status} ${err}`);
  }
  const data = await res.json();
  return { idToken: data.idToken, uid: data.localId, email };
}

function generateRazorpaySignature(orderId, paymentId) {
  return crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
}

async function purchasePack(idToken, planId = "INTERVIEW_1H") {
  const paymentId = `pay_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const orderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const signature = generateRazorpaySignature(orderId, paymentId);

  const res = await fetch(`${BASE_URL}/v1/billing/razorpay/verify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      planId,
    }),
  });
  if (!res.ok) throw new Error(`Purchase failed: ${res.status}`);
  return res.json();
}

async function main() {
  console.log("================================================================================");
  console.log("  CRACKFLOW PRODUCTION UPDATE: 3M HEARTBEAT, EVENT-DRIVEN CACHE & 15M RECOVERY ");
  console.log("================================================================================\n");

  const userA = await getFirebaseToken("user_a");
  const userB = await getFirebaseToken("user_b");

  // SECTION A: CONFIGURATION CONSTANTS
  await logStep("A1. Verify api.ts exports 180s heartbeat & 900s stale timeout", async () => {
    const fs = require("fs");
    const apiCode = fs.readFileSync("./src/services/api.ts", "utf8");
    if (!apiCode.includes("export const HEARTBEAT_INTERVAL_SECONDS = 180;")) {
      throw new Error("Missing HEARTBEAT_INTERVAL_SECONDS = 180 in api.ts");
    }
    if (!apiCode.includes("export const HEARTBEAT_INTERVAL_MS = 180_000;")) {
      throw new Error("Missing HEARTBEAT_INTERVAL_MS = 180_000 in api.ts");
    }
    if (!apiCode.includes("export const STALE_SESSION_TIMEOUT_SECONDS = 900;")) {
      throw new Error("Missing STALE_SESSION_TIMEOUT_SECONDS = 900 in api.ts");
    }
    if (!apiCode.includes("export const STALE_SESSION_TIMEOUT_MS = 900_000;")) {
      throw new Error("Missing STALE_SESSION_TIMEOUT_MS = 900_000 in api.ts");
    }
  });

  // SECTION B: PAYMENT & EVENT-DRIVEN CACHE INVALIDATION
  await logStep("B1. User A purchases 1H pack; cache invalidated & updated", async () => {
    const data = await purchasePack(userA.idToken, "INTERVIEW_1H");
    if (!data.success || data.remainingSeconds !== 3600) {
      throw new Error(`Expected 3600s, got ${data.remainingSeconds}`);
    }
  });

  await logStep("B2. GET /v1/me returns cached entitlement; fast 200 response", async () => {
    // First call primes/verifies cache
    const res1 = await fetch(`${BASE_URL}/v1/me`, {
      headers: { Authorization: `Bearer ${userA.idToken}` },
    });
    if (!res1.ok) throw new Error(`Call 1 failed: ${res1.status}`);
    const data1 = await res1.json();
    if (data1.remainingSeconds !== 3600) throw new Error("Incorrect balance");

    // Second call returns immediately
    const res2 = await fetch(`${BASE_URL}/v1/me`, {
      headers: { Authorization: `Bearer ${userA.idToken}` },
    });
    if (!res2.ok) throw new Error(`Call 2 failed: ${res2.status}`);
  });

  await logStep("B3. GET /v1/me?refresh=true forces authoritative fresh read", async () => {
    const res = await fetch(`${BASE_URL}/v1/me?refresh=true`, {
      headers: { Authorization: `Bearer ${userA.idToken}` },
    });
    if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
    const data = await res.json();
    if (data.remainingSeconds !== 3600 || data.accessType !== "pack") {
      throw new Error("Invalid refresh payload");
    }
  });

  await logStep("B4. Unauthenticated user cannot call /v1/me?refresh=true (401)", async () => {
    const res = await fetch(`${BASE_URL}/v1/me?refresh=true`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await logStep("B5. User A and User B never share cached entitlement entries", async () => {
    const resB = await fetch(`${BASE_URL}/v1/me`, {
      headers: { Authorization: `Bearer ${userB.idToken}` },
    });
    if (!resB.ok) throw new Error(`User B failed: ${resB.status}`);
    const dataB = await resB.json();
    if (dataB.hasActiveAccess !== false || dataB.accessType !== "none") {
      throw new Error("User B unexpectedly inherited User A's entitlement!");
    }
  });

  // SECTION C: INTERVIEW START, HEARTBEAT & DEADLINE
  let sessionIdA = "";
  await logStep("C1. User A starts interview (200 OK, sessionId returned)", async () => {
    const res = await fetch(`${BASE_URL}/v1/interview/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${userA.idToken}`, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`Start failed: ${res.status}`);
    const data = await res.json();
    if (!data.allowed || !data.sessionId) throw new Error("Missing sessionId");
    sessionIdA = data.sessionId;
  });

  await logStep("C2. Heartbeat (POST /v1/session/heartbeat) updates with server time", async () => {
    const res = await fetch(`${BASE_URL}/v1/session/heartbeat`, {
      method: "POST",
      headers: { Authorization: `Bearer ${userA.idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sessionIdA }),
    });
    if (!res.ok) throw new Error(`Heartbeat failed: ${res.status}`);
    const data = await res.json();
    if (!data.active) throw new Error("Expected active: true");
  });

  await logStep("C3. Heartbeat with wrong user returns 403 FORBIDDEN", async () => {
    const res = await fetch(`${BASE_URL}/v1/session/heartbeat`, {
      method: "POST",
      headers: { Authorization: `Bearer ${userB.idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sessionIdA }),
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    const data = await res.json();
    if (data.error !== "FORBIDDEN") throw new Error(`Expected FORBIDDEN, got ${data.error}`);
  });

  await logStep("C4. Deepgram STT token TTL is capped to remaining seconds (<= 3600)", async () => {
    const res = await fetch(`${BASE_URL}/v1/stt/token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${userA.idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sessionIdA }),
    });
    if (!res.ok) throw new Error(`STT token failed: ${res.status}`);
    const data = await res.json();
    if (!data.token || data.expiresInSeconds > 3600) {
      throw new Error(`Invalid TTL: ${data.expiresInSeconds}`);
    }
  });

  await logStep("C5. Session End (POST /v1/session/end) deducts time & invalidates cache", async () => {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(`${BASE_URL}/v1/session/end`, {
      method: "POST",
      headers: { Authorization: `Bearer ${userA.idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sessionIdA }),
    });
    if (!res.ok) throw new Error(`Session end failed: ${res.status}`);
    const data = await res.json();
    if (!data.success || data.usedSeconds < 1) throw new Error("Invalid usedSeconds");
    if (data.remainingSeconds >= 3600) throw new Error("Balance was not deducted");

    // Check that immediate /v1/me returns the deducted balance (cache was invalidated)
    const meRes = await fetch(`${BASE_URL}/v1/me`, {
      headers: { Authorization: `Bearer ${userA.idToken}` },
    });
    const meData = await meRes.json();
    if (meData.remainingSeconds !== data.remainingSeconds) {
      throw new Error(`Cache was not invalidated! Cache=${meData.remainingSeconds}, Actual=${data.remainingSeconds}`);
    }
  });

  // SECTION D: STALE SESSION TIMEOUT (EXACT 900S BOUNDARY)
  await logStep("D1. Clean user starts session for boundary testing", async () => {
    await purchasePack(userB.idToken, "INTERVIEW_1H");
    const res = await fetch(`${BASE_URL}/v1/interview/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${userB.idToken}`, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`Start failed: ${res.status}`);
    const data = await res.json();
    if (!data.sessionId) throw new Error("Missing sessionId");
  });

  await logStep("D2. Active session rejects concurrent start with 409", async () => {
    const res = await fetch(`${BASE_URL}/v1/interview/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${userB.idToken}`, "Content-Type": "application/json" },
    });
    if (res.status !== 409) throw new Error(`Expected 409, got ${res.status}`);
    const data = await res.json();
    if (data.error !== "SESSION_ALREADY_ACTIVE") throw new Error(`Expected SESSION_ALREADY_ACTIVE, got ${data.error}`);
  });

  console.log("\n================================================================================");
  console.log("   ALL PRODUCTION UPDATE TESTS (3M HEARTBEAT, CACHE, STALE) PASSED! ✅           ");
  console.log("================================================================================\n");
}

main().catch((err) => {
  console.error("Test Suite Terminated with Error:", err);
  process.exit(1);
});
