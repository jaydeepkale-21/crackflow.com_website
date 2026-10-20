const crypto = require("crypto");

const BASE_URL = "http://127.0.0.1:8787";
const FIREBASE_API_KEY = "AIzaSyDi69ZdYkql8lL42VFi8vIzh40PaO3Zt9k";
const RAZORPAY_KEY_ID = "rzp_test_TjXFwfwJaFkYJd";
const RAZORPAY_KEY_SECRET = "h1ZcX5nWTGBe6v7laVil6amC";

async function logStep(title, fn) {
  process.stdout.write(`[TEST] ${title.padEnd(58)} `);
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

async function getFirebaseToken() {
  const email = `test_time_${Date.now()}@crackflow.com`;
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

async function main() {
  console.log("================================================================================");
  console.log("         CRACKFLOW TIME/CREDIT SYSTEM & RATE LIMIT TEST SUITE                   ");
  console.log("================================================================================\n");

  let idToken = "";
  let uid = "";
  let sessionId = "";

  // STEP 1: Provision test user
  await logStep("1. Provision Firebase test user", async () => {
    const auth = await getFirebaseToken();
    idToken = auth.idToken;
    uid = auth.uid;
    if (!idToken || !uid) throw new Error("Missing auth details");
  });

  // STEP 2: Free user blocked from starting interview
  await logStep("2. Free user blocked from /v1/interview/start (403)", async () => {
    const res = await fetch(`${BASE_URL}/v1/interview/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    const data = await res.json();
    if (data.error !== "UPGRADE_REQUIRED") throw new Error(`Expected UPGRADE_REQUIRED, got ${data.error}`);
  });

  // STEP 3: Purchase 1 Hour pack (INTERVIEW_1H)
  await logStep("3. Purchase 1 Hour Pack (INTERVIEW_1H) via verify", async () => {
    const paymentId = `pay_test_${Date.now()}`;
    const orderId = `order_test_${Date.now()}`;
    const payloadToSign = `${orderId}|${paymentId}`;
    const signature = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(payloadToSign).digest("hex");

    const res = await fetch(`${BASE_URL}/v1/billing/razorpay/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        planId: "INTERVIEW_1H",
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Verification failed: ${res.status} ${err}`);
    }
    const data = await res.json();
    if (!data.success || data.remainingSeconds !== 3600) {
      throw new Error(`Expected remainingSeconds=3600, got ${data.remainingSeconds}`);
    }
  });

  // STEP 4: /v1/me returns pack details
  await logStep("4. /v1/me returns accessType=pack and remaining=3600s", async () => {
    const res = await fetch(`${BASE_URL}/v1/me`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) throw new Error(`Failed /v1/me: ${res.status}`);
    const data = await res.json();
    if (data.accessType !== "pack") throw new Error(`Expected pack, got ${data.accessType}`);
    if (data.remainingSeconds !== 3600) throw new Error(`Expected 3600s, got ${data.remainingSeconds}`);
    if (data.displayPlan !== "1 Hour") throw new Error(`Expected '1 Hour', got ${data.displayPlan}`);
  });

  // STEP 5: Start interview session
  await logStep("5. /v1/interview/start creates session and returns ID", async () => {
    const res = await fetch(`${BASE_URL}/v1/interview/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`Failed to start: ${res.status}`);
    const data = await res.json();
    if (!data.allowed || !data.sessionId) throw new Error("Missing session ID");
    if (data.remainingSeconds !== 3600) throw new Error(`Expected 3600s, got ${data.remainingSeconds}`);
    sessionId = data.sessionId;
  });

  // STEP 6: Concurrent session guard
  await logStep("6. Concurrent session blocked (409 SESSION_ALREADY_ACTIVE)", async () => {
    const res = await fetch(`${BASE_URL}/v1/interview/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    });
    if (res.status !== 409) throw new Error(`Expected 409, got ${res.status}`);
    const data = await res.json();
    if (data.error !== "SESSION_ALREADY_ACTIVE") throw new Error(`Expected SESSION_ALREADY_ACTIVE, got ${data.error}`);
  });

  // STEP 7: Request Deepgram token (capped to remainingSeconds)
  await logStep("7. /v1/stt/token issues Deepgram token capped to TTL", async () => {
    const res = await fetch(`${BASE_URL}/v1/stt/token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`Failed to get STT token: ${res.status}`);
    const data = await res.json();
    if (!data.token) throw new Error("No token returned");
    if (data.expiresInSeconds > 3600) throw new Error(`TTL ${data.expiresInSeconds} exceeded max 3600`);
  });

  // STEP 8: End interview session & atomic deduction
  await logStep("8. /v1/session/end deducts time and marks completed", async () => {
    // Wait 2 seconds so measurable duration exists
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(`${BASE_URL}/v1/session/end`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) throw new Error(`Failed to end session: ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error("End session failed");
    if (data.usedSeconds < 1) throw new Error(`Expected usedSeconds >= 1, got ${data.usedSeconds}`);
    if (data.remainingSeconds >= 3600) throw new Error(`Expected remaining < 3600, got ${data.remainingSeconds}`);
  });

  // STEP 9: Multiple pack accumulation
  await logStep("9. Purchase 6 Hour Pack (INTERVIEW_6H) accumulates balance", async () => {
    const paymentId = `pay_test_${Date.now()}`;
    const orderId = `order_test_${Date.now()}`;
    const payloadToSign = `${orderId}|${paymentId}`;
    const signature = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(payloadToSign).digest("hex");

    const res = await fetch(`${BASE_URL}/v1/billing/razorpay/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        planId: "INTERVIEW_6H",
      }),
    });
    if (!res.ok) throw new Error(`Verification failed: ${res.status}`);
    const data = await res.json();
    // 21600 (6h) + previous remaining (~3597s) should be ~25197s
    if (data.remainingSeconds < 25000) {
      throw new Error(`Expected remaining >= 25000, got ${data.remainingSeconds}`);
    }
  });

  // STEP 10: Rate limiting (15 requests/min per account)
  await logStep("10. Rate limiting enforces 15 RPM with 429 & Retry-After", async () => {
    let got429 = false;
    for (let i = 0; i < 20; i++) {
      const res = await fetch(`${BASE_URL}/v1/me`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.status === 429) {
        got429 = true;
        const retryAfter = res.headers.get("Retry-After");
        const body = await res.json();
        if (body.error !== "RATE_LIMITED") throw new Error(`Expected RATE_LIMITED, got ${body.error}`);
        if (!retryAfter) throw new Error("Missing Retry-After header");
        break;
      }
    }
    if (!got429) throw new Error("Rate limit was not triggered after 20 requests");
  });

  console.log("\n================================================================================");
  console.log("             ALL 10 TIME/CREDIT SYSTEM TESTS PASSED SUCCESSFULLY! ✅             ");
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("Test Suite Terminated with Error:", err);
  process.exit(1);
});
