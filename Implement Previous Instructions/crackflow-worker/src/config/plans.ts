import { PackProductId, SubscriptionProductId } from "../types";

export interface PackConfig {
  productId: PackProductId;
  displayName: string;
  totalSeconds: number;
  screenSolvesQuota: number; // Screenshot AI solves granted with pack
  validityDays: number;
  razorpayAmount: number; // in paise (e.g. 19900 = ₹199)
  currency: string;
}

export interface SubscriptionConfig {
  productId: SubscriptionProductId;
  displayName: string;
  defaultFairUseSeconds: number;
  screenSolvesQuota: number; // Screenshot AI solves granted per subscription cycle
  billingPeriodDays: number;
  razorpayAmount: number;
  currency: string;
}

// ─── Centralized Screenshot Quota Mapping ─────────────────────────────────────
export const SCREEN_SOLVES_QUOTAS: Record<string, number> = {
  INTERVIEW_1H: 234,
  INTERVIEW_6H: 587,
  INTERVIEW_24H: 1175,
  MONTHLY: 1175,
  YEARLY: 5880,
};

// ─── Pack Definitions ─────────────────────────────────────────────────────────
export const PACK_CONFIGS: Record<PackProductId, PackConfig> = {
  INTERVIEW_1H: {
    productId: "INTERVIEW_1H",
    displayName: "1 Hour",
    totalSeconds: 3600, // 60 minutes of actual interview usage
    screenSolvesQuota: 234,
    validityDays: 30, // 30-day calendar validity window
    razorpayAmount: 19900, // ₹199
    currency: "INR",
  },
  INTERVIEW_6H: {
    productId: "INTERVIEW_6H",
    displayName: "6 Hours",
    totalSeconds: 21600, // 360 minutes
    screenSolvesQuota: 587,
    validityDays: 90, // 90-day calendar validity window
    razorpayAmount: 49900, // ₹499
    currency: "INR",
  },
  INTERVIEW_24H: {
    productId: "INTERVIEW_24H",
    displayName: "24 Hours / Whole Day",
    totalSeconds: 86400, // 24 hours of actual interview usage
    screenSolvesQuota: 1175,
    validityDays: 180, // 180-day calendar validity window
    razorpayAmount: 99900, // ₹999
    currency: "INR",
  },
};

// ─── Subscription Definitions (Customer-facing: "Unlimited") ──────────────────
export const SUBSCRIPTION_CONFIGS: Record<SubscriptionProductId, SubscriptionConfig> = {
  MONTHLY: {
    productId: "MONTHLY",
    displayName: "Unlimited", // Customer facing
    defaultFairUseSeconds: 180000, // 50 hours of interview time per month (internal fair use)
    screenSolvesQuota: 1175, // Internal FUP quota per billing month
    billingPeriodDays: 30,
    razorpayAmount: 99900, // ₹999/month
    currency: "INR",
  },
  YEARLY: {
    productId: "YEARLY",
    displayName: "Unlimited", // Customer facing
    defaultFairUseSeconds: 2160000, // 600 hours of interview time per year (internal fair use)
    screenSolvesQuota: 5880, // Internal FUP quota per billing year
    billingPeriodDays: 365,
    razorpayAmount: 499900, // ₹4999/year
    currency: "INR",
  },
};

// ─── Centralized Fair-Use Configuration ───────────────────────────────────────
export const DEFAULT_MONTHLY_FAIR_USE_SECONDS = 180000; // 50 hours
export const DEFAULT_YEARLY_FAIR_USE_SECONDS = 2160000; // 600 hours
export const DEFAULT_LIFETIME_FAIR_USE_SECONDS = 36000000; // 10,000 hours (effectively lifetime)

// ─── Session Heartbeat & Timeouts ─────────────────────────────────────────────
// Desktop app sends heartbeat every 3 minutes (180 seconds = 180,000 ms)
export const HEARTBEAT_INTERVAL_SECONDS = 180; // 3 minutes
export const HEARTBEAT_INTERVAL_MS = 180 * 1000; // 180,000 ms

// If no end/heartbeat received within 15 minutes, session is considered abandoned/stale
export const STALE_SESSION_TIMEOUT_SECONDS = 15 * 60; // 900 seconds
export const STALE_SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 900,000 ms

// Bounded fallback cache TTL for worker memory entitlement cache
export const DEFAULT_AUTH_CACHE_TTL_MS = 60 * 1000; // 60,000 ms (60 seconds)

