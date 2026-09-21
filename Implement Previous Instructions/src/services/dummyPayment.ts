import { updateUserProfile, UserProfileData } from "./firestore";

export interface DummyPaymentResult {
  success: boolean;
  message: string;
  planId: "starter" | "pro" | "lifetime";
  updatedFields: Partial<UserProfileData>;
}

/**
 * DEVELOPMENT-ONLY Dummy Plan Selection Service.
 * Simulates payment processing without contacting Stripe or Razorpay.
 * Updates Firestore user document directly for dev/test verification.
 */
export async function processDummyPayment(
  uid: string,
  planId: "starter" | "pro" | "lifetime"
): Promise<DummyPaymentResult> {
  const now = new Date();
  const currentPeriodStart = now.toISOString();

  let currentPeriodEnd: string | null = null;
  let isLifetime = false;

  if (planId === "lifetime") {
    isLifetime = true;
    currentPeriodEnd = null;
  } else {
    // 1 Month subscription period for Starter & Pro
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    currentPeriodEnd = nextMonth.toISOString();
  }

  const updatedFields: Partial<UserProfileData> = {
    planTier: planId,
    subscriptionStatus: "active",
    paymentProvider: "dummy",
    lifetime: isLifetime,
    currentPeriodStart,
    currentPeriodEnd,
  };

  await updateUserProfile(uid, updatedFields);

  return {
    success: true,
    message: `Demo Mode — Payment simulation only (No real payment charged). Account upgraded to ${planId.toUpperCase()}!`,
    planId,
    updatedFields,
  };
}
