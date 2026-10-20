const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://127.0.0.1:8787";
const FIREBASE_API_KEY = "AIzaSyDi69ZdYkql8lL42VFi8vIzh40PaO3Zt9k";
const RAZORPAY_KEY_ID = "rzp_test_TjXFwfwJaFkYJd";
const RAZORPAY_KEY_SECRET = "h1ZcX5nWTGBe6v7laVil6amC";

let totalPassed = 0;
let totalFailed = 0;

async function runTest(name, fn) {
  process.stdout.write(`[TEST] ${name.padEnd(65)} `);
  try {
    const res = await fn();
    console.log("PASS ✅");
    totalPassed++;
    return res;
  } catch (err) {
    console.log("FAIL ❌");
    console.error("       Error:", err.message || err);
    totalFailed++;
    throw err;
  }
}

async function createTestUser(prefix = "quota_user") {
  const email = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@crackflow.com`;
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

async function purchasePlan(idToken, planId) {
  const paymentId = `pay_test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const orderId = `order_test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const payloadToSign = `${orderId}|${paymentId}`;
  const signature = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(payloadToSign).digest("hex");

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

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to verify payment: ${res.status} ${err}`);
  }
  return { data: await res.json(), paymentId, orderId, signature };
}

// Load secrets from .dev.vars
const devVars = fs.readFileSync(path.join(__dirname, "crackflow-worker", ".dev.vars"), "utf8");
const saMatch = devVars.match(/FIREBASE_SERVICE_ACCOUNT_JSON='({.+?})'/s);
const SA_JSON = saMatch ? JSON.parse(saMatch[1]) : null;

let cachedSaToken = null;

async function getAdminToken() {
  if (cachedSaToken && cachedSaToken.expiresAt > Date.now()) {
    return cachedSaToken.token;
  }
  const cleanPem = SA_JSON.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\s+/g, "");
  const bytes = Buffer.from(cleanPem, "base64");
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    bytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const now = Math.floor(Date.now() / 1000);
  const b64 = (s) => Buffer.from(s).toString("base64url");
  const strToSign =
    b64(JSON.stringify({ alg: "RS256", typ: "JWT" })) +
    "." +
    b64(
      JSON.stringify({
        iss: SA_JSON.client_email,
        sub: SA_JSON.client_email,
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
        scope: "https://www.googleapis.com/auth/datastore",
      })
    );

  const sigBuf = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(strToSign)
  );
  const assertion = strToSign + "." + Buffer.from(sigBuf).toString("base64url");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get SA access token: " + JSON.stringify(data));
  cachedSaToken = {
    token: data.access_token,
    expiresAt: Date.now() + 3000 * 1000,
  };
  return data.access_token;
}

async function setFirestoreUserFields(uid, fields) {
  const adminToken = await getAdminToken();
  const url = `https://firestore.googleapis.com/v1/projects/crackflow/databases/(default)/documents/users/${encodeURIComponent(uid)}?updateMask.fieldPaths=${Object.keys(fields).join("&updateMask.fieldPaths=")}`;
  const formattedFields = {};
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === "number") formattedFields[k] = { integerValue: v.toString() };
    else if (typeof v === "boolean") formattedFields[k] = { booleanValue: v };
    else formattedFields[k] = { stringValue: v.toString() };
  }
  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: formattedFields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore PATCH failed: ${res.status} ${err}`);
  }
}

async function main() {
  console.log("================================================================================");
  console.log("       CRACKFLOW SCREENSHOT AI QUOTA & CONCURRENCY TEST SUITE                   ");
  console.log("================================================================================\n");

  // ============================================================================
  // SECTION A: PLAN CONFIGURATION TESTS
  // ============================================================================
  console.log("--- PHASE 7A: Plan Configuration Tests ---");

  await runTest("7A.1: Worker SCREEN_SOLVES_QUOTAS contains exact quotas", async () => {
    const plansSource = fs.readFileSync(path.join(__dirname, "crackflow-worker", "src", "config", "plans.ts"), "utf8");
    if (!plansSource.includes("INTERVIEW_1H: 234")) throw new Error("Missing INTERVIEW_1H: 234");
    if (!plansSource.includes("INTERVIEW_6H: 587")) throw new Error("Missing INTERVIEW_6H: 587");
    if (!plansSource.includes("INTERVIEW_24H: 1175")) throw new Error("Missing INTERVIEW_24H: 1175");
    if (!plansSource.includes("MONTHLY: 1175")) throw new Error("Missing MONTHLY: 1175");
    if (!plansSource.includes("YEARLY: 5880")) throw new Error("Missing YEARLY: 5880");
  });

  await runTest("7A.2: Website plan configuration matches Worker quotas", async () => {
    const webPlansSource = fs.readFileSync(path.join(__dirname, "src", "config", "plans.ts"), "utf8");
    if (!webPlansSource.includes("234 AI Screen Solves Included")) throw new Error("Website 1H missing 234 solves bullet");
    if (!webPlansSource.includes("587 AI Screen Solves Included")) throw new Error("Website 6H missing 587 solves bullet");
    if (!webPlansSource.includes("1,175 AI Screen Solves Included")) throw new Error("Website 24H missing 1,175 solves bullet");
    if (!webPlansSource.includes("Unlimited AI Screen Solves (Fair Use applies)")) throw new Error("Website subscription missing Unlimited solves bullet");
  });

  await runTest("7A.3: Subscription periods are represented correctly", async () => {
    const plansSource = fs.readFileSync(path.join(__dirname, "crackflow-worker", "src", "config", "plans.ts"), "utf8");
    if (!plansSource.includes("billingPeriodDays: 30")) throw new Error("MONTHLY billingPeriodDays should be 30");
    if (!plansSource.includes("billingPeriodDays: 365")) throw new Error("YEARLY billingPeriodDays should be 365");
  });

  // ============================================================================
  // SECTION B: PAYMENT & ENTITLEMENT TESTS
  // ============================================================================
  console.log("\n--- PHASE 7B: Payment & Entitlement Tests ---");

  let u1h = await createTestUser("u_1h");
  let u6h = await createTestUser("u_6h");
  let u24h = await createTestUser("u_24h");
  let uMon = await createTestUser("u_mon");
  let uYr = await createTestUser("u_yr");

  await runTest("7B.1: Purchase 1-Hour Pack grants 234 screen solves", async () => {
    await purchasePlan(u1h.idToken, "INTERVIEW_1H");
    const meRes = await fetch(`${BASE_URL}/v1/me?refresh=true`, {
      headers: { Authorization: `Bearer ${u1h.idToken}` },
    });
    const me = await meRes.json();
    if (me.screenSolvesRemaining !== 234) throw new Error(`Expected 234, got ${me.screenSolvesRemaining}`);
    if (me.isUnlimitedSolves !== false) throw new Error("isUnlimitedSolves should be false for pack");
  });

  await runTest("7B.2: Purchase 6-Hour Pack grants 587 screen solves", async () => {
    await purchasePlan(u6h.idToken, "INTERVIEW_6H");
    const meRes = await fetch(`${BASE_URL}/v1/me?refresh=true`, {
      headers: { Authorization: `Bearer ${u6h.idToken}` },
    });
    const me = await meRes.json();
    if (me.screenSolvesRemaining !== 587) throw new Error(`Expected 587, got ${me.screenSolvesRemaining}`);
  });

  await runTest("7B.3: Purchase 24-Hour Pack grants 1,175 screen solves", async () => {
    await purchasePlan(u24h.idToken, "INTERVIEW_24H");
    const meRes = await fetch(`${BASE_URL}/v1/me?refresh=true`, {
      headers: { Authorization: `Bearer ${u24h.idToken}` },
    });
    const me = await meRes.json();
    if (me.screenSolvesRemaining !== 1175) throw new Error(`Expected 1175, got ${me.screenSolvesRemaining}`);
  });

  await runTest("7B.4: Monthly subscription grants 1,175 and isUnlimitedSolves=true", async () => {
    await purchasePlan(uMon.idToken, "MONTHLY");
    const meRes = await fetch(`${BASE_URL}/v1/me?refresh=true`, {
      headers: { Authorization: `Bearer ${uMon.idToken}` },
    });
    const me = await meRes.json();
    if (me.screenSolvesRemaining !== 1175) throw new Error(`Expected 1175, got ${me.screenSolvesRemaining}`);
    if (me.isUnlimitedSolves !== true) throw new Error("isUnlimitedSolves should be true for subscription");
  });

  await runTest("7B.5: Yearly subscription grants 5,880 and isUnlimitedSolves=true", async () => {
    await purchasePlan(uYr.idToken, "YEARLY");
    const meRes = await fetch(`${BASE_URL}/v1/me?refresh=true`, {
      headers: { Authorization: `Bearer ${uYr.idToken}` },
    });
    const me = await meRes.json();
    if (me.screenSolvesRemaining !== 5880) throw new Error(`Expected 5880, got ${me.screenSolvesRemaining}`);
    if (me.isUnlimitedSolves !== true) throw new Error("isUnlimitedSolves should be true for subscription");
  });

  await runTest("7B.6: Replaying same payment verification is idempotent (no double credit)", async () => {
    const buyResult = await purchasePlan(u1h.idToken, "INTERVIEW_1H");
    const res2 = await fetch(`${BASE_URL}/v1/billing/razorpay/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${u1h.idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpay_order_id: buyResult.orderId,
        razorpay_payment_id: buyResult.paymentId,
        razorpay_signature: buyResult.signature,
        planId: "INTERVIEW_1H",
      }),
    });
    const data2 = await res2.json();
    if (data2.deduplicated !== true) throw new Error("Expected deduplicated=true on replayed payment verify");
    const meRes = await fetch(`${BASE_URL}/v1/me?refresh=true`, {
      headers: { Authorization: `Bearer ${u1h.idToken}` },
    });
    const me = await meRes.json();
    // 234 from first purchase + 234 from second purchase = 468. Replay should NOT grant a third 234!
    if (me.screenSolvesRemaining !== 468) throw new Error(`Expected 468, got ${me.screenSolvesRemaining}`);
  });

  await runTest("7B.7: Multi-pack accumulation: Buying 6H after 1H aggregates solves", async () => {
    const meBefore = await (await fetch(`${BASE_URL}/v1/me?refresh=true`, {
      headers: { Authorization: `Bearer ${u1h.idToken}` },
    })).json();
    await purchasePlan(u1h.idToken, "INTERVIEW_6H");
    const meAfter = await (await fetch(`${BASE_URL}/v1/me?refresh=true`, {
      headers: { Authorization: `Bearer ${u1h.idToken}` },
    })).json();
    const expected = meBefore.screenSolvesRemaining + 587;
    if (meAfter.screenSolvesRemaining !== expected) {
      throw new Error(`Expected ${expected}, got ${meAfter.screenSolvesRemaining}`);
    }
  });

  await runTest("7B.8: Subscription quota does not reset merely because /v1/me is called", async () => {
    const me1 = await (await fetch(`${BASE_URL}/v1/me?refresh=true`, { headers: { Authorization: `Bearer ${uMon.idToken}` } })).json();
    const me2 = await (await fetch(`${BASE_URL}/v1/me?refresh=true`, { headers: { Authorization: `Bearer ${uMon.idToken}` } })).json();
    if (me1.screenSolvesRemaining !== me2.screenSolvesRemaining) {
      throw new Error("Quota changed across /v1/me requests without activity!");
    }
  });

  // ============================================================================
  // SECTION C: SCREENSHOT AUTHORIZATION TESTS
  // ============================================================================
  console.log("\n--- PHASE 7C: Screenshot Authorization Tests ---");

  let freeUser = await createTestUser("free_u");

  await runTest("7C.1: Unauthenticated request rejected with HTTP 401", async () => {
    const res = await fetch(`${BASE_URL}/v1/ai/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "screen_capture", contents: [{ parts: [{ text: "Solve this" }] }] }),
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await runTest("7C.2: Free user rejected with HTTP 403 SCREEN_ACCESS_REQUIRED", async () => {
    const res = await fetch(`${BASE_URL}/v1/ai/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${freeUser.idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ source: "screen_capture", contents: [{ parts: [{ text: "Solve this" }] }] }),
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    const data = await res.json();
    if (data.error !== "SCREEN_ACCESS_REQUIRED") throw new Error(`Expected SCREEN_ACCESS_REQUIRED, got ${data.error}`);
  });

  await runTest("7C.3: Valid paid user allowed WITHOUT active interview session", async () => {
    const res = await fetch(`${BASE_URL}/v1/ai/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${u6h.idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "screen_capture",
        contents: [{ parts: [{ text: "Solve LeetCode problem" }] }],
      }),
    });
    if (res.status !== 200) {
      const err = await res.text();
      throw new Error(`Expected 200, got ${res.status}: ${err}`);
    }
    const remHeader = res.headers.get("X-Screen-Solves-Remaining");
    if (!remHeader) throw new Error("Missing X-Screen-Solves-Remaining header");
  });

  await runTest("7C.4: User with zero quota receives HTTP 403 SCREEN_QUOTA_EXHAUSTED", async () => {
    let zeroUser = await createTestUser("zero_u");
    await purchasePlan(zeroUser.idToken, "INTERVIEW_1H");
    // Explicitly set quota to 0 in Firestore to test zero-floor
    await setFirestoreUserFields(zeroUser.uid, { screenSolvesRemaining: 0 });

    const res = await fetch(`${BASE_URL}/v1/ai/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${zeroUser.idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "screen_capture",
        contents: [{ parts: [{ text: "Solve problem" }] }],
      }),
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    const data = await res.json();
    if (data.error !== "SCREEN_QUOTA_EXHAUSTED") throw new Error(`Expected SCREEN_QUOTA_EXHAUSTED, got ${data.error}`);
  });

  await runTest("7C.5: Expired pack user receives HTTP 403 SCREEN_ACCESS_EXPIRED", async () => {
    let expUser = await createTestUser("exp_u");
    await purchasePlan(expUser.idToken, "INTERVIEW_1H");
    const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
    await setFirestoreUserFields(expUser.uid, { packExpiresAt: pastDate });

    const res = await fetch(`${BASE_URL}/v1/ai/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${expUser.idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "screen_capture",
        contents: [{ parts: [{ text: "Solve problem" }] }],
      }),
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    const data = await res.json();
    if (data.error !== "SCREEN_ACCESS_EXPIRED") throw new Error(`Expected SCREEN_ACCESS_EXPIRED, got ${data.error}`);
  });

  await runTest("7C.6: Omission of source='screen_capture' falls through to interview rules (requires session)", async () => {
    const res = await fetch(`${BASE_URL}/v1/ai/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${u24h.idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Regular interview question" }] }],
      }),
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    const data = await res.json();
    if (data.error !== "SESSION_REQUIRED") throw new Error(`Expected SESSION_REQUIRED, got ${data.error}`);
  });

  // ============================================================================
  // SECTION D: CONCURRENCY & ZERO FLOOR TESTS
  // ============================================================================
  console.log("\n--- PHASE 7D: Quota Decrement & Concurrency Tests ---");

  await runTest("7D.1: Successful screen solve decrements quota by exactly 1", async () => {
    let decremUser = await createTestUser("dec_u");
    await purchasePlan(decremUser.idToken, "INTERVIEW_1H"); // 234 solves
    const beforeMe = await (await fetch(`${BASE_URL}/v1/me?refresh=true`, { headers: { Authorization: `Bearer ${decremUser.idToken}` } })).json();

    const res = await fetch(`${BASE_URL}/v1/ai/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${decremUser.idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ source: "screen_capture", contents: [{ parts: [{ text: "Solve 1" }] }] }),
    });
    if (res.status !== 200) throw new Error(`Request failed with status ${res.status}`);
    const remHeader = parseInt(res.headers.get("X-Screen-Solves-Remaining"), 10);
    if (remHeader !== beforeMe.screenSolvesRemaining - 1) {
      throw new Error(`Expected ${beforeMe.screenSolvesRemaining - 1}, got header ${remHeader}`);
    }

    const afterMe = await (await fetch(`${BASE_URL}/v1/me?refresh=true`, { headers: { Authorization: `Bearer ${decremUser.idToken}` } })).json();
    if (afterMe.screenSolvesRemaining !== beforeMe.screenSolvesRemaining - 1) {
      throw new Error(`Authoritative balance mismatch: expected ${beforeMe.screenSolvesRemaining - 1}, got ${afterMe.screenSolvesRemaining}`);
    }
  });

  await runTest("7D.2: Replaying request with same idempotencyKey does not double-charge", async () => {
    let idempUser = await createTestUser("idemp_u");
    await purchasePlan(idempUser.idToken, "INTERVIEW_1H");
    const testKey = `solve_idemp_${Date.now()}`;

    const res1 = await fetch(`${BASE_URL}/v1/ai/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idempUser.idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ source: "screen_capture", idempotencyKey: testKey, contents: [{ parts: [{ text: "Solve 1" }] }] }),
    });
    const rem1 = parseInt(res1.headers.get("X-Screen-Solves-Remaining"), 10);

    const res2 = await fetch(`${BASE_URL}/v1/ai/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idempUser.idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ source: "screen_capture", idempotencyKey: testKey, contents: [{ parts: [{ text: "Solve 1 replayed" }] }] }),
    });
    const rem2 = parseInt(res2.headers.get("X-Screen-Solves-Remaining"), 10);

    if (rem1 !== rem2) {
      throw new Error(`Idempotent retry changed quota: rem1=${rem1}, rem2=${rem2}`);
    }
  });

  await runTest("7D.3: Zero floor concurrency: 5 concurrent requests with 1 credit allows at most 1 solve", async () => {
    let raceUser = await createTestUser("race_u");
    await purchasePlan(raceUser.idToken, "INTERVIEW_1H");
    // Set balance to exactly 1
    await setFirestoreUserFields(raceUser.uid, { screenSolvesRemaining: 1 });

    // Send 5 concurrent requests simultaneously
    const requests = Array.from({ length: 5 }, (_, i) =>
      fetch(`${BASE_URL}/v1/ai/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${raceUser.idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "screen_capture",
          idempotencyKey: `race_${Date.now()}_${i}`,
          contents: [{ parts: [{ text: `Solve race ${i}` }] }],
        }),
      })
    );

    const responses = await Promise.all(requests);
    const successCount = responses.filter((r) => r.status === 200).length;
    const exhaustedCount = responses.filter((r) => r.status === 403).length;

    if (successCount > 1) {
      throw new Error(`CONCURRENCY RACE FAILURE: Overspent! Allowed ${successCount} solves with only 1 credit.`);
    }

    const meAfter = await (await fetch(`${BASE_URL}/v1/me?refresh=true`, { headers: { Authorization: `Bearer ${raceUser.idToken}` } })).json();
    if (meAfter.screenSolvesRemaining < 0) {
      throw new Error(`CONCURRENCY RACE FAILURE: Balance driven below zero! ${meAfter.screenSolvesRemaining}`);
    }
    if (meAfter.screenSolvesRemaining !== 0) {
      throw new Error(`Expected remaining to be 0, got ${meAfter.screenSolvesRemaining}`);
    }
  });

  // ============================================================================
  // SECTION E: STREAMING & PROVIDER FAILURE REFUND
  // ============================================================================
  console.log("\n--- PHASE 7E: Gemini Streaming & Refund Policy Tests ---");

  await runTest("7E.1: SSE Streaming mode returns 200 with text/event-stream & quota headers", async () => {
    const res = await fetch(`${BASE_URL}/v1/ai/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${u24h.idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "screen_capture",
        stream: true,
        contents: [{ parts: [{ text: "Stream this solution" }] }],
      }),
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const cType = res.headers.get("Content-Type") || "";
    if (!cType.includes("text/event-stream") && !cType.includes("application/json")) {
      throw new Error(`Unexpected Content-Type: ${cType}`);
    }
    if (!res.headers.has("X-Screen-Solves-Remaining")) {
      throw new Error("Missing X-Screen-Solves-Remaining header");
    }
  });

  // ============================================================================
  // SECTION F: DESKTOP UI CONTRACTS
  // ============================================================================
  console.log("\n--- PHASE 7F: Desktop UI Contracts ---");

  await runTest("7F.1: Credit pack /v1/me returns exact numeric balance", async () => {
    const me = await (await fetch(`${BASE_URL}/v1/me?refresh=true`, { headers: { Authorization: `Bearer ${u1h.idToken}` } })).json();
    if (typeof me.screenSolvesRemaining !== "number" || me.isUnlimitedSolves !== false) {
      throw new Error("Credit pack contract violation");
    }
  });

  await runTest("7F.2: Subscription /v1/me returns isUnlimitedSolves=true", async () => {
    const me = await (await fetch(`${BASE_URL}/v1/me?refresh=true`, { headers: { Authorization: `Bearer ${uMon.idToken}` } })).json();
    if (me.isUnlimitedSolves !== true || typeof me.screenSolvesRemaining !== "number") {
      throw new Error("Subscription contract violation");
    }
  });

  await runTest("7F.3: CORS Access-Control-Expose-Headers exposes quota headers to browser/Tauri", async () => {
    const res = await fetch(`${BASE_URL}/v1/health`, { method: "OPTIONS" });
    const exposed = res.headers.get("Access-Control-Expose-Headers") || "";
    if (!exposed.includes("X-Screen-Solves-Remaining")) throw new Error("Missing X-Screen-Solves-Remaining in CORS");
    if (!exposed.includes("X-Is-Unlimited")) throw new Error("Missing X-Is-Unlimited in CORS");
  });

  // ============================================================================
  // SECTION G: REGRESSION TESTS FOR EXISTING CRACKFLOW FUNCTIONALITY
  // ============================================================================
  console.log("\n--- PHASE 7G: Regression Tests for Existing CrackFlow Features ---");

  let regUser = await createTestUser("reg_u");
  await purchasePlan(regUser.idToken, "INTERVIEW_1H");

  let interviewSessionId = "";

  await runTest("7G.1: /v1/interview/start creates audio session and returns ID", async () => {
    const res = await fetch(`${BASE_URL}/v1/interview/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${regUser.idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: "desktop_dev_1" }),
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    if (!data.sessionId) throw new Error("Missing sessionId");
    interviewSessionId = data.sessionId;
  });

  await runTest("7G.2: Concurrent audio session blocked with 409", async () => {
    const res = await fetch(`${BASE_URL}/v1/interview/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${regUser.idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: "desktop_dev_2" }),
    });
    if (res.status !== 409) throw new Error(`Expected 409, got ${res.status}`);
  });

  await runTest("7G.3: Session heartbeat /v1/session/heartbeat responds successfully", async () => {
    const res = await fetch(`${BASE_URL}/v1/session/heartbeat`, {
      method: "POST",
      headers: { Authorization: `Bearer ${regUser.idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: interviewSessionId }),
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  await runTest("7G.4: Temporary Deepgram STT token /v1/stt/token issued", async () => {
    const res = await fetch(`${BASE_URL}/v1/stt/token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${regUser.idToken}`, "Content-Type": "application/json" },
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    if (!data.token) throw new Error("Missing Deepgram token in response");
  });

  await runTest("7G.5: Audio session end /v1/session/end deducts time and marks completed", async () => {
    const res = await fetch(`${BASE_URL}/v1/session/end`, {
      method: "POST",
      headers: { Authorization: `Bearer ${regUser.idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: interviewSessionId, actualUsedSeconds: 15 }),
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error("Session end failed");
  });

  console.log("\n================================================================================");
  console.log(` RESULTS: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log("================================================================================");
  if (totalFailed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Test execution terminated with error:", err);
  process.exit(1);
});
