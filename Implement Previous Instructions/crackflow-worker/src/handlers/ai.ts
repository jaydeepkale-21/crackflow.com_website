import { AuthenticatedUser, Env } from "../types";
import {
  HttpError,
  requireActiveEntitlement,
  getCachedProfile,
  updateCachedEntitlement,
  updateCachedEntitlementScreenSolves,
} from "../middleware/auth";
import {
  getActiveSessionFromFirestore,
  getSessionByIdFromFirestore,
  fetchUserFromFirestore,
  atomicReserveScreenQuota,
  refundScreenQuota,
} from "../lib/firestore";

/**
 * POST /v1/ai/complete
 * Proxies AI completion requests to Google Gemini API using server-side GEMINI_API_KEY.
 *
 * Supports two distinct execution modes:
 * 1. Screenshot AI Solves (source === "screen_capture"):
 *    - Independent of live interview sessions (does NOT require "Start Interview").
 *    - Enforces dedicated screenshot quota with zero-floor optimistic concurrency control.
 *    - Atomically refunds quota if Gemini fails pre-stream.
 *    - Returns X-Screen-Solves-Remaining and X-Is-Unlimited response headers.
 *
 * 2. Voice/Audio Interview AI (standard completion):
 *    - Strictly requires active interview session and unexhausted interview seconds.
 *    - Enforces session ownership and time balance.
 */
export async function handleAiComplete(
  request: Request,
  user: AuthenticatedUser,
  env: Env
): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "BAD_REQUEST", "Invalid JSON request body.");
  }

  const isScreenSolve = body?.source === "screen_capture";
  let screenReservation: { remainingSolves: number; isUnlimited: boolean; alreadyReserved?: boolean } | null = null;
  let idempotencyKey: string = "";

  if (isScreenSolve) {
    // ---------------------------------------------------------
    // SCREENSHOT AI SOLVE BRANCH
    // ---------------------------------------------------------
    // 1. Authoritative entitlement check (cached with 60s bounded TTL or fresh)
    let profile = getCachedProfile(user.uid);
    if (!profile) {
      profile = await fetchUserFromFirestore(user.uid, user.rawToken, env);
      if (profile) {
        updateCachedEntitlement(user.uid, profile);
      }
    }

    const planTier = profile?.planTier || "none";
    const subscriptionStatus = profile?.subscriptionStatus || "none";
    const isLifetime = profile?.lifetime === true || planTier === "lifetime";
    const isPack =
      profile?.accessType === "pack" ||
      ["interview_1h", "interview_6h", "interview_24h"].includes(planTier);
    const isSub =
      profile?.accessType === "subscription" ||
      ["monthly", "yearly", "starter", "pro", "lifetime"].includes(planTier);

    if (!isPack && !isSub) {
      throw new HttpError(
        403,
        "SCREEN_ACCESS_REQUIRED",
        "A paid CrackFlow plan is required to use Screenshot AI."
      );
    }

    const now = Date.now();
    if (isPack && profile?.packExpiresAt) {
      if (new Date(profile.packExpiresAt).getTime() < now) {
        throw new HttpError(
          403,
          "SCREEN_ACCESS_EXPIRED",
          "Your CrackFlow interview pack has expired. Please purchase a new pack to continue."
        );
      }
    }

    if (isSub && !isLifetime) {
      if (subscriptionStatus !== "active") {
        throw new HttpError(
          403,
          "SCREEN_ACCESS_EXPIRED",
          "Your CrackFlow subscription is not active."
        );
      }
      if (profile?.currentPeriodEnd && new Date(profile.currentPeriodEnd).getTime() < now) {
        throw new HttpError(
          403,
          "SCREEN_ACCESS_EXPIRED",
          "Your CrackFlow subscription period has ended. Please renew to continue."
        );
      }
    }

    // 2. Concurrency-Safe Durable Atomic Quota Reservation
    const rawKey =
      (typeof body?.idempotencyKey === "string" && body.idempotencyKey.trim()) ||
      request.headers.get("X-Idempotency-Key") ||
      "";
    idempotencyKey = rawKey.trim() || crypto.randomUUID();

    const reservation = await atomicReserveScreenQuota(user.uid, idempotencyKey, env);
    if (!reservation.success) {
      if (reservation.error === "SCREEN_QUOTA_EXHAUSTED") {
        throw new HttpError(
          403,
          "SCREEN_QUOTA_EXHAUSTED",
          "Your Screenshot AI quota has been exhausted. Please upgrade your plan or purchase additional solves."
        );
      }
      if (reservation.error === "SCREEN_ACCESS_EXPIRED") {
        throw new HttpError(
          403,
          "SCREEN_ACCESS_EXPIRED",
          "Your CrackFlow access has expired. Please renew your plan."
        );
      }
      throw new HttpError(
        500,
        "SCREEN_QUOTA_RESERVATION_FAILED",
        "Failed to reserve screenshot quota. Please try again."
      );
    }

    screenReservation = reservation;
    updateCachedEntitlementScreenSolves(user.uid, reservation.remainingSolves);
  } else {
    // ---------------------------------------------------------
    // STANDARD AUDIO INTERVIEW AI COMPLETION BRANCH
    // ---------------------------------------------------------
    const entitledUser = await requireActiveEntitlement(
      user,
      env,
      "An active paid plan is required to use CrackFlow AI."
    );

    // 1. Enforce remaining interview balance
    if (entitledUser.remainingSeconds <= 0) {
      throw new HttpError(
        403,
        "USAGE_EXHAUSTED",
        "Your interview time has been exhausted. Please purchase additional hours to continue."
      );
    }

    // 2. Enforce active interview session to prevent direct API bypass
    const activeSession = await getActiveSessionFromFirestore(entitledUser.uid, env);
    if (!activeSession) {
      throw new HttpError(
        403,
        "SESSION_REQUIRED",
        "An active interview session is required to use CrackFlow AI. Please start an interview session first."
      );
    }

    // 2b. Server-side session deadline & paid credit enforcement
    const nowMs = Date.now();
    const sessionStartMs = new Date(activeSession.startedAt).getTime();
    const elapsedSeconds = Math.max(0, Math.floor((nowMs - sessionStartMs) / 1000));
    if (elapsedSeconds >= entitledUser.remainingSeconds) {
      throw new HttpError(
        403,
        "USAGE_EXHAUSTED",
        "Your interview session has reached the allocated credit limit. Please end the session or purchase additional hours."
      );
    }

    // 3. If a specific sessionId is provided, strictly enforce ownership
    const reqSessionId = body?.sessionId || body?.payload?.sessionId;
    if (reqSessionId) {
      if (activeSession.sessionId !== reqSessionId) {
        const otherSession = await getSessionByIdFromFirestore(reqSessionId, env);
        if (otherSession && otherSession.uid !== entitledUser.uid) {
          throw new HttpError(403, "FORBIDDEN", "You do not own this interview session.");
        }
        throw new HttpError(403, "FORBIDDEN", "Invalid or inactive session ID.");
      }
    }
  }

  // ---------------------------------------------------------
  // GEMINI API CALL (Shared Provider Dispatch)
  // ---------------------------------------------------------
  const geminiKey = env.GEMINI_API_KEY;

  if (!geminiKey) {
    console.warn("[Worker AI] GEMINI_API_KEY not configured in worker secrets. Returning dev simulation response.");
    const simHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (screenReservation) {
      simHeaders["X-Screen-Solves-Remaining"] = screenReservation.remainingSolves.toString();
      simHeaders["X-Is-Unlimited"] = screenReservation.isUnlimited ? "true" : "false";
    }
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: "### Solution (Development Mode)\nGEMINI_API_KEY is not configured in worker secrets. Set GEMINI_API_KEY in .dev.vars to enable live AI responses.",
                },
              ],
            },
          },
        ],
      }),
      {
        status: 200,
        headers: simHeaders,
      }
    );
  }

  // Use requested model or default to ultra-low latency gemini-3.1-flash-lite
  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : "gemini-3.1-flash-lite";
  const stream = body.stream === true;
  const geminiPayload = body.payload || {
    contents: body.contents,
    generationConfig: body.generationConfig,
    systemInstruction: body.systemInstruction,
    safetySettings: body.safetySettings,
  };

  // Inject low-latency thinking budget control
  geminiPayload.generationConfig = {
    ...(geminiPayload.generationConfig || {}),
    thinkingConfig: {
      thinkingBudget: 0,
    },
  };

  const endpoint = stream
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${geminiKey}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

  let geminiRes: Response;
  try {
    geminiRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiPayload),
    });
  } catch (err: any) {
    console.error("[Worker AI] Unexpected error calling Gemini:", err);
    if (screenReservation && idempotencyKey && !screenReservation.alreadyReserved) {
      await refundScreenQuota(user.uid, idempotencyKey, "fetch_failed", env);
      updateCachedEntitlementScreenSolves(user.uid, screenReservation.remainingSolves + 1);
    }
    throw new HttpError(500, "INTERNAL_ERROR", "Failed to connect to AI provider.");
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text().catch(() => "");
    console.error("[Worker AI] Gemini API returned error:", geminiRes.status, errText);
    if (screenReservation && idempotencyKey && !screenReservation.alreadyReserved) {
      await refundScreenQuota(user.uid, idempotencyKey, `gemini_error_${geminiRes.status}`, env);
      updateCachedEntitlementScreenSolves(user.uid, screenReservation.remainingSolves + 1);
    }
    return new Response(errText, {
      status: geminiRes.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (stream) {
    // Pass-through Server-Sent Events stream with screenshot quota headers if applicable
    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    if (screenReservation) {
      headers.set("X-Screen-Solves-Remaining", screenReservation.remainingSolves.toString());
      headers.set("X-Is-Unlimited", screenReservation.isUnlimited ? "true" : "false");
    }
    return new Response(geminiRes.body, {
      status: 200,
      headers,
    });
  }

  const data = await geminiRes.json();
  const headers = new Headers({ "Content-Type": "application/json" });
  if (screenReservation) {
    headers.set("X-Screen-Solves-Remaining", screenReservation.remainingSolves.toString());
    headers.set("X-Is-Unlimited", screenReservation.isUnlimited ? "true" : "false");
  }
  return new Response(JSON.stringify(data), {
    status: 200,
    headers,
  });
}
