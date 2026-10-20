export interface Env {
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGIN?: string;
  FIREBASE_SERVICE_ACCOUNT_JSON?: string;
  DEEPGRAM_API_KEY?: string;
  DEEPGRAM_API_KEY_2?: string;
  DEEPGRAM_API_KEY_3?: string;
  GEMINI_API_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_STARTER_PRICE_ID?: string;
  STRIPE_PRO_PRICE_ID?: string;
  STRIPE_LIFETIME_PRICE_ID?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  RAZORPAY_WEBHOOK_SECRET?: string;
}

export interface DecodedFirebaseToken {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  iss: string;
  aud: string;
  auth_time: number;
  sub: string;
  iat: number;
  exp: number;
  [key: string]: any;
}

export type PackProductId = "INTERVIEW_1H" | "INTERVIEW_6H" | "INTERVIEW_24H";
export type SubscriptionProductId = "MONTHLY" | "YEARLY";
export type PlanTierType =
  | "none"
  | "starter"
  | "pro"
  | "lifetime"
  | "interview_1h"
  | "interview_6h"
  | "interview_24h"
  | "monthly"
  | "yearly";

export interface FirestoreUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  planTier: PlanTierType;
  subscriptionStatus: "none" | "active" | "canceled" | "past_due" | "expired";
  paymentProvider: "dummy" | "stripe" | "razorpay" | "none";
  customerId: string | null;
  subscriptionId: string | null;
  lifetime: boolean;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;

  // Time & Credit Access fields
  accessType?: "pack" | "subscription" | "none";
  packProductId?: PackProductId | null;
  packTotalSeconds?: number;
  packUsedSeconds?: number;
  packExpiresAt?: string | null;
  packPurchasedAt?: string | null;

  // Subscription Fair-Use tracking
  subscriptionFairUseSeconds?: number;
  subscriptionUsedSeconds?: number;
  lastFairUseResetPeriod?: string | null;

  // Screenshot AI Quota tracking
  screenSolvesTotal?: number;
  screenSolvesUsed?: number;
  screenSolvesRemaining?: number;
  isUnlimitedSolves?: boolean;
  screenQuotaPeriodStart?: string | null;
  screenQuotaPeriodEnd?: string | null;
  lastScreenshotReservation?: {
    idempotencyKey: string;
    reservedAt: string;
    status: "reserved" | "refunded" | "finalized";
  } | null;
}

export interface UserMeResponse {
  uid: string;
  email: string;
  displayName?: string;
  planTier: PlanTierType;
  subscriptionStatus: "none" | "active" | "canceled" | "past_due" | "expired";
  hasActiveAccess: boolean;
  expiresAt?: string | null;
  // Extended fields for time-based access
  accessType?: "pack" | "subscription" | "none";
  remainingSeconds?: number;
  displayPlan?: string;
  fairUse?: {
    totalSeconds: number;
    usedSeconds: number;
    remainingSeconds: number;
  };
  // Screenshot AI Quota fields
  screenSolvesTotal?: number;
  screenSolvesUsed?: number;
  screenSolvesRemaining?: number;
  isUnlimitedSolves: boolean;
  screenshotAccessAllowed: boolean;
  screenshotQuotaResetsAt?: string | null;
}

export interface InterviewStartResponse {
  allowed: boolean;
  hasActiveAccess: boolean;
  planTier: string;
  sessionId: string;
  remainingSeconds: number;
  accessType: "pack" | "subscription";
}

export interface SessionEndResponse {
  success: boolean;
  sessionId: string;
  usedSeconds: number;
  remainingSeconds: number;
  status: "completed" | "expired" | "already_ended";
}

export interface SttTokenResponse {
  token: string;
  expiresInSeconds: number;
}

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  decoded: DecodedFirebaseToken;
  rawToken: string;
}

export interface EntitledUser extends AuthenticatedUser {
  profile: FirestoreUserProfile | null;
  hasActiveAccess: boolean;
  planTier: string;
  accessType: "pack" | "subscription";
  remainingSeconds: number;
  cacheStatus?: string;
  screenSolvesRemaining: number;
  isUnlimitedSolves: boolean;
  screenshotAccessAllowed: boolean;
}

export interface InterviewSessionDoc {
  sessionId: string;
  uid: string;
  accessType: "pack" | "subscription";
  startedAt: string;
  lastHeartbeatAt: string;
  endedAt?: string | null;
  status: "active" | "completed" | "expired" | "abandoned";
  durationSeconds?: number;
  deviceId?: string | null;
  packId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyApiUsageDoc {
  uid: string;
  date: string;
  totalApiCalls: number;
  aiCompleteCalls: number;
  sttTokenCalls: number;
  interviewStartCalls: number;
  sessionEndCalls: number;
  meCalls: number;
  rejectedCalls: number;
  rateLimitedCalls: number;
  updatedAt: string;
}

