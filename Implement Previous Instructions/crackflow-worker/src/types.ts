export interface Env {
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGIN?: string;
  FIREBASE_SERVICE_ACCOUNT_JSON?: string;
  DEEPGRAM_API_KEY?: string;
  GEMINI_API_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_STARTER_PRICE_ID?: string;
  STRIPE_PRO_PRICE_ID?: string;
  STRIPE_LIFETIME_PRICE_ID?: string;
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

export interface FirestoreUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  planTier: "none" | "starter" | "pro" | "lifetime";
  subscriptionStatus: "none" | "active" | "canceled" | "past_due" | "expired";
  paymentProvider: "dummy" | "stripe" | "razorpay" | "none";
  customerId: string | null;
  subscriptionId: string | null;
  lifetime: boolean;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface UserMeResponse {
  uid: string;
  email: string;
  displayName?: string;
  planTier: "none" | "starter" | "pro" | "lifetime";
  subscriptionStatus: "none" | "active" | "canceled" | "past_due" | "expired";
  hasActiveAccess: boolean;
  expiresAt?: string | null;
}

export interface InterviewStartResponse {
  allowed: boolean;
  hasActiveAccess: boolean;
  planTier: string;
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
}
