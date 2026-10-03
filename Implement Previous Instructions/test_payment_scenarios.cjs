// Test Suite: Valid Payments, Failure Modes & Multi-Plan Storage Verification
// Tests:
// Section 1: Valid Payment Flows
// Section 2: Failure & Tamper Scenarios (Signature forgery, missing fields, unauthenticated, payment.failed webhook)
// Section 3: Plan Verification: Starter vs Pro vs Lifetime (Exact Paise, Currency, Storage, Expiry rules)

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

async function createTestUser(prefix = "user") {
  const email = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}@crackflow.com`;
  const password = "TestPassword123!";
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create test user: ${res.status} ${err}`);
  }
  const data = await res.json();
  return { idToken: data.idToken, uid: data.localId, email };
}

function generateSignature(orderId, paymentId, secret = RAZORPAY_KEY_SECRET) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

async function main() {
  console.log("================================================================================");
  console.log("   CRACKFLOW TEST: VALID PAYMENTS, FAILURE MODES & MULTI-PLAN STORAGE          ");
  console.log("================================================================================\n");

  // ============================================================================
  // SECTION 1: FAILURE & REJECTION SCENARIOS
  // ============================================================================
  console.log("--- SECTION 1: FAILURE & REJECTION SCENARIOS ---");

  const failUser = await createTestUser("fail_test");

  // Failure 1: Unauthenticated request to verify
  await logStep("F1: Unauthenticated verify request returns HTTP 401", async () => {
    const res = await fetch(`${BASE_URL}/v1/billing/razorpay/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpay_order_id: "order_fake123",
        razorpay_payment_id: "pay_fake123",
        razorpay_signature: "fake_sig",
      }),
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    const data = await res.json();
    if (data.error !== "UNAUTHORIZED") throw new Error(`Expected UNAUTHORIZED, got ${data.error}`);
  });

  // Create real order for subsequent failure tests
  const orderRes = await fetch(`${BASE_URL}/v1/billing/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${failUser.idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ planId: "pro" }),
  });
  const failOrder = await orderRes.json();
  const testPaymentId = `pay_fail_test_${Date.now()}`;

  // Failure 2: Missing required fields (missing signature)
  await logStep("F2: Missing signature field returns HTTP 400", async () => {
    const res = await fetch(`${BASE_URL}/v1/billing/razorpay/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${failUser.idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpay_order_id: failOrder.orderId,
        razorpay_payment_id: testPaymentId,
        // razorpay_signature omitted!
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    const data = await res.json();
    if (data.error !== "MISSING_PAYMENT_FIELDS") throw new Error(`Expected MISSING_PAYMENT_FIELDS, got ${data.error}`);
  });

  // Failure 3: Missing required fields (missing payment ID)
  await logStep("F3: Missing payment ID field returns HTTP 400", async () => {
    const res = await fetch(`${BASE_URL}/v1/billing/razorpay/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${failUser.idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpay_order_id: failOrder.orderId,
        razorpay_signature: "some_sig",
        // razorpay_payment_id omitted!
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    const data = await res.json();
    if (data.error !== "MISSING_PAYMENT_FIELDS") throw new Error(`Expected MISSING_PAYMENT_FIELDS, got ${data.error}`);
  });

  // Failure 4: Signature forgery (wrong secret or altered payload)
  await logStep("F4: Tampered signature rejection (HTTP 400 INVALID_SIGNATURE)", async () => {
    const forgedSignature = generateSignature(failOrder.orderId, testPaymentId, "wrong_secret_attacker");
    const res = await fetch(`${BASE_URL}/v1/billing/razorpay/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${failUser.idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpay_order_id: failOrder.orderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: forgedSignature,
        planId: "pro",
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    const data = await res.json();
    if (data.error !== "INVALID_SIGNATURE") throw new Error(`Expected INVALID_SIGNATURE, got ${data.error}`);
  });

  // Failure 5: Verify that user remains unentitled after failed verification
  await logStep("F5: Verify user has NO access after failed attempts", async () => {
    const meRes = await fetch(`${BASE_URL}/v1/me`, {
      headers: { Authorization: `Bearer ${failUser.idToken}` },
    });
    const meData = await meRes.json();
    if (meData.hasActiveAccess === true) throw new Error("User was wrongly granted active access!");

    const interviewRes = await fetch(`${BASE_URL}/v1/interview/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${failUser.idToken}` },
    });
    if (interviewRes.status !== 403) throw new Error(`Expected 403 on interview start, got ${interviewRes.status}`);
  });

  // Failure 6: Razorpay Webhook Payment Failed event marks account past_due
  await logStep("F6: Webhook payment.failed event marks account past_due", async () => {
    const webhookPayload = JSON.stringify({
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: `pay_failed_${Date.now()}`,
            notes: { uid: failUser.uid, planId: "pro" },
          },
        },
      },
    });
    const webhookSig = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(webhookPayload)
      .digest("hex");

    const res = await fetch(`${BASE_URL}/v1/billing/razorpay/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Razorpay-Signature": webhookSig,
      },
      body: webhookPayload,
    });
    if (!res.ok) throw new Error(`Webhook failed: ${res.status} ${await res.text()}`);

    // Check that user status is past_due and interview is still blocked
    const meRes = await fetch(`${BASE_URL}/v1/me`, {
      headers: { Authorization: `Bearer ${failUser.idToken}` },
    });
    const meData = await meRes.json();
    if (meData.subscriptionStatus !== "past_due") {
      throw new Error(`Expected subscriptionStatus: past_due, got ${meData.subscriptionStatus}`);
    }
    if (meData.hasActiveAccess === true) throw new Error("User with past_due status must not have access!");
  });

  console.log("\n--- SECTION 2: MULTI-PLAN STORAGE & VALIDATION (STARTER, PRO, LIFETIME) ---");

  // Plan Configurations to Test
  const planConfigs = [
    {
      planId: "starter",
      displayName: "Starter Plan",
      expectedPaise: 49900, // ₹499
      expectedCurrency: "INR",
      isLifetime: false,
    },
    {
      planId: "pro",
      displayName: "Pro Plan",
      expectedPaise: 99900, // ₹999
      expectedCurrency: "INR",
      isLifetime: false,
    },
    {
      planId: "lifetime",
      displayName: "Lifetime Access Plan",
      expectedPaise: 499900, // ₹4,999
      expectedCurrency: "INR",
      isLifetime: true,
    },
  ];

  for (const cfg of planConfigs) {
    console.log(`\n>> Testing Plan Tier: [${cfg.planId.toUpperCase()}] (${cfg.displayName})`);

    const user = await createTestUser(`user_${cfg.planId}`);

    // Step A: Create Order
    let order = null;
    await logStep(`P-${cfg.planId}-1: Create Razorpay Order (${cfg.expectedPaise} paise)`, async () => {
      const res = await fetch(`${BASE_URL}/v1/billing/checkout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId: cfg.planId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      order = await res.json();

      if (order.provider !== "razorpay") throw new Error(`Expected provider razorpay, got ${order.provider}`);
      if (order.amount !== cfg.expectedPaise) {
        throw new Error(`Amount mismatch: expected ${cfg.expectedPaise}, got ${order.amount}`);
      }
      if (order.currency !== cfg.expectedCurrency) {
        throw new Error(`Currency mismatch: expected ${cfg.expectedCurrency}, got ${order.currency}`);
      }
      if (order.planId !== cfg.planId) {
        throw new Error(`planId mismatch: expected ${cfg.planId}, got ${order.planId}`);
      }
    });

    // Step B: Verify Valid Payment Signature & Activate
    const paymentId = `pay_${cfg.planId}_${Date.now()}`;
    await logStep(`P-${cfg.planId}-2: Verify Payment & Grant Entitlement in Firestore`, async () => {
      const validSig = generateSignature(order.orderId, paymentId);
      const res = await fetch(`${BASE_URL}/v1/billing/razorpay/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          razorpay_order_id: order.orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSig,
          planId: cfg.planId,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();

      if (data.success !== true) throw new Error("Response success is not true");
      if (data.planTier !== cfg.planId) throw new Error(`Expected planTier ${cfg.planId}, got ${data.planTier}`);
      if (data.subscriptionStatus !== "active") throw new Error(`Expected active, got ${data.subscriptionStatus}`);
      if (data.hasActiveAccess !== true) throw new Error("Expected hasActiveAccess: true");

      if (cfg.isLifetime) {
        if (data.expiresAt !== null) {
          throw new Error(`Lifetime plan must have null expiresAt (perpetual), got ${data.expiresAt}`);
        }
      } else {
        if (!data.expiresAt) {
          throw new Error(`Recurring plan must have a valid expiresAt timestamp, got ${data.expiresAt}`);
        }
        const expiryDate = new Date(data.expiresAt);
        const diffDays = Math.round((expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
        if (diffDays < 28 || diffDays > 32) {
          throw new Error(`Expected ~30 day period end, got diffDays: ${diffDays}`);
        }
      }
    });

    // Step C: Verify Cloudflare <-> Firestore Live Entitlement State
    await logStep(`P-${cfg.planId}-3: Live Firestore Retrieval (/v1/me confirms ${cfg.planId})`, async () => {
      const res = await fetch(`${BASE_URL}/v1/me`, {
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();

      if (data.planTier !== cfg.planId) throw new Error(`Firestore stored wrong plan: ${data.planTier}`);
      if (data.subscriptionStatus !== "active") throw new Error(`Status not active: ${data.subscriptionStatus}`);
      if (data.hasActiveAccess !== true) throw new Error("hasActiveAccess is false in /v1/me");
      if (cfg.isLifetime && data.expiresAt !== null && data.expiresAt !== undefined) {
        throw new Error(`Lifetime plan should not have expiration in /v1/me: ${data.expiresAt}`);
      }
    });

    // Step D: Verify Desktop App Interview Unlock
    await logStep(`P-${cfg.planId}-4: Desktop App Interview Authorization (/v1/interview/start)`, async () => {
      const res = await fetch(`${BASE_URL}/v1/interview/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();

      if (data.allowed !== true) throw new Error("Desktop interview start not allowed");
      if (data.hasActiveAccess !== true) throw new Error("Desktop interview start hasActiveAccess is false");
      if (data.planTier !== cfg.planId) throw new Error(`Desktop received wrong planTier: ${data.planTier}`);
    });
  }

  console.log("\n================================================================================");
  console.log("   ALL VALID PAYMENTS, FAILURE MODES & MULTI-PLAN TESTS PASSED 100%!           ");
  console.log("================================================================================\n");
}

main().catch((err) => {
  console.error("\nFATAL TEST FAILURE:", err);
  process.exit(1);
});
