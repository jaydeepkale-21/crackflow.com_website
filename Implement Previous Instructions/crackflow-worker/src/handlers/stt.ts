import { EntitledUser, Env, SttTokenResponse } from "../types";
import { HttpError } from "../middleware/auth";

/**
 * POST /v1/stt/token
 * Obtains a temporary Deepgram JWT using Deepgram's official Token-Based Auth endpoint:
 * POST https://api.deepgram.com/v1/auth/grant
 *
 * Supports up to 3 Deepgram API keys with automatic failover:
 *   DEEPGRAM_API_KEY   -> primary
 *   DEEPGRAM_API_KEY_2 -> secondary (used if primary fails)
 *   DEEPGRAM_API_KEY_3 -> tertiary  (used if both primary & secondary fail)
 *
 * Strictly restricted to authenticated PAID users.
 * Permanent DEEPGRAM_API_KEYs stay exclusively in Cloudflare Worker secrets.
 */

import {
  getActiveSessionFromFirestore,
  getSessionByIdFromFirestore,
} from "../lib/firestore";

// Track failed keys with cooldown to avoid hammering a broken key
const keyCooldowns = new Map<number, number>();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minute cooldown per failed key

export async function handleSttToken(
  entitledUser: EntitledUser,
  env: Env,
  request?: Request
): Promise<Response> {
  // 1. Enforce remaining access balance
  if (entitledUser.remainingSeconds <= 0) {
    throw new HttpError(
      403,
      "USAGE_EXHAUSTED",
      "Your interview time has been exhausted. Please purchase additional hours to continue."
    );
  }

  // 2. Enforce active interview session to prevent direct token generation (TEST 34, 35)
  let reqSessionId: string | undefined;
  if (request) {
    try {
      const body: any = await request.clone().json();
      reqSessionId = body?.sessionId;
    } catch {}
  }

  const activeSession = await getActiveSessionFromFirestore(entitledUser.uid, env);
  if (!activeSession) {
    throw new HttpError(
      403,
      "SESSION_REQUIRED",
      "An active interview session is required to request a speech recognition token. Please start an interview session first."
    );
  }

  if (reqSessionId) {
    if (activeSession.sessionId !== reqSessionId) {
      // Check if session exists under another user (TEST 35)
      const otherSession = await getSessionByIdFromFirestore(reqSessionId, env);
      if (otherSession && otherSession.uid !== entitledUser.uid) {
        throw new HttpError(403, "FORBIDDEN", "You do not own this interview session.");
      }
      throw new HttpError(403, "FORBIDDEN", "Invalid or inactive session ID.");
    }
  }

  // 3. Cap Deepgram JWT TTL so it NEVER exceeds remaining interview seconds (TEST 29, 30, 31)
  const ttl = Math.max(1, Math.min(entitledUser.remainingSeconds, 3600));

  // Collect all configured keys in priority order
  const allKeys: string[] = [];
  if (env.DEEPGRAM_API_KEY) allKeys.push(env.DEEPGRAM_API_KEY);
  if (env.DEEPGRAM_API_KEY_2) allKeys.push(env.DEEPGRAM_API_KEY_2);
  if (env.DEEPGRAM_API_KEY_3) allKeys.push(env.DEEPGRAM_API_KEY_3);


  if (allKeys.length === 0) {
    console.warn("[Deepgram] No DEEPGRAM_API_KEY configured. Returning dev mock token.");
    const devToken: SttTokenResponse = {
      token: "dev_mock_deepgram_jwt_token_sample",
      expiresInSeconds: ttl,
    };
    return new Response(JSON.stringify(devToken), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const now = Date.now();


  // Try each key in order, skipping keys that are in cooldown
  for (let i = 0; i < allKeys.length; i++) {
    const attemptNum = i + 1;

    // Check if this key is in cooldown from a recent failure
    const cooldownUntil = keyCooldowns.get(i);
    if (cooldownUntil && now < cooldownUntil) {
      console.warn(`[Deepgram] Key ${attemptNum}/${allKeys.length} is in cooldown. Skipping.`);
      continue;
    }

    try {
      const response = await fetch("https://api.deepgram.com/v1/auth/grant", {
        method: "POST",
        headers: {
          Authorization: `Token ${allKeys[i]}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl_seconds: ttl }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.warn(
          `[Deepgram] Key ${attemptNum}/${allKeys.length} failed: HTTP ${response.status}. ${errText}`
        );
        // Put this key in cooldown so we don't retry it immediately
        keyCooldowns.set(i, now + COOLDOWN_MS);
        continue; // Try the next key
      }

      const data = (await response.json()) as any;
      const token = data.access_token || data.token || data.key;

      if (!token) {
        console.warn(`[Deepgram] Key ${attemptNum}/${allKeys.length} returned OK but no token in response.`);
        keyCooldowns.set(i, now + COOLDOWN_MS);
        continue;
      }

      // Success! Clear any cooldown on this key
      keyCooldowns.delete(i);
      console.log(`[Deepgram] Key ${attemptNum}/${allKeys.length} succeeded. Temporary token generated.`);

      const result: SttTokenResponse = {
        token,
        expiresInSeconds: data.expires_in || ttl,
      };

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.warn(`[Deepgram] Key ${attemptNum}/${allKeys.length} network error: ${err.message}`);
      keyCooldowns.set(i, now + COOLDOWN_MS);
      continue;
    }
  }

  // All keys exhausted
  console.error("[Deepgram] All configured keys failed to generate a temporary token.");
  throw new HttpError(
    503,
    "DEEPGRAM_ALL_KEYS_FAILED",
    "All speech recognition providers are temporarily unavailable. Please try again in a few minutes."
  );
}
