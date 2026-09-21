// Test script for CrackFlow Cloudflare Worker backend
// Run: node test_proxy.js

const BASE_URL = "http://127.0.0.1:8787";

async function runTest(name, fn) {
  try {
    process.stdout.write(`Testing: ${name.padEnd(52)} `);
    await fn();
    console.log("PASS");
  } catch (err) {
    console.log("FAIL:", err.message);
  }
}

async function main() {
  console.log("==================================================");
  console.log("  CRACKFLOW CLOUDFLARE PROXY AUTOMATED TEST SUITE ");
  console.log("  Target: " + BASE_URL);
  console.log("==================================================\n");

  // Test Case 1: Health
  await runTest("TC1: Health Check (GET /v1/health)", async () => {
    const res = await fetch(`${BASE_URL}/v1/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== "ok" || data.service !== "crackflow-backend") {
      throw new Error(`Unexpected payload: ${JSON.stringify(data)}`);
    }
  });

  // Test Case 2: Version
  await runTest("TC2: Version Check (GET /v1/download/version)", async () => {
    const res = await fetch(`${BASE_URL}/v1/download/version`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.version) throw new Error("Missing version in response");
  });

  // Test Case 3: CORS Preflight
  await runTest("TC3: CORS Preflight (OPTIONS /v1/stt/token)", async () => {
    const res = await fetch(`${BASE_URL}/v1/stt/token`, {
      method: "OPTIONS",
      headers: {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type"
      }
    });
    if (res.status !== 204) throw new Error(`Expected 204, got ${res.status}`);
    const allowOrigin = res.headers.get("access-control-allow-origin");
    if (!allowOrigin) throw new Error("Missing Access-Control-Allow-Origin header");
  });

  // Test Case 4: Unauthenticated STT Token (Expect 401)
  await runTest("TC4: Security - Unauth STT (POST /v1/stt/token)", async () => {
    const res = await fetch(`${BASE_URL}/v1/stt/token`, { method: "POST" });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    const data = await res.json();
    if (data.error !== "UNAUTHORIZED") throw new Error(`Expected UNAUTHORIZED, got ${data.error}`);
  });

  // Test Case 5: Unauthenticated AI Complete (Expect 401)
  await runTest("TC5: Security - Unauth AI (POST /v1/ai/complete)", async () => {
    const res = await fetch(`${BASE_URL}/v1/ai/complete`, { method: "POST" });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    const data = await res.json();
    if (data.error !== "UNAUTHORIZED") throw new Error(`Expected UNAUTHORIZED, got ${data.error}`);
  });

  // Test Case 6: Unauthenticated Profile (Expect 401)
  await runTest("TC6: Security - Unauth Profile (GET /v1/me)", async () => {
    const res = await fetch(`${BASE_URL}/v1/me`, { method: "GET" });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    const data = await res.json();
    if (data.error !== "UNAUTHORIZED") throw new Error(`Expected UNAUTHORIZED, got ${data.error}`);
  });

  // Test Case 7: Corrupted / Invalid Token (Expect 401 INVALID_TOKEN)
  await runTest("TC7: Security - Malformed Token (POST /v1/stt/token)", async () => {
    const res = await fetch(`${BASE_URL}/v1/stt/token`, {
      method: "POST",
      headers: { "Authorization": "Bearer fake.corrupted.token" }
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    const data = await res.json();
    if (data.error !== "INVALID_TOKEN") throw new Error(`Expected INVALID_TOKEN, got ${data.error}`);
  });

  // Test Case 8: 404 Route Not Found
  await runTest("TC8: Error Handling - Unknown Route (GET /v1/unknown)", async () => {
    const res = await fetch(`${BASE_URL}/v1/unknown`);
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    const data = await res.json();
    if (data.error !== "NOT_FOUND") throw new Error(`Expected NOT_FOUND, got ${data.error}`);
  });

  console.log("\n==================================================");
  console.log("  ALL AUTOMATED SECURITY & PROXY CHECKS COMPLETE  ");
  console.log("==================================================\n");
}

main();
