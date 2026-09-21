import { DecodedFirebaseToken, Env, UserMeResponse } from "../types";
import { fetchUserFromFirestore } from "../lib/firestore";

export async function handleMe(
  decodedToken: DecodedFirebaseToken,
  rawToken: string,
  env: Env
): Promise<Response> {
  const uid = decodedToken.uid;
  let profile = null;

  try {
    profile = await fetchUserFromFirestore(uid, rawToken, env);
  } catch (err: any) {
    console.error(`[Worker /v1/me] Error fetching profile for ${uid}:`, err?.message || err);
  }

  const planTier = profile?.planTier || "none";
  const subscriptionStatus = profile?.subscriptionStatus || "none";
  const isLifetime = profile?.lifetime === true || planTier === "lifetime";
  const isActive = subscriptionStatus === "active" || isLifetime;
  const hasActiveAccess = isActive && ["starter", "pro", "lifetime"].includes(planTier);

  const responseData: UserMeResponse = {
    uid,
    email: decodedToken.email || profile?.email || "",
    displayName: profile?.displayName || decodedToken.name || undefined,
    planTier,
    subscriptionStatus,
    hasActiveAccess,
    expiresAt: profile?.currentPeriodEnd || null,
  };

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
