import { AuthenticatedUser, Env, FirestoreUserProfile } from "../types";
import {
  fetchUserFromFirestore,
  updateUserInFirestore,
  checkWebhookEventProcessed,
  recordWebhookEvent,
  getUserByCustomerId,
} from "../lib/firestore";
import { HttpError } from "../middleware/auth";

type PlanTier = "starter" | "pro" | "lifetime";

/**
 * Maps planId to Stripe Price ID from server environment.
 */
function getPriceIdForPlan(planId: string, env: Env): { priceId: string; mode: "subscription" | "payment" } {
  if (planId === "starter") {
    if (!env.STRIPE_STARTER_PRICE_ID) {
      throw new HttpError(500, "STRIPE_NOT_CONFIGURED", "Stripe Starter price ID is not configured.");
    }
    return { priceId: env.STRIPE_STARTER_PRICE_ID, mode: "subscription" };
  }

  if (planId === "pro") {
    if (!env.STRIPE_PRO_PRICE_ID) {
      throw new HttpError(500, "STRIPE_NOT_CONFIGURED", "Stripe Pro price ID is not configured.");
    }
    return { priceId: env.STRIPE_PRO_PRICE_ID, mode: "subscription" };
  }

  if (planId === "lifetime") {
    if (!env.STRIPE_LIFETIME_PRICE_ID) {
      throw new HttpError(500, "STRIPE_NOT_CONFIGURED", "Stripe Lifetime price ID is not configured.");
    }
    return { priceId: env.STRIPE_LIFETIME_PRICE_ID, mode: "payment" };
  }

  throw new HttpError(400, "INVALID_PLAN", "Invalid or unsupported plan selected. Allowed: starter, pro, lifetime.");
}

/**
 * Resolves plan tier from Stripe Price ID or metadata
 */
function resolvePlanFromPriceId(priceId: string | undefined, env: Env): PlanTier {
  if (priceId && priceId === env.STRIPE_LIFETIME_PRICE_ID) return "lifetime";
  if (priceId && priceId === env.STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId && priceId === env.STRIPE_STARTER_PRICE_ID) return "starter";
  return "starter";
}

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

  // Tolerance check (5 minutes = 300 seconds)
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
 * POST /v1/billing/checkout
 */
export async function handleCreateCheckout(
  request: Request,
  user: AuthenticatedUser,
  env: Env
): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY) {
    throw new HttpError(500, "STRIPE_NOT_CONFIGURED", "STRIPE_SECRET_KEY is not configured.");
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "BAD_REQUEST", "Invalid JSON body.");
  }

  const planId = body?.planId;
  if (!planId || typeof planId !== "string") {
    throw new HttpError(400, "INVALID_PLAN", "Missing or invalid planId. Allowed: starter, pro, lifetime.");
  }

  // Server-side mapping ONLY — never accept client priceId
  const { priceId, mode } = getPriceIdForPlan(planId, env);

  // Check if user already has a customerId in Firestore
  const profile = await fetchUserFromFirestore(user.uid, user.rawToken, env);
  const existingCustomerId = profile?.customerId || null;

  // Determine origin for redirect URLs
  const originHeader = request.headers.get("Origin");
  const defaultOrigin = env.ALLOWED_ORIGIN && !env.ALLOWED_ORIGIN.includes("*")
    ? env.ALLOWED_ORIGIN.split(",")[0].trim()
    : "http://localhost:5173";
  const origin = originHeader || defaultOrigin;

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
        planTier,
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
        planTier,
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
