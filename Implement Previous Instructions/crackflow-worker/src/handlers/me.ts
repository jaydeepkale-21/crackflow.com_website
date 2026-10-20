import { DecodedFirebaseToken, Env, UserMeResponse, PackProductId } from "../types";
import { fetchUserFromFirestore } from "../lib/firestore";
import {
  PACK_CONFIGS,
  DEFAULT_MONTHLY_FAIR_USE_SECONDS,
  DEFAULT_YEARLY_FAIR_USE_SECONDS,
  DEFAULT_LIFETIME_FAIR_USE_SECONDS,
} from "../config/plans";
import { getCachedProfile, updateCachedEntitlement } from "../middleware/auth";

export async function handleMe(
  decodedToken: DecodedFirebaseToken,
  rawToken: string,
  env: Env,
  forceFresh: boolean = false
): Promise<Response> {
  const uid = decodedToken.uid;
  const isCached = !forceFresh && !!getCachedProfile(uid);
  let profile = isCached ? getCachedProfile(uid) : null;
  const cacheStatus = isCached ? "HIT" : "MISS";

  if (!profile) {
    try {
      profile = await fetchUserFromFirestore(uid, rawToken, env);
      if (profile) {
        updateCachedEntitlement(uid, profile);
      }
    } catch (err: any) {
      console.error(`[Worker /v1/me] Error fetching profile for ${uid}:`, err?.message || err);
    }
  }

  const planTier = profile?.planTier || "none";
  const subscriptionStatus = profile?.subscriptionStatus || "none";
  const isLifetime = profile?.lifetime === true || planTier === "lifetime";
  const now = Date.now();

  const isPack =
    profile?.accessType === "pack" ||
    ["interview_1h", "interview_6h", "interview_24h"].includes(planTier);
  const isSub =
    profile?.accessType === "subscription" ||
    ["monthly", "yearly", "starter", "pro", "lifetime"].includes(planTier);

  let accessType: "pack" | "subscription" | "none" = "none";
  let hasActiveAccess = false;
  let remainingSeconds = 0;
  let displayPlan = "Free";
  let expiresAt = profile?.currentPeriodEnd || profile?.packExpiresAt || null;
  let fairUseData = undefined;

  if (isPack) {
    accessType = "pack";
    const totalSec =
      profile?.packTotalSeconds ||
      (planTier === "interview_1h"
        ? 3600
        : planTier === "interview_6h"
        ? 21600
        : planTier === "interview_24h"
        ? 86400
        : 0);
    const usedSec = profile?.packUsedSeconds || 0;
    remainingSeconds = Math.max(0, totalSec - usedSec);

    const isPackExpired = profile?.packExpiresAt
      ? new Date(profile.packExpiresAt).getTime() < now
      : false;
    hasActiveAccess = remainingSeconds > 0 && !isPackExpired;

    const packId = profile?.packProductId as PackProductId | undefined;
    if (packId && PACK_CONFIGS[packId]) {
      displayPlan = PACK_CONFIGS[packId].displayName;
    } else if (planTier === "interview_1h") {
      displayPlan = "1 Hour";
    } else if (planTier === "interview_6h") {
      displayPlan = "6 Hours";
    } else if (planTier === "interview_24h") {
      displayPlan = "24 Hours / Whole Day";
    } else {
      displayPlan = `${Math.round(totalSec / 3600)} Hours`;
    }
  } else if (isSub) {
    accessType = "subscription";
    const isActive = subscriptionStatus === "active" || isLifetime;
    const isPeriodExpired =
      !isLifetime && profile?.currentPeriodEnd
        ? new Date(profile.currentPeriodEnd).getTime() < now
        : false;

    const defaultFairUse = isLifetime
      ? DEFAULT_LIFETIME_FAIR_USE_SECONDS
      : planTier === "yearly"
      ? DEFAULT_YEARLY_FAIR_USE_SECONDS
      : DEFAULT_MONTHLY_FAIR_USE_SECONDS;

    const fairUseTotal = profile?.subscriptionFairUseSeconds || defaultFairUse;
    let fairUseUsed = profile?.subscriptionUsedSeconds || 0;

    if (
      profile?.currentPeriodStart &&
      profile?.lastFairUseResetPeriod &&
      profile.lastFairUseResetPeriod !== profile.currentPeriodStart
    ) {
      fairUseUsed = 0;
    }

    remainingSeconds = Math.max(0, fairUseTotal - fairUseUsed);
    hasActiveAccess = isActive && !isPeriodExpired && remainingSeconds > 0;

    displayPlan = "Unlimited"; // Customer-facing display
    fairUseData = {
      totalSeconds: fairUseTotal,
      usedSeconds: fairUseUsed,
      remainingSeconds,
    };
  }

  // Screenshot AI Quota calculation
  let screenSolvesTotal = profile?.screenSolvesTotal ?? 0;
  let screenSolvesUsed = profile?.screenSolvesUsed ?? 0;
  let screenSolvesRemaining = profile?.screenSolvesRemaining ?? 0;
  let isUnlimitedSolves = profile?.isUnlimitedSolves ?? false;
  let screenshotAccessAllowed = false;
  let screenshotQuotaResetsAt: string | null = profile?.screenQuotaPeriodEnd || profile?.currentPeriodEnd || null;

  if (isPack) {
    if (screenSolvesTotal === 0 && profile?.screenSolvesRemaining === undefined) {
      const defaultQuota = planTier === "interview_1h" ? 234 : planTier === "interview_6h" ? 587 : planTier === "interview_24h" ? 1175 : 0;
      screenSolvesTotal = defaultQuota;
      screenSolvesRemaining = Math.max(0, defaultQuota - screenSolvesUsed);
    }
    const isPackExpired = profile?.packExpiresAt ? new Date(profile.packExpiresAt).getTime() < now : false;
    isUnlimitedSolves = false;
    screenshotAccessAllowed = !isPackExpired && screenSolvesRemaining > 0;
    screenshotQuotaResetsAt = profile?.packExpiresAt || null;
  } else if (isSub) {
    const isActive = subscriptionStatus === "active" || isLifetime;
    const isPeriodExpired = !isLifetime && profile?.currentPeriodEnd ? new Date(profile.currentPeriodEnd).getTime() < now : false;
    isUnlimitedSolves = true;
    if (screenSolvesTotal === 0 && profile?.screenSolvesRemaining === undefined) {
      const defaultQuota = planTier === "yearly" || isLifetime ? 5880 : 1175;
      screenSolvesTotal = defaultQuota;
      screenSolvesRemaining = Math.max(0, defaultQuota - screenSolvesUsed);
    }
    // Period renewal check: only reset if renewed period is reflected in profile.currentPeriodStart
    if (
      profile?.currentPeriodStart &&
      profile?.screenQuotaPeriodStart &&
      profile.screenQuotaPeriodStart !== profile.currentPeriodStart
    ) {
      const defaultQuota = planTier === "yearly" || isLifetime ? 5880 : 1175;
      screenSolvesRemaining = defaultQuota;
      screenSolvesUsed = 0;
    }
    screenshotAccessAllowed = isActive && !isPeriodExpired && screenSolvesRemaining > 0;
    screenshotQuotaResetsAt = isLifetime ? null : (profile?.currentPeriodEnd || null);
  }

  const responseData: UserMeResponse = {
    uid,
    email: decodedToken.email || profile?.email || "",
    displayName: profile?.displayName || decodedToken.name || undefined,
    planTier,
    subscriptionStatus,
    hasActiveAccess,
    expiresAt,
    accessType,
    remainingSeconds,
    displayPlan,
    fairUse: fairUseData,
    screenSolvesTotal,
    screenSolvesUsed,
    screenSolvesRemaining,
    isUnlimitedSolves,
    screenshotAccessAllowed,
    screenshotQuotaResetsAt,
  };

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-Entitlement-Cache": cacheStatus,
    },
  });
}

