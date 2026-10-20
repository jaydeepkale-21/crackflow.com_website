import { EntitledUser, Env, InterviewSessionDoc } from "../types";
import {
  getActiveSessionFromFirestore,
  createSessionInFirestore,
  updateSessionInFirestore,
  atomicIncrementUsage,
} from "../lib/firestore";
import { STALE_SESSION_TIMEOUT_SECONDS } from "../config/plans";
import { HttpError, invalidateEntitlementCache } from "../middleware/auth";

/**
 * POST /v1/interview/start
 * Authorizes starting an interview.
 *
 * 1. Checks remainingSeconds > 0
 * 2. Checks if an active session already exists (prevents concurrent sessions)
 * 3. Handles stale sessions (>= 15 min without activity) gracefully
 * 4. Creates a new session document in Firestore
 * 5. Returns sessionId and server-authoritative remainingSeconds
 */
export async function handleInterviewStart(
  entitledUser: EntitledUser,
  env: Env,
  deviceId?: string
): Promise<Response> {
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Check for active concurrent session
  try {
    const existingSession = await getActiveSessionFromFirestore(entitledUser.uid, env);
    if (existingSession) {
      const lastActive = new Date(
        existingSession.lastHeartbeatAt || existingSession.startedAt
      ).getTime();
      const ageSeconds = Math.max(0, (now.getTime() - lastActive) / 1000);

      if (ageSeconds >= STALE_SESSION_TIMEOUT_SECONDS) {
        // Stale session (e.g. app crashed or laptop was closed)
        console.warn(
          `⚠️ [Interview] Found stale session ${existingSession.sessionId} for user ${entitledUser.uid} (age: ${Math.round(ageSeconds)}s). Marking abandoned.`
        );
        // Atomically deduct the time spent before it stalled (capped at STALE_SESSION_TIMEOUT_SECONDS)
        const durationToDeduct = Math.min(Math.round(ageSeconds), STALE_SESSION_TIMEOUT_SECONDS);
        await atomicIncrementUsage(
          entitledUser.uid,
          existingSession.accessType,
          durationToDeduct,
          env
        ).catch(() => {});

        // Invalidate cached entitlement so user balance reflects stale deduction
        invalidateEntitlementCache(entitledUser.uid);

        await updateSessionInFirestore(
          existingSession.sessionId,
          {
            status: "abandoned",
            endedAt: nowIso,
            durationSeconds: durationToDeduct,
            updatedAt: nowIso,
          },
          env
        ).catch(() => {});
      } else {
        // Session is genuinely active on another device/tab! Prevent concurrent session
        console.warn(
          `🚫 [Interview] Blocked concurrent session start for user ${entitledUser.uid}. Active session: ${existingSession.sessionId}`
        );
        throw new HttpError(
          409,
          "SESSION_ALREADY_ACTIVE",
          "An active interview session is already running on another device or tab. Please end that session before starting a new one.",
          {
            activeSessionId: existingSession.sessionId,
            startedAt: existingSession.startedAt,
          }
        );
      }
    }
  } catch (err: any) {
    if (err instanceof HttpError) throw err;
    console.warn("[Interview] Error checking active session:", err?.message || err);
  }

  // 2. Create new authoritative interview session
  const sessionId = "sess_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const newSession: InterviewSessionDoc = {
    sessionId,
    uid: entitledUser.uid,
    accessType: entitledUser.accessType,
    startedAt: nowIso,
    lastHeartbeatAt: nowIso,
    status: "active",
    deviceId: deviceId || null,
    packId: entitledUser.profile?.packProductId || null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await createSessionInFirestore(newSession, env);
  console.log(
    `✅ [Interview] Session ${sessionId} started for user ${entitledUser.uid} (${entitledUser.accessType}, remaining: ${entitledUser.remainingSeconds}s)`
  );

  return new Response(
    JSON.stringify({
      allowed: true,
      hasActiveAccess: true,
      planTier: entitledUser.planTier,
      sessionId,
      remainingSeconds: entitledUser.remainingSeconds,
      accessType: entitledUser.accessType,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

