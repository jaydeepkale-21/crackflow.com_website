import { EntitledUser } from "../types";

/**
 * POST /v1/interview/start
 * Authorizes starting an interview.
 * Only users with active paid entitlement (Starter/Pro/Lifetime) can start an interview.
 */
export function handleInterviewStart(entitledUser: EntitledUser): Response {
  return new Response(
    JSON.stringify({
      allowed: true,
      hasActiveAccess: true,
      planTier: entitledUser.planTier,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
