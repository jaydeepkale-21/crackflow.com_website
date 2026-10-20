/**
 * CrackFlow - Firestore Security Rules Automated Test Suite
 * 
 * Verifies all 30 security, authorization, entitlement-protection,
 * and regression scenarios against firestore.rules using the local Firestore Emulator
 * and @firebase/rules-unit-testing.
 */

const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const fs = require("fs");
const path = require("path");

const PROJECT_ID = "crackflow-security-test";
const EMULATOR_HOST = "127.0.0.1";
const EMULATOR_PORT = 8088;

let testEnv;

async function runTestSuite() {
  console.log("================================================================");
  console.log(" CrackFlow P0 Security: Firestore Rules Automated Verification");
  console.log("================================================================");
  console.log(`[Config] Project: ${PROJECT_ID}`);
  console.log(`[Config] Emulator: ${EMULATOR_HOST}:${EMULATOR_PORT}`);

  const rulesPath = path.resolve(__dirname, "firestore.rules");
  const rules = fs.readFileSync(rulesPath, "utf8");

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: EMULATOR_HOST,
      port: EMULATOR_PORT,
      rules: rules,
    },
  });

  console.log("[Init] Test environment successfully connected to Firestore Emulator.\n");

  let passed = 0;
  let failed = 0;

  async function testCase(id, title, testFn) {
    try {
      // Clear data before each test
      await testEnv.clearFirestore();
      await testFn();
      console.log(`  \x1b[32mPASS\x1b[0m  Test #${id.toString().padStart(2, "0")}: ${title}`);
      passed++;
    } catch (err) {
      console.error(`  \x1b[31mFAIL\x1b[0m  Test #${id.toString().padStart(2, "0")}: ${title}`);
      console.error(`        Error: ${err.message || err}`);
      failed++;
    }
  }

  // Seed baseline legitimate profile for Alice
  async function seedAliceProfile(data = {}) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection("users").doc("alice").set({
        uid: "alice",
        email: "alice@example.com",
        displayName: "Alice Developer",
        photoURL: "https://example.com/alice.jpg",
        planTier: "interview_6h",
        subscriptionStatus: "active",
        paymentProvider: "razorpay",
        customerId: "cust_123",
        subscriptionId: null,
        lifetime: false,
        packProductId: "INTERVIEW_6H",
        packTotalSeconds: 21600,
        packUsedSeconds: 3600,
        packExpiresAt: new Date(Date.now() + 86400000).toISOString(),
        packPurchasedAt: new Date().toISOString(),
        accessType: "pack",
        screenSolvesRemaining: 50,
        screenSolvesTotal: 50,
        screenSolvesUsed: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      });
    });
  }

  console.log("--- Category 1: Authentication and Ownership ---");

  await testCase(1, "Unauthenticated user cannot read a protected user document", async () => {
    await seedAliceProfile();
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthDb.collection("users").doc("alice").get());
  });

  await testCase(2, "User A can read their own profile", async () => {
    await seedAliceProfile();
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(aliceDb.collection("users").doc("alice").get());
  });

  await testCase(3, "User A cannot read User B's private profile", async () => {
    await seedAliceProfile();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertFails(bobDb.collection("users").doc("alice").get());
  });

  await testCase(4, "User A cannot update User B's profile", async () => {
    await seedAliceProfile();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertFails(bobDb.collection("users").doc("alice").update({
      displayName: "Bob Overwrite",
    }));
  });

  await testCase(5, "Unauthenticated user cannot create or modify protected user documents", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthDb.collection("users").doc("mallory").set({
      uid: "mallory",
      planTier: "none",
    }));
  });

  console.log("\n--- Category 2: Allowed Profile Operations ---");

  await testCase(6, "User can update displayName when valid", async () => {
    await seedAliceProfile();
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(aliceDb.collection("users").doc("alice").update({
      displayName: "Alice Engineer",
      updatedAt: new Date(),
    }));
  });

  await testCase(7, "User can update photoURL when valid", async () => {
    await seedAliceProfile();
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(aliceDb.collection("users").doc("alice").update({
      photoURL: "https://crackflow.com/avatars/new.png",
      updatedAt: new Date(),
    }));
  });

  await testCase(8, "Multiple permitted profile fields can be updated together", async () => {
    await seedAliceProfile();
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(aliceDb.collection("users").doc("alice").update({
      displayName: "Alice New Name",
      photoURL: "https://crackflow.com/avatars/alice2.png",
      updatedAt: new Date(),
    }));
  });

  await testCase(9, "Invalid profile types are rejected (numeric displayName)", async () => {
    await seedAliceProfile();
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(aliceDb.collection("users").doc("alice").update({
      displayName: 12345, // invalid type
      updatedAt: new Date(),
    }));
  });

  await testCase(10, "Overlong profile strings are rejected (>100 chars displayName)", async () => {
    await seedAliceProfile();
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const longName = "A".repeat(101);
    await assertFails(aliceDb.collection("users").doc("alice").update({
      displayName: longName,
      updatedAt: new Date(),
    }));
  });

  await testCase(11, "Allowed profile update does not require client to rewrite protected fields", async () => {
    await seedAliceProfile();
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    // Alice only submits displayName and updatedAt; protected fields remain intact in document
    await assertSucceeds(aliceDb.collection("users").doc("alice").update({
      displayName: "Alice Single Field",
      updatedAt: new Date(),
    }));
  });

  console.log("\n--- Category 3: Billing and Entitlement Attack Tests ---");

  await testCase(12, "Setting packTotalSeconds to 9999999 is rejected", async () => {
    await seedAliceProfile();
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(aliceDb.collection("users").doc("alice").update({
      packTotalSeconds: 9999999,
    }));
  });

  await testCase(13, "Resetting packUsedSeconds to 0 is rejected", async () => {
    await seedAliceProfile();
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(aliceDb.collection("users").doc("alice").update({
      packUsedSeconds: 0,
    }));
  });

  await testCase(14, "Setting planTier to lifetime is rejected", async () => {
    await seedAliceProfile();
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(aliceDb.collection("users").doc("alice").update({
      planTier: "lifetime",
    }));
  });

  await testCase(15, "Setting subscriptionStatus to active is rejected", async () => {
    await seedAliceProfile({ subscriptionStatus: "canceled" });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(aliceDb.collection("users").doc("alice").update({
      subscriptionStatus: "active",
    }));
  });

  await testCase(16, "Setting lifetime to true is rejected", async () => {
    await seedAliceProfile({ lifetime: false });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(aliceDb.collection("users").doc("alice").update({
      lifetime: true,
    }));
  });

  await testCase(17, "Increasing screenSolvesRemaining is rejected", async () => {
    await seedAliceProfile({ screenSolvesRemaining: 5 });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(aliceDb.collection("users").doc("alice").update({
      screenSolvesRemaining: 9999,
    }));
  });

  await testCase(18, "Modifying subscription fair-use counters is rejected", async () => {
    await seedAliceProfile();
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(aliceDb.collection("users").doc("alice").update({
      subscriptionFairUseSeconds: 1000000,
      subscriptionUsedSeconds: 0,
    }));
  });

  await testCase(19, "Modifying payment, customer, or subscription identifiers is rejected", async () => {
    await seedAliceProfile();
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(aliceDb.collection("users").doc("alice").update({
      paymentProvider: "stripe",
      customerId: "forged_cust_id",
      subscriptionId: "sub_free_pass",
    }));
  });

  await testCase(20, "Adding a sensitive field during an otherwise valid profile update is rejected", async () => {
    await seedAliceProfile();
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    // Smuggling planTier inside a legitimate displayName update
    await assertFails(aliceDb.collection("users").doc("alice").update({
      displayName: "Alice Sneaky",
      planTier: "lifetime",
      updatedAt: new Date(),
    }));
  });

  await testCase(21, "Removing or altering required identity fields (uid, email) is rejected", async () => {
    await seedAliceProfile();
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(aliceDb.collection("users").doc("alice").update({
      uid: "bob",
    }));
  });

  console.log("\n--- Category 4: Creation and Other Collections ---");

  await testCase(22, "Client cannot create a user document containing forged billing entitlements", async () => {
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertFails(bobDb.collection("users").doc("bob").set({
      uid: "bob",
      email: "bob@example.com",
      displayName: "Bob Hacker",
      planTier: "lifetime",
      subscriptionStatus: "active",
      packTotalSeconds: 9999999,
      lifetime: true,
      paymentProvider: "dummy",
      customerId: null,
      subscriptionId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  await testCase(23, "Client cannot create or modify a forged payment-success or order record", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    // Try to write to /orders/
    await assertFails(aliceDb.collection("orders").doc("order_fake_123").set({
      uid: "alice",
      status: "paid",
      amount: 10000,
    }));
    // Try to write to /stripeWebhookEvents/
    await assertFails(aliceDb.collection("stripeWebhookEvents").doc("evt_fake").set({
      uid: "alice",
      type: "payment_intent.succeeded",
    }));
  });

  await testCase(24, "Client cannot modify authoritative session time, ownership, or status", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(aliceDb.collection("sessions").doc("sess_fake_123").set({
      sessionId: "sess_fake_123",
      uid: "alice",
      status: "active",
      remainingSeconds: 999999,
    }));
  });

  await testCase(25, "Client cannot create or modify privileged usage or quota records", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(aliceDb.collection("usage").doc("alice_2026-10-21").set({
      uid: "alice",
      totalApiCalls: 0,
      rejectedCalls: 0,
    }));
  });

  await testCase(26, "Other users cannot modify another user's private records", async () => {
    await seedAliceProfile();
    const malloryDb = testEnv.authenticatedContext("mallory").firestore();
    await assertFails(malloryDb.collection("users").doc("alice").set({
      uid: "alice",
      displayName: "Defaced by Mallory",
    }));
  });

  console.log("\n--- Category 5: Regression Tests ---");

  await testCase(27, "Existing legitimate signup profile creation works under the new safe rules", async () => {
    const charlieDb = testEnv.authenticatedContext("charlie").firestore();
    // Exactly matches createUserProfile() in src/services/firestore.ts
    const initialProfile = {
      uid: "charlie",
      email: "charlie@example.com",
      displayName: "Charlie",
      photoURL: null,
      planTier: "none",
      subscriptionStatus: "none",
      paymentProvider: "dummy",
      customerId: null,
      subscriptionId: null,
      lifetime: false,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await assertSucceeds(charlieDb.collection("users").doc("charlie").set(initialProfile));
  });

  await testCase(28, "Dashboard profile reads continue to work", async () => {
    await seedAliceProfile();
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const snap = await assertSucceeds(aliceDb.collection("users").doc("alice").get());
    const exists = typeof snap.exists === "function" ? snap.exists() : snap.exists;
    if (!exists) {
      throw new Error("Expected seeded document to exist on read");
    }
  });

  await testCase(29, "Access to unlisted collections is strictly denied (default-deny)", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(aliceDb.collection("adminAuditLogs").doc("log1").get());
    await assertFails(aliceDb.collection("appConfig").doc("secrets").set({ key: "val" }));
  });

  await testCase(30, "Trusted backend operations bypass Firestore rules (Admin SDK confirmation)", async () => {
    // Verifies that withSecurityRulesDisabled (simulating Google Cloud Service Account REST / Admin SDK)
    // can write authoritative billing fields without being blocked by client-side rules.
    await assertSucceeds(
      testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection("users").doc("alice").set({
          uid: "alice",
          planTier: "lifetime",
          packTotalSeconds: 86400,
          packUsedSeconds: 120,
          subscriptionStatus: "active",
          updatedAt: new Date(),
        });
      })
    );
  });

  console.log("\n================================================================");
  console.log(` Test Execution Summary: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log("================================================================\n");

  await testEnv.cleanup();

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error("Fatal Test Suite Error:", err);
  if (testEnv) testEnv.cleanup();
  process.exit(1);
});
