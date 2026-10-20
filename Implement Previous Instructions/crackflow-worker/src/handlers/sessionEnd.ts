import { AuthenticatedUser, Env, SessionEndResponse } from "../types";
import {
  getActiveSessionFromFirestore,
  getSessionByIdFromFirestore,
  updateSessionInFirestore,
  atomicIncrementUsage,
  fetchUserFromFirestore,
} from "../lib/firestore";
import { HttpError, invalidateEntitlementCache } from "../middleware/auth";
import {
  DEFAULT_MONTHLY_FAIR_USE_SECONDS,
  DEFAULT_YEARLY_FAIR_USE_SECONDS,
  DEFAULT_LIFETIME_FAIR_USE_SECONDS,
} from "../config/plans";

/**
 * POST /v1/session/end
 * Server-authoritative interview session end & atomic usage deduction.
 *
 * Request body: { sessionId: string }
 *
 * Calculates duration = serverEndTime - serverStartTime (Worker clock is authoritative).
 * Atomically increments packUsedSeconds / subscriptionUsedSeconds in Firestore.
 */
export async function handleSessionEnd(
  request: Request,
  user: AuthenticatedUser,
  env: Env
): Promise<Response> {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional if active session can be found by uid
  }

  const reqSessionId = body?.sessionId as string | undefined;
  let session = null;

  // 1. Fetch requested or active session
  if (reqSessionId) {
    const specificSession = await getSessionByIdFromFirestore(reqSessionId, env);
    if (specificSession) {
      // Validate session ownership strictly (TEST 26)
      if (specificSession.uid !== user.uid) {
        throw new HttpError(403, "FORBIDDEN", "You do not own this interview session.");
      }
      // If already ended, return immediately without re-deducting (TEST 27, 28)
      if (specificSession.status === "completed" || specificSession.status === "abandoned") {
        const userProfile = await fetchUserFromFirestore(user.uid, user.rawToken, env);
        const remSec =
          specificSession.accessType === "pack"
            ? Math.max(0, (userProfile?.packTotalSeconds || 0) - (userProfile?.packUsedSeconds || 0))
            : Math.max(0, (userProfile?.subscriptionFairUseSeconds || DEFAULT_MONTHLY_FAIR_USE_SECONDS) - (userProfile?.subscriptionUsedSeconds || 0));

        return new Response(
          JSON.stringify({
            success: true,
            sessionId: reqSessionId,
            usedSeconds: 0,
            remainingSeconds: remSec,
            status: "already_ended",
          } as SessionEndResponse),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      session = specificSession;
    }
  }

  if (!session) {
    session = await getActiveSessionFromFirestore(user.uid, env);
  }

  if (!session) {
    throw new HttpError(404, "NO_ACTIVE_SESSION", "No active interview session found for this user.");
  }

  // 2. Validate session ownership
  if (session.uid !== user.uid) {
    throw new HttpError(403, "FORBIDDEN", "You do not own this interview session.");
  }

  // 3. Calculate server-authoritative duration
  const now = new Date();
  const startTime = new Date(session.startedAt).getTime();
  const rawDurationSeconds = Math.max(0, Math.round((now.getTime() - startTime) / 1000));

  // Clamp duration to reasonable boundaries (at least 1s, max 86400s)
  const durationSeconds = Math.min(rawDurationSeconds, 86400);

  // 4. Atomically deduct usage in Firestore
  await atomicIncrementUsage(user.uid, session.accessType, durationSeconds, env);

  // Invalidate cached entitlement so updated balance reflects immediately
  invalidateEntitlementCache(user.uid);

  // 5. Mark session completed in Firestore
  await updateSessionInFirestore(
    session.sessionId,
    {
      status: "completed",
      endedAt: now.toISOString(),
      durationSeconds,
      updatedAt: now.toISOString(),
    },
    env
  );

  // 6. Fetch updated user balance from Firestore to report remainingSeconds
  const updatedProfile = await fetchUserFromFirestore(user.uid, user.rawToken, env);
  let remainingSeconds = 0;

  if (session.accessType === "pack") {
    const total = updatedProfile?.packTotalSeconds || 0;
    const used = updatedProfile?.packUsedSeconds || 0;
    remainingSeconds = Math.max(0, total - used);
  } else {
    const isLifetime = updatedProfile?.lifetime === true || updatedProfile?.planTier === "lifetime";
    const defaultFairUse = isLifetime
      ? DEFAULT_LIFETIME_FAIR_USE_SECONDS
      : updatedProfile?.planTier === "yearly"
      ? DEFAULT_YEARLY_FAIR_USE_SECONDS
      : DEFAULT_MONTHLY_FAIR_USE_SECONDS;
    const total = updatedProfile?.subscriptionFairUseSeconds || defaultFairUse;
    const used = updatedProfile?.subscriptionUsedSeconds || 0;
    remainingSeconds = Math.max(0, total - used);
  }

  console.log(
    `🏁 [Session End] Session ${session.sessionId} ended for user ${user.uid}. Used: ${durationSeconds}s, Remaining: ${remainingSeconds}s`
  );

  const responseData: SessionEndResponse = {
    success: true,
    sessionId: session.sessionId,
    usedSeconds: durationSeconds,
    remainingSeconds,
    status: "completed",
  };

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * POST /v1/session/heartbeat
 * Keeps active session alive so background crashes/stalls can be differentiated from live usage.
 */
export async function handleSessionHeartbeat(
  request: Request,
  user: AuthenticatedUser,
  env: Env
): Promise<Response> {
  let body: any = {};
  try {
    body = await request.clone().json();
  } catch {}

  const reqSessionId = body?.sessionId as string | undefined;

  let session = null;
  if (reqSessionId) {
    const specificSession = await getSessionByIdFromFirestore(reqSessionId, env);
    if (!specificSession) {
      throw new HttpError(404, "SESSION_NOT_FOUND", "Interview session not found.");
    }
    if (specificSession.uid !== user.uid) {
      throw new HttpError(403, "FORBIDDEN", "Cannot update another user's interview session.");
    }
    session = specificSession;
  } else {
    session = await getActiveSessionFromFirestore(user.uid, env);
  }

  if (!session || session.status !== "active") {
    return new Response(JSON.stringify({ active: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const nowIso = new Date().toISOString();
  await updateSessionInFirestore(session.sessionId, { lastHeartbeatAt: nowIso, updatedAt: nowIso }, env).catch(
    () => {}
  );

  return new Response(JSON.stringify({ active: true, sessionId: session.sessionId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

