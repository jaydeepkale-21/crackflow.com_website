import { AuthenticatedUser, Env, FirestoreUserProfile } from "../types";
import {
  fetchUserFromFirestore,
  updateUserInFirestore,
  checkWebhookEventProcessed,
  recordWebhookEvent,
  getUserByCustomerId,
} from "../lib/firestore";
import { HttpError, invalidateEntitlementCache } from "../middleware/auth";

import {
  DEFAULT_MONTHLY_FAIR_USE_SECONDS,
  DEFAULT_YEARLY_FAIR_USE_SECONDS,
  DEFAULT_LIFETIME_FAIR_USE_SECONDS,
  SCREEN_SOLVES_QUOTAS,
} from "../config/plans";

type PlanTier =
  | "starter"
  | "pro"
  | "lifetime"
  | "INTERVIEW_1H"
  | "INTERVIEW_6H"
  | "INTERVIEW_24H"
  | "MONTHLY"
  | "YEARLY";

export const RAZORPAY_PLAN_AMOUNTS: Record<string, { amount: number; currency: string; name: string }> = {
  INTERVIEW_1H: { amount: 19900, currency: "INR", name: "CrackFlow 2 Minutes Test Pack" },
  INTERVIEW_6H: { amount: 49900, currency: "INR", name: "CrackFlow 6 Hours Interview Pack" },
  INTERVIEW_24H: { amount: 99900, currency: "INR", name: "CrackFlow 24 Hours / Whole Day Pack" },
  MONTHLY: { amount: 99900, currency: "INR", name: "CrackFlow Unlimited Monthly Subscription" },
  YEARLY: { amount: 499900, currency: "INR", name: "CrackFlow Unlimited Yearly Subscription" },
  // Backward compatibility
  starter: { amount: 49900, currency: "INR", name: "CrackFlow Starter Plan (Monthly)" },
  pro: { amount: 99900, currency: "INR", name: "CrackFlow Pro Plan (Monthly)" },
  lifetime: { amount: 499900, currency: "INR", name: "CrackFlow Lifetime Access" },
};

/**
 * Constant-time comparison for hex signature strings
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Computes HMAC-SHA256 hex string using Web Crypto
 */
async function computeHmacSha256Hex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Maps planId to Stripe Price ID from server environment.
 */
function getPriceIdForPlan(planId: string, env: Env): { priceId: string; mode: "subscription" | "payment" } {
  if (planId === "starter" || planId === "INTERVIEW_1H") {
    if (!env.STRIPE_STARTER_PRICE_ID) {
      throw new HttpError(500, "STRIPE_NOT_CONFIGURED", "Stripe Starter price ID is not configured.");
    }
    return { priceId: env.STRIPE_STARTER_PRICE_ID, mode: "subscription" };
  }

  if (planId === "pro" || planId === "MONTHLY" || planId === "INTERVIEW_6H") {
    if (!env.STRIPE_PRO_PRICE_ID) {
      throw new HttpError(500, "STRIPE_NOT_CONFIGURED", "Stripe Pro price ID is not configured.");
    }
    return { priceId: env.STRIPE_PRO_PRICE_ID, mode: "subscription" };
  }

  if (planId === "lifetime" || planId === "YEARLY" || planId === "INTERVIEW_24H") {
    if (!env.STRIPE_LIFETIME_PRICE_ID) {
      throw new HttpError(500, "STRIPE_NOT_CONFIGURED", "Stripe Lifetime price ID is not configured.");
    }
    return { priceId: env.STRIPE_LIFETIME_PRICE_ID, mode: "payment" };
  }

  throw new HttpError(400, "INVALID_PLAN", "Invalid or unsupported plan selected.");
}

/**
 * Resolves plan tier from Stripe Price ID or metadata
 */
function resolvePlanFromPriceId(priceId: string | undefined, env: Env): any {
  if (priceId && priceId === env.STRIPE_LIFETIME_PRICE_ID) return "lifetime";
  if (priceId && priceId === env.STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId && priceId === env.STRIPE_STARTER_PRICE_ID) return "starter";
  return "starter";
}

/**
 * Verifies Stripe Webhook Signature Header
 */
async function verifyStripeSignature(rawBody: string, signatureHeader: string | null, secret: string): Promise<boolean> {
  if (!signatureHeader || !secret) return false;

  const parts = signatureHeader.split(",");
  let timestamp = "";
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, val] = part.trim().split("=");
    if (key === "t") timestamp = val;
    if (key === "v1") signatures.push(val);
  }

  if (!timestamp || signatures.length === 0) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  const tsNum = parseInt(timestamp, 10);
  if (isNaN(tsNum) || Math.abs(nowSec - tsNum) > 300) {
    console.warn(`[Stripe Webhook] Timestamp delta too large: now=${nowSec}, event=${tsNum}`);
    return false;
  }

  const payloadToSign = `${timestamp}.${rawBody}`;
  const expectedSig = await computeHmacSha256Hex(secret, payloadToSign);

  return signatures.some((sig) => safeEqual(sig, expectedSig));
}


/**
 * Centrally grants entitlement in Firestore for both payment verification and webhooks.
 * Safely handles multi-pack purchases by aggregating existing remaining balance.
 */
export async function grantPurchasedEntitlement(
  uid: string,
  planId: string,
  paymentId: string,
  env: Env
): Promise<{ planTier: string; expiresAt: string | null; remainingSeconds: number }> {
  const now = new Date();
  const currentProfile = await fetchUserFromFirestore(uid, "", env);

  const isPack = ["INTERVIEW_1H", "INTERVIEW_6H", "INTERVIEW_24H"].includes(planId);
  const isMonthly = planId === "MONTHLY" || planId === "starter" || planId === "pro";
  const isYearly = planId === "YEARLY";
  const isLifetime = planId === "lifetime";

  let updates: Partial<FirestoreUserProfile> = {};
  let expiresAt: string | null = null;
  let remainingSeconds = 0;
  const finalPlanTier = planId.toLowerCase() as any;

  if (isPack) {
    const packSeconds = planId === "INTERVIEW_1H" ? 3600 : planId === "INTERVIEW_6H" ? 21600 : 86400;
    const validityDays = planId === "INTERVIEW_1H" ? 30 : planId === "INTERVIEW_6H" ? 90 : 180;
    const newExpiryDate = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

    // Multi-pack purchase handling: aggregate existing balance safely (Requirement 18)
    const existingTotal = currentProfile?.packTotalSeconds || 0;
    const existingUsed = currentProfile?.packUsedSeconds || 0;
    const existingRemaining = Math.max(0, existingTotal - existingUsed);

    const updatedTotal = existingRemaining + packSeconds;
    remainingSeconds = updatedTotal;

    // Extend calendar expiration date to whichever is further in the future
    let finalExpiry = newExpiryDate.toISOString();
    if (currentProfile?.packExpiresAt) {
      const existingExpiryMs = new Date(currentProfile.packExpiresAt).getTime();
      if (existingExpiryMs > newExpiryDate.getTime()) {
        finalExpiry = currentProfile.packExpiresAt;
      }
    }
    expiresAt = finalExpiry;

    // Screenshot solves quota allocation
    const packSolvesQuota =
      SCREEN_SOLVES_QUOTAS[planId as keyof typeof SCREEN_SOLVES_QUOTAS] ||
      (planId === "INTERVIEW_1H" ? 234 : planId === "INTERVIEW_6H" ? 587 : 1175);
    const existingSolvesRemaining = currentProfile?.screenSolvesRemaining || 0;
    const existingSolvesTotal = currentProfile?.screenSolvesTotal || 0;
    const updatedSolvesRemaining = existingSolvesRemaining + packSolvesQuota;
    const updatedSolvesTotal = existingSolvesTotal + packSolvesQuota;

    updates = {
      planTier: finalPlanTier,
      accessType: "pack",
      packProductId: planId as any,
      packTotalSeconds: updatedTotal,
      packUsedSeconds: 0, // Reset counter since packTotalSeconds now holds the aggregate remaining
      packExpiresAt: finalExpiry,
      packPurchasedAt: now.toISOString(),
      subscriptionStatus: "active",
      paymentProvider: "razorpay",
      subscriptionId: paymentId,
      customerId: uid,
      lifetime: false,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: finalExpiry,
      screenSolvesTotal: updatedSolvesTotal,
      screenSolvesRemaining: updatedSolvesRemaining,
      screenSolvesUsed: currentProfile?.screenSolvesUsed || 0,
      isUnlimitedSolves: false,
      screenQuotaPeriodStart: now.toISOString(),
      screenQuotaPeriodEnd: finalExpiry,
      updatedAt: now.toISOString(),
    };
  } else if (isMonthly) {
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    expiresAt = periodEnd;
    remainingSeconds = DEFAULT_MONTHLY_FAIR_USE_SECONDS;
    const subSolvesQuota = SCREEN_SOLVES_QUOTAS.MONTHLY; // 1175
    updates = {
      planTier: planId === "MONTHLY" ? "monthly" : (planId as any),
      accessType: "subscription",
      subscriptionStatus: "active",
      subscriptionFairUseSeconds: DEFAULT_MONTHLY_FAIR_USE_SECONDS,
      subscriptionUsedSeconds: 0,
      paymentProvider: "razorpay",
      subscriptionId: paymentId,
      customerId: uid,
      lifetime: false,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd,
      lastFairUseResetPeriod: now.toISOString(),
      screenSolvesTotal: subSolvesQuota,
      screenSolvesRemaining: subSolvesQuota,
      screenSolvesUsed: 0,
      isUnlimitedSolves: true,
      screenQuotaPeriodStart: now.toISOString(),
      screenQuotaPeriodEnd: periodEnd,
      updatedAt: now.toISOString(),
    };
  } else if (isYearly) {
    const periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
    expiresAt = periodEnd;
    remainingSeconds = DEFAULT_YEARLY_FAIR_USE_SECONDS;
    const subSolvesQuota = SCREEN_SOLVES_QUOTAS.YEARLY; // 5880
    updates = {
      planTier: "yearly",
      accessType: "subscription",
      subscriptionStatus: "active",
      subscriptionFairUseSeconds: DEFAULT_YEARLY_FAIR_USE_SECONDS,
      subscriptionUsedSeconds: 0,
      paymentProvider: "razorpay",
      subscriptionId: paymentId,
      customerId: uid,
      lifetime: false,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd,
      lastFairUseResetPeriod: now.toISOString(),
      screenSolvesTotal: subSolvesQuota,
      screenSolvesRemaining: subSolvesQuota,
      screenSolvesUsed: 0,
      isUnlimitedSolves: true,
      screenQuotaPeriodStart: now.toISOString(),
      screenQuotaPeriodEnd: periodEnd,
      updatedAt: now.toISOString(),
    };
  } else if (isLifetime) {
    expiresAt = null;
    remainingSeconds = DEFAULT_LIFETIME_FAIR_USE_SECONDS;
    const subSolvesQuota = SCREEN_SOLVES_QUOTAS.lifetime; // 5880
    updates = {
      planTier: "lifetime",
      accessType: "subscription",
      subscriptionStatus: "active",
      subscriptionFairUseSeconds: DEFAULT_LIFETIME_FAIR_USE_SECONDS,
      subscriptionUsedSeconds: 0,
      paymentProvider: "razorpay",
      subscriptionId: paymentId,
      customerId: uid,
      lifetime: true,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: null,
      screenSolvesTotal: subSolvesQuota,
      screenSolvesRemaining: subSolvesQuota,
      screenSolvesUsed: 0,
      isUnlimitedSolves: true,
      screenQuotaPeriodStart: now.toISOString(),
      screenQuotaPeriodEnd: null,
      updatedAt: now.toISOString(),
    };
  }

  await updateUserInFirestore(uid, updates, env);
  invalidateEntitlementCache(uid);
  console.log(`💳 [Billing] Entitlement granted for ${uid}: ${planId} (${remainingSeconds}s total, ${updates.screenSolvesRemaining} screen solves)`);
  return { planTier: updates.planTier || planId, expiresAt, remainingSeconds };
}



/**
 * POST /v1/billing/checkout
 */
export async function handleCreateCheckout(
  request: Request,
  user: AuthenticatedUser,
  env: Env
): Promise<Response> {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "BAD_REQUEST", "Invalid JSON body.");
  }

  const planId = body?.planId;
  if (!planId || typeof planId !== "string") {
    throw new HttpError(400, "INVALID_PLAN", "Missing or invalid planId.");
  }

  // 1. Razorpay Order Flow (Active when credentials provided)
  const isRazorpayRequested =
    body?.provider === "razorpay" ||
    (!body?.provider && Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET));

  if (isRazorpayRequested && env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    const validPlan = Object.keys(RAZORPAY_PLAN_AMOUNTS).includes(planId)
      ? planId
      : (["starter", "pro", "lifetime"].includes(planId) ? planId : "INTERVIEW_1H");
    const planConfig = RAZORPAY_PLAN_AMOUNTS[validPlan] || RAZORPAY_PLAN_AMOUNTS.INTERVIEW_1H;
    const authString = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
    const receipt = `rcpt_${user.uid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10)}_${Date.now().toString().slice(-6)}`;

    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: planConfig.amount,
        currency: planConfig.currency,
        receipt,
        notes: {
          uid: user.uid,
          email: user.email || "",
          planId: validPlan,
        },
      }),
    });

    if (!rzpRes.ok) {
      const errText = await rzpRes.text();
      console.error(`[Razorpay Checkout] Failed to create order: ${rzpRes.status} - ${errText}`);
      throw new HttpError(502, "RAZORPAY_ORDER_FAILED", `Failed to initialize Razorpay order: ${errText}`);
    }

    const order = (await rzpRes.json()) as any;
    return new Response(
      JSON.stringify({
        provider: "razorpay",
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: env.RAZORPAY_KEY_ID,
        planId: validPlan,
        name: "CrackFlow",
        description: planConfig.name,
        user: {
          name: user.decoded?.name || "",
          email: user.email || "",
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 2. Stripe Flow Fallback
  if (!env.STRIPE_SECRET_KEY) {
    throw new HttpError(500, "STRIPE_NOT_CONFIGURED", "STRIPE_SECRET_KEY is not configured.");
  }

  // Determine origin for redirect URLs
  const originHeader = request.headers.get("Origin");
  const defaultOrigin = env.ALLOWED_ORIGIN && !env.ALLOWED_ORIGIN.includes("*")
    ? env.ALLOWED_ORIGIN.split(",")[0].trim()
    : "http://localhost:5173";
  const origin = originHeader || defaultOrigin;

  // Development mode: If Stripe keys are placeholder, simulate successful checkout and activate in Firestore
  if (env.STRIPE_SECRET_KEY.includes("placeholder") || env.STRIPE_SECRET_KEY.startsWith("sk_test_placeholder")) {
    console.log(`[Stripe Dev Mode] Simulating instant checkout for ${user.uid} -> plan: ${planId}`);
    const validPlan = (["starter", "pro", "lifetime"].includes(planId) ? planId : "pro") as "starter" | "pro" | "lifetime";
    await updateUserInFirestore(
      user.uid,
      {
        planTier: validPlan,
        subscriptionStatus: "active",
        lifetime: validPlan === "lifetime",
        paymentProvider: "stripe",
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: validPlan === "lifetime" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      env
    );

    return new Response(
      JSON.stringify({
        checkoutUrl: `${origin}/?checkout=success&session_id=dev_sim_${Date.now()}`,
        sessionId: `dev_sim_${Date.now()}`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Server-side mapping ONLY — never accept client priceId
  const { priceId, mode } = getPriceIdForPlan(planId, env);

  // Check if user already has a customerId in Firestore
  const profile = await fetchUserFromFirestore(user.uid, user.rawToken, env);
  const existingCustomerId = profile?.customerId || null;

  // Construct Stripe Checkout Session params
  const params = new URLSearchParams();
  params.append("mode", mode);
  params.append("line_items[0][price]", priceId);
  params.append("line_items[0][quantity]", "1");
  params.append("client_reference_id", user.uid);
  params.append("metadata[uid]", user.uid);
  params.append("metadata[planId]", planId);

  if (mode === "subscription") {
    params.append("subscription_data[metadata][uid]", user.uid);
    params.append("subscription_data[metadata][planId]", planId);
  }

  if (existingCustomerId) {
    params.append("customer", existingCustomerId);
  } else if (user.email) {
    params.append("customer_email", user.email);
  }

  params.append("success_url", `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  params.append("cancel_url", `${origin}/?checkout=cancel`);

  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!stripeRes.ok) {
    const errText = await stripeRes.text();
    console.error(`[Stripe Checkout] Failed to create session: ${stripeRes.status} - ${errText}`);
    throw new HttpError(502, "STRIPE_CHECKOUT_FAILED", `Failed to initialize Stripe checkout: ${errText}`);
  }

  const session = (await stripeRes.json()) as { id: string; url: string };

  return new Response(
    JSON.stringify({
      checkoutUrl: session.url,
      sessionId: session.id,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * POST /v1/billing/portal
 */
export async function handleBillingPortal(
  request: Request,
  user: AuthenticatedUser,
  env: Env
): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY) {
    throw new HttpError(500, "STRIPE_NOT_CONFIGURED", "STRIPE_SECRET_KEY is not configured.");
  }

  const profile = await fetchUserFromFirestore(user.uid, user.rawToken, env);
  if (!profile?.customerId) {
    throw new HttpError(400, "NO_CUSTOMER", "No active Stripe customer found for this account.");
  }

  const originHeader = request.headers.get("Origin");
  const origin = originHeader || "http://localhost:5173";

  const params = new URLSearchParams();
  params.append("customer", profile.customerId);
  params.append("return_url", `${origin}/dashboard`);

  const stripeRes = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!stripeRes.ok) {
    const errText = await stripeRes.text();
    throw new HttpError(502, "PORTAL_FAILED", `Failed to create Stripe portal session: ${errText}`);
  }

  const portalSession = (await stripeRes.json()) as { url: string };

  return new Response(JSON.stringify({ portalUrl: portalSession.url }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * POST /v1/billing/webhook
 *
 * Webhook processing order:
 * 1. Verify Stripe signature.
 * 2. Check stripeWebhookEvents/{eventId}.
 * 3. If it already exists as successfully processed -> return 200.
 * 4. If it does not exist -> process the Stripe event.
 * 5. Successfully update user's Firestore entitlement.
 * 6. Only after entitlement update succeeds, record stripeWebhookEvents/{eventId}.
 * 7. Return HTTP 200.
 * If entitlement update fails -> do NOT record event; return non-2xx so Stripe retries.
 */
export async function handleWebhook(request: Request, env: Env): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not configured.");
    return new Response(JSON.stringify({ error: "WEBHOOK_SECRET_NOT_CONFIGURED" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const signatureHeader = request.headers.get("Stripe-Signature");
  const rawBody = await request.text();

  // 1. Verify Stripe signature
  const isValid = await verifyStripeSignature(rawBody, signatureHeader, env.STRIPE_WEBHOOK_SECRET);
  if (!isValid) {
    console.warn("[Stripe Webhook] Invalid Stripe signature");
    return new Response(JSON.stringify({ error: "INVALID_SIGNATURE" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "INVALID_PAYLOAD" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const eventId: string = event.id;
  const eventType: string = event.type;

  // 2 & 3. Check stripeWebhookEvents/{eventId}
  const alreadyProcessed = await checkWebhookEventProcessed(eventId, env);
  if (alreadyProcessed) {
    console.log(`[Stripe Webhook] Event ${eventId} (${eventType}) was already processed. Returning 200.`);
    return new Response(JSON.stringify({ received: true, deduplicated: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 4 & 5. Process event and update Firestore entitlement
  try {
    const targetUid = await processStripeEvent(event, env);

    if (targetUid) {
      // 6. Only after entitlement update succeeds, create stripeWebhookEvents/{eventId}
      await recordWebhookEvent(eventId, eventType, targetUid, env);
      console.log(`[Stripe Webhook] Successfully processed and recorded ${eventId} for uid ${targetUid}`);
    } else {
      // Event didn't require entitlement update (e.g. unhandled event type), record it to avoid reprocessing
      await recordWebhookEvent(eventId, eventType, "none", env);
    }

    // 7. Return HTTP 200
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (procErr: any) {
    console.error(`[Stripe Webhook] Failed processing event ${eventId} (${eventType}):`, procErr);
    // Return non-2xx so Stripe retries
    return new Response(
      JSON.stringify({
        error: "ENTITLEMENT_UPDATE_FAILED",
        message: procErr?.message || String(procErr),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Core event processing logic. Updates user entitlement in Firestore.
 * Returns the target user's UID if an entitlement write occurred, or null if ignored.
 */
async function processStripeEvent(event: any, env: Env): Promise<string | null> {
  const eventType: string = event.type;
  const dataObject: any = event.data?.object || {};

  switch (eventType) {
    // ----------------------------------------------------
    // checkout.session.completed
    // ----------------------------------------------------
    case "checkout.session.completed": {
      const mode = dataObject.mode; // "payment" | "subscription"
      const uid = dataObject.metadata?.uid || dataObject.client_reference_id;
      const customerId = dataObject.customer;

      if (!uid) {
        console.warn(`[Stripe Webhook] checkout.session.completed missing uid metadata. Customer: ${customerId}`);
        return null;
      }

      if (mode === "payment") {
        // Lifetime plan: one-time payment
        const planTier: PlanTier = "lifetime";
        const updates: Partial<FirestoreUserProfile> = {
          planTier,
          subscriptionStatus: "active",
          paymentProvider: "stripe",
          customerId: customerId || null,
          subscriptionId: dataObject.payment_intent || dataObject.id,
          lifetime: true,
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: null,
          updatedAt: new Date().toISOString(),
        };

        await updateUserInFirestore(uid, updates, env);
        return uid;
      }

      if (mode === "subscription") {
        // For monthly plans, customer.subscription.created is the authoritative grant.
        // Record customerId if user doc exists.
        if (customerId) {
          await updateUserInFirestore(uid, { customerId, paymentProvider: "stripe", updatedAt: new Date().toISOString() }, env);
        }
        return uid;
      }

      return null;
    }

    // ----------------------------------------------------
    // customer.subscription.created
    // ----------------------------------------------------
    case "customer.subscription.created": {
      let uid = dataObject.metadata?.uid;
      const customerId = dataObject.customer;

      if (!uid && customerId) {
        const found = await getUserByCustomerId(customerId, env);
        if (found) uid = found.uid;
      }

      if (!uid) {
        console.warn(`[Stripe Webhook] customer.subscription.created cannot identify uid for customer ${customerId}`);
        return null;
      }

      const priceId = dataObject.items?.data?.[0]?.price?.id;
      const planTier: PlanTier = (dataObject.metadata?.planId as PlanTier) || resolvePlanFromPriceId(priceId, env);

      const periodStart = dataObject.current_period_start
        ? new Date(dataObject.current_period_start * 1000).toISOString()
        : new Date().toISOString();
      const periodEnd = dataObject.current_period_end
        ? new Date(dataObject.current_period_end * 1000).toISOString()
        : null;

      const updates: Partial<FirestoreUserProfile> = {
        planTier: planTier.toLowerCase() as any,
        subscriptionStatus: "active",
        paymentProvider: "stripe",
        customerId,
        subscriptionId: dataObject.id,
        lifetime: false,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        updatedAt: new Date().toISOString(),
      };


      await updateUserInFirestore(uid, updates, env);
      return uid;
    }

    // ----------------------------------------------------
    // customer.subscription.updated
    // ----------------------------------------------------
    case "customer.subscription.updated": {
      let uid = dataObject.metadata?.uid;
      const customerId = dataObject.customer;

      if (!uid && customerId) {
        const found = await getUserByCustomerId(customerId, env);
        if (found) uid = found.uid;
      }

      if (!uid) {
        console.warn(`[Stripe Webhook] customer.subscription.updated cannot identify uid for customer ${customerId}`);
        return null;
      }

      // Webhook event ordering protection
      const currentProfile = await fetchUserFromFirestore(uid, "", env);
      const incomingPeriodEndMs = dataObject.current_period_end ? dataObject.current_period_end * 1000 : null;

      if (currentProfile?.currentPeriodEnd && incomingPeriodEndMs) {
        const storedPeriodEndMs = new Date(currentProfile.currentPeriodEnd).getTime();
        if (incomingPeriodEndMs < storedPeriodEndMs) {
          console.warn(
            `[Stripe Webhook] Discarding outdated subscription.updated event: incoming=${incomingPeriodEndMs}, stored=${storedPeriodEndMs}`
          );
          return uid; // Discard update, but return uid so event is recorded in stripeWebhookEvents
        }
      }

      const cancelAtPeriodEnd = !!dataObject.cancel_at_period_end;
      const stripeStatus = dataObject.status; // "active" | "past_due" | "canceled" | "unpaid" | etc.

      let subscriptionStatus: FirestoreUserProfile["subscriptionStatus"] = "active";
      if (cancelAtPeriodEnd) {
        // User scheduled cancellation at period end: keep access active until currentPeriodEnd!
        subscriptionStatus = "canceled";
      } else if (stripeStatus === "past_due") {
        subscriptionStatus = "past_due";
      } else if (stripeStatus === "canceled" || stripeStatus === "unpaid") {
        subscriptionStatus = "canceled";
      } else if (stripeStatus === "active") {
        subscriptionStatus = "active";
      }

      const periodStart = dataObject.current_period_start
        ? new Date(dataObject.current_period_start * 1000).toISOString()
        : currentProfile?.currentPeriodStart;
      const periodEnd = dataObject.current_period_end
        ? new Date(dataObject.current_period_end * 1000).toISOString()
        : currentProfile?.currentPeriodEnd;

      const priceId = dataObject.items?.data?.[0]?.price?.id;
      const planTier: PlanTier = (dataObject.metadata?.planId as PlanTier) || resolvePlanFromPriceId(priceId, env);

      const updates: Partial<FirestoreUserProfile> = {
        planTier: planTier.toLowerCase() as any,
        subscriptionStatus,
        paymentProvider: "stripe",
        subscriptionId: dataObject.id,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        updatedAt: new Date().toISOString(),
      };


      await updateUserInFirestore(uid, updates, env);
      return uid;
    }

    // ----------------------------------------------------
    // customer.subscription.deleted
    // ----------------------------------------------------
    case "customer.subscription.deleted": {
      let uid = dataObject.metadata?.uid;
      const customerId = dataObject.customer;

      if (!uid && customerId) {
        const found = await getUserByCustomerId(customerId, env);
        if (found) uid = found.uid;
      }

      if (!uid) {
        console.warn(`[Stripe Webhook] customer.subscription.deleted cannot identify uid for customer ${customerId}`);
        return null;
      }

      const updates: Partial<FirestoreUserProfile> = {
        planTier: "none",
        subscriptionStatus: "expired",
        paymentProvider: "stripe",
        updatedAt: new Date().toISOString(),
      };

      await updateUserInFirestore(uid, updates, env);
      return uid;
    }

    // ----------------------------------------------------
    // invoice.payment_succeeded
    // ----------------------------------------------------
    case "invoice.payment_succeeded": {
      const subscriptionId = dataObject.subscription;
      let uid = dataObject.subscription_details?.metadata?.uid;
      const customerId = dataObject.customer;

      if (!uid && customerId) {
        const found = await getUserByCustomerId(customerId, env);
        if (found) uid = found.uid;
      }

      if (!uid) return null;

      // Extract new period end from line items if present
      const lines = dataObject.lines?.data || [];
      const periodEndSec = lines[0]?.period?.end;
      const currentPeriodEnd = periodEndSec ? new Date(periodEndSec * 1000).toISOString() : undefined;

      const updates: Partial<FirestoreUserProfile> = {
        subscriptionStatus: "active",
        subscriptionId: subscriptionId || undefined,
        paymentProvider: "stripe",
        updatedAt: new Date().toISOString(),
      };
      if (currentPeriodEnd) {
        updates.currentPeriodEnd = currentPeriodEnd;
      }

      await updateUserInFirestore(uid, updates, env);
      return uid;
    }

    // ----------------------------------------------------
    // invoice.payment_failed
    // ----------------------------------------------------
    case "invoice.payment_failed": {
      let uid = dataObject.subscription_details?.metadata?.uid;
      const customerId = dataObject.customer;

      if (!uid && customerId) {
        const found = await getUserByCustomerId(customerId, env);
        if (found) uid = found.uid;
      }

      if (!uid) return null;

      await updateUserInFirestore(
        uid,
        {
          subscriptionStatus: "past_due",
          paymentProvider: "stripe",
          updatedAt: new Date().toISOString(),
        },
        env
      );
      return uid;
    }

    default:
      // Other events are safely ignored
      return null;
  }
}

/**
 * POST /v1/billing/razorpay/verify
 * Verifies Razorpay payment signature and activates user entitlement in Firestore.
 */
export async function handleVerifyRazorpayPayment(
  request: Request,
  user: AuthenticatedUser,
  env: Env
): Promise<Response> {
  if (!env.RAZORPAY_KEY_SECRET) {
    throw new HttpError(500, "RAZORPAY_NOT_CONFIGURED", "Razorpay is not configured on server.");
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "BAD_REQUEST", "Invalid JSON body.");
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new HttpError(
      400,
      "MISSING_PAYMENT_FIELDS",
      "Missing razorpay_order_id, razorpay_payment_id, or razorpay_signature."
    );
  }

  // 1. Cryptographic HMAC-SHA256 signature verification
  const payloadToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSig = await computeHmacSha256Hex(env.RAZORPAY_KEY_SECRET, payloadToSign);

  if (!safeEqual(expectedSig, razorpay_signature)) {
    console.warn(`[Razorpay Verify] Invalid signature for user ${user.uid}, order ${razorpay_order_id}`);
    throw new HttpError(400, "INVALID_SIGNATURE", "Razorpay payment signature verification failed.");
  }

  // 2. Resolve verified plan tier (inspecting Razorpay Order notes if reachable)
  let verifiedPlan: string = planId || "INTERVIEW_1H";
  if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    try {
      const authString = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
      const orderCheckRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
        headers: { Authorization: `Basic ${authString}` },
      });
      if (orderCheckRes.ok) {
        const orderData: any = await orderCheckRes.json();
        if (orderData.notes?.planId && Object.keys(RAZORPAY_PLAN_AMOUNTS).includes(orderData.notes.planId)) {
          verifiedPlan = orderData.notes.planId;
        }
      }
    } catch (orderErr) {
      console.warn("[Razorpay Verify] Could not fetch order notes, falling back to body.planId:", orderErr);
    }
  }

  if (!Object.keys(RAZORPAY_PLAN_AMOUNTS).includes(verifiedPlan)) {
    verifiedPlan = "INTERVIEW_1H";
  }

  // Idempotency: verify if this paymentId was already processed to prevent duplicate quota grants
  const alreadyProcessed = await checkWebhookEventProcessed(razorpay_payment_id, env);
  if (alreadyProcessed) {
    console.log(`[Razorpay Verify] Payment ${razorpay_payment_id} already processed. Returning idempotent response.`);
    const currentProfile = await fetchUserFromFirestore(user.uid, "", env);
    const existingTotal = currentProfile?.packTotalSeconds || 0;
    const existingUsed = currentProfile?.packUsedSeconds || 0;
    const remaining = Math.max(0, existingTotal - existingUsed);
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment already verified (idempotent replay).",
        planTier: currentProfile?.planTier || verifiedPlan,
        subscriptionStatus: "active",
        hasActiveAccess: true,
        expiresAt: currentProfile?.packExpiresAt || currentProfile?.currentPeriodEnd || null,
        remainingSeconds: remaining,
        deduplicated: true,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 3. Grant entitlement in Firestore (with multi-pack balance aggregation)
  const grantResult = await grantPurchasedEntitlement(
    user.uid,
    verifiedPlan,
    razorpay_payment_id,
    env
  );

  // 4. Record payment event to ensure future replayed verifications do not double-grant quota
  await recordWebhookEvent(razorpay_payment_id, "payment.verified", user.uid, env);

  return new Response(
    JSON.stringify({
      success: true,
      message: "Payment verified and entitlement activated successfully.",
      planTier: grantResult.planTier,
      subscriptionStatus: "active",
      hasActiveAccess: true,
      expiresAt: grantResult.expiresAt,
      remainingSeconds: grantResult.remainingSeconds,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * POST /v1/billing/razorpay/webhook
 * Razorpay webhook handler for asynchronous payment events.
 * Idempotent: checks and records event to avoid duplicate processing (Requirement 20).
 * Handles payment.captured, order.paid, and refund.processed (Requirement 21).
 */
export async function handleRazorpayWebhook(request: Request, env: Env): Promise<Response> {
  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_KEY_SECRET;
  if (!webhookSecret) {
    return new Response(JSON.stringify({ error: "RAZORPAY_SECRET_NOT_CONFIGURED" }), { status: 500 });
  }

  const signature = request.headers.get("X-Razorpay-Signature");
  const rawBody = await request.text();

  if (!signature) {
    return new Response(JSON.stringify({ error: "MISSING_SIGNATURE" }), { status: 400 });
  }

  const expectedSig = await computeHmacSha256Hex(webhookSecret, rawBody);
  if (!safeEqual(expectedSig, signature)) {
    return new Response(JSON.stringify({ error: "INVALID_SIGNATURE" }), { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "INVALID_JSON" }), { status: 400 });
  }

  const eventType = event.event;
  const payload = event.payload;
  const eventId: string = event.id || payload?.payment?.entity?.id || `rzp_${Date.now()}`;

  // Idempotency check: prevent duplicate webhooks from double-crediting (Requirement 20)
  const alreadyProcessed = await checkWebhookEventProcessed(eventId, env);
  if (alreadyProcessed) {
    console.log(`[Razorpay Webhook] Event ${eventId} was already processed. Returning 200.`);
    return new Response(JSON.stringify({ received: true, deduplicated: true }), { status: 200 });
  }

  try {
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const payment = payload?.payment?.entity;
      const order = payload?.order?.entity;
      const notes = payment?.notes || order?.notes || {};
      const uid = notes.uid;
      const planId = (notes.planId as string) || "INTERVIEW_1H";

      if (uid) {
        await grantPurchasedEntitlement(uid, planId, payment?.id || "rzp_webhook", env);
        await recordWebhookEvent(eventId, eventType, uid, env);
        console.log(`[Razorpay Webhook] Entitlement granted for ${uid} via ${eventType}`);
      }
    } else if (eventType === "refund.processed" || eventType === "refund.created") {
      // Refund handling: record refund, revoke active status (Requirement 21)
      const refund = payload?.refund?.entity;
      const payment = payload?.payment?.entity;
      const notes = refund?.notes || payment?.notes || {};
      const uid = notes.uid;

      if (uid) {
        const now = new Date().toISOString();
        await updateUserInFirestore(
          uid,
          {
            subscriptionStatus: "canceled",
            packExpiresAt: now, // Expire current pack immediately upon refund
            screenSolvesRemaining: 0,
            updatedAt: now,
          },
          env
        );
        invalidateEntitlementCache(uid);
        await recordWebhookEvent(eventId, eventType, uid, env);
        console.log(`[Razorpay Webhook] Refund processed for ${uid}. Access revoked.`);
      }
    } else if (eventType === "payment.failed") {
      const payment = payload?.payment?.entity;
      const notes = payment?.notes || {};
      const uid = notes.uid;
      if (uid) {
        await updateUserInFirestore(
          uid,
          {
            subscriptionStatus: "past_due",
            paymentProvider: "razorpay",
            updatedAt: new Date().toISOString(),
          },
          env
        );
        invalidateEntitlementCache(uid);
        await recordWebhookEvent(eventId, eventType, uid, env);
      }
    }

    return new Response(JSON.stringify({ status: "ok", received: true }), { status: 200 });
  } catch (err: any) {
    console.error(`[Razorpay Webhook] Error processing event ${eventId}:`, err);
    return new Response(JSON.stringify({ error: "WEBHOOK_FAILED", message: err?.message }), {
      status: 500,
    });
  }
}


