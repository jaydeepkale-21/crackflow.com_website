// Comprehensive End-to-End Test for Razorpay Payment Cycle
// Connections verified:
// 1. Firebase Auth <-> Cloudflare Worker (JWKS Cryptographic Verification)
// 2. Cloudflare Worker <-> Razorpay Orders API (INR Order Creation)
// 3. Razorpay Payment Verification & HMAC-SHA256 Security
// 4. Cloudflare Worker <-> Firebase Firestore (Entitlement Write via Service Account)
// 5. Cloudflare Worker <-> Firebase Firestore (Entitlement Live Read)
// 6. Desktop App <-> Cloudflare Worker (/v1/me & /v1/interview/start entitlement unlock)
// 7. Desktop App Speech-to-Text (/v1/stt/token access)
// 8. Security Tamper Check (Forged Signature Rejection)

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
  const email = `test_payment_${Date.now()}@crackflow.com`;
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
  return { idToken: data.idToken, localId: data.localId, email };
}

async function main() {
  console.log("================================================================================");
  console.log("         CRACKFLOW RAZORPAY PAYMENT CYCLE & CONNECTION TEST SUITE               ");
  console.log("================================================================================\n");

  let idToken = "";
  let uid = "";
  let orderData = null;
  const paymentId = `pay_test_${Date.now()}`;

  // STEP 1: Firebase Authentication
  await logStep("1. Firebase Auth: Provision Test User & Token", async () => {
    const authData = await getFirebaseToken();
    idToken = authData.idToken;
    uid = authData.localId;
    if (!idToken || !uid) throw new Error("Missing idToken or localId");
  });

  // STEP 2: Worker Verification of Token & Initial Entitlement
  await logStep("2. Cloudflare <-> Firebase: Initial /v1/me (Free/None)", async () => {
    const res = await fetch(`${BASE_URL}/v1/me`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (data.hasActiveAccess === true) throw new Error("New user should NOT have active access yet");
    if (data.uid !== uid) throw new Error(`UID mismatch: expected ${uid}, got ${data.uid}`);
  });

  // STEP 3: Desktop App Access Blocked Before Payment
  await logStep("3. Desktop App <-> Cloudflare: Interview Blocked (Unpaid)", async () => {
    const res = await fetch(`${BASE_URL}/v1/interview/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (res.status !== 403) throw new Error(`Expected HTTP 403 UPGRADE_REQUIRED, got ${res.status}`);
    const data = await res.json();
    if (data.error !== "UPGRADE_REQUIRED") throw new Error(`Expected UPGRADE_REQUIRED, got ${data.error}`);
  });

  // STEP 4: Cloudflare Worker <-> Razorpay Orders API
  await logStep("4. Cloudflare <-> Razorpay: Create Order (/v1/billing/checkout)", async () => {
    const res = await fetch(`${BASE_URL}/v1/billing/checkout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ planId: "pro" }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    orderData = await res.json();

    if (orderData.provider !== "razorpay") throw new Error(`Expected provider razorpay, got ${orderData.provider}`);
    if (!orderData.orderId || !orderData.orderId.startsWith("order_")) throw new Error(`Invalid orderId: ${orderData.orderId}`);
    if (orderData.amount !== 99900) throw new Error(`Expected amount 99900 paise (₹999), got ${orderData.amount}`);
    if (orderData.currency !== "INR") throw new Error(`Expected currency INR, got ${orderData.currency}`);
    if (orderData.keyId !== RAZORPAY_KEY_ID) throw new Error(`Expected keyId ${RAZORPAY_KEY_ID}, got ${orderData.keyId}`);
  });

  // STEP 5: Security Tamper Test — Invalid Razorpay Signature Rejection
  await logStep("5. Security Check: Reject Forged Razorpay Signature", async () => {
    const res = await fetch(`${BASE_URL}/v1/billing/razorpay/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpay_order_id: orderData.orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: "forged_invalid_signature_hex_1234567890abcdef",
        planId: "pro",
      }),
    });
    if (res.status !== 400) throw new Error(`Expected HTTP 400 for forged signature, got ${res.status}`);
    const data = await res.json();
    if (data.error !== "INVALID_SIGNATURE") throw new Error(`Expected INVALID_SIGNATURE, got ${data.error}`);
  });

  // STEP 6: Cryptographic Signature Generation & Payment Verification
  await logStep("6. Razorpay Verification: HMAC-SHA256 & Firestore Activation", async () => {
    const payload = `${orderData.orderId}|${paymentId}`;
    const validSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest("hex");

    const res = await fetch(`${BASE_URL}/v1/billing/razorpay/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpay_order_id: orderData.orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature,
        planId: "pro",
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (!data.success) throw new Error(`Verification response failed: ${JSON.stringify(data)}`);
    if (data.planTier !== "pro") throw new Error(`Expected planTier pro, got ${data.planTier}`);
    if (data.subscriptionStatus !== "active") throw new Error(`Expected subscriptionStatus active, got ${data.subscriptionStatus}`);
  });

  // STEP 7: Cloudflare <-> Firestore Live Entitlement Check via /v1/me
  await logStep("7. Cloudflare <-> Firestore: Live Entitlement Read (/v1/me)", async () => {
    const res = await fetch(`${BASE_URL}/v1/me`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (data.hasActiveAccess !== true) throw new Error(`Expected hasActiveAccess: true, got ${data.hasActiveAccess}`);
    if (data.planTier !== "pro") throw new Error(`Expected planTier: pro, got ${data.planTier}`);
    if (data.subscriptionStatus !== "active") throw new Error(`Expected subscriptionStatus: active, got ${data.subscriptionStatus}`);
  });

  // STEP 8: Desktop App Authorization Unlock (/v1/interview/start)
  await logStep("8. Desktop App <-> Cloudflare: Unlock Live Interview (/v1/interview/start)", async () => {
    const res = await fetch(`${BASE_URL}/v1/interview/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (data.allowed !== true) throw new Error(`Expected allowed: true, got ${data.allowed}`);
    if (data.hasActiveAccess !== true) throw new Error(`Expected hasActiveAccess: true, got ${data.hasActiveAccess}`);
    if (data.planTier !== "pro") throw new Error(`Expected planTier: pro, got ${data.planTier}`);
  });

  // STEP 9: Desktop App Speech-to-Text Token Grant (/v1/stt/token)
  await logStep("9. Desktop App <-> Cloudflare: Speech-to-Text Token (/v1/stt/token)", async () => {
    const res = await fetch(`${BASE_URL}/v1/stt/token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (!data.token) throw new Error("Missing Deepgram STT token");
  });

  // STEP 10: Desktop App Auth Exchange Code Generation (/v1/auth/exchange/create)
  await logStep("10. Desktop App <-> Cloudflare: Auth Exchange Code (/v1/auth/exchange/create)", async () => {
    const res = await fetch(`${BASE_URL}/v1/auth/exchange/create`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (!data.code || !data.code.startsWith("cf_")) throw new Error(`Invalid exchange code: ${data.code}`);
  });

  console.log("\n================================================================================");
  console.log("  ALL 10 PAYMENT CYCLE & CROSS-PLATFORM CONNECTION TESTS PASSED 100% SUCCESS! ");
  console.log("================================================================================\n");
}

main().catch((err) => {
  console.error("\nFATAL TEST FAILURE:", err);
  process.exit(1);
});
