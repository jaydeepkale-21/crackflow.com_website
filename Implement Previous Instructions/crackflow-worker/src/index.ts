import { Env } from "./types";
import {
  requireAuthenticatedUser,
  requireActiveEntitlement,
  HttpError,
} from "./middleware/auth";
import { handleHealth } from "./handlers/health";
import { handleMe } from "./handlers/me";
import { handleInstallerDownload, handleVersion } from "./handlers/download";
import { handleInterviewStart } from "./handlers/interview";
import { handleSttToken } from "./handlers/stt";
import { handleAiComplete } from "./handlers/ai";
import {
  handleCreateCheckout,
  handleBillingPortal,
  handleWebhook,
} from "./handlers/billing";

function setCorsHeaders(headers: Headers, request: Request, env: Env): void {
  const origin = request.headers.get("Origin");
  const allowed = env.ALLOWED_ORIGIN || "*";

  if (allowed === "*") {
    headers.set("Access-Control-Allow-Origin", origin || "*");
  } else if (origin) {
    const list = allowed.split(",").map((o) => o.trim());
    if (
      list.includes(origin) ||
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:") ||
      origin === "tauri://localhost" ||
      origin === "http://tauri.localhost" ||
      origin === "https://tauri.localhost"
    ) {
      headers.set("Access-Control-Allow-Origin", origin);
    } else {
      headers.set("Access-Control-Allow-Origin", list[0] || "*");
    }
  } else {
    headers.set("Access-Control-Allow-Origin", "*");
  }

  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept");
  headers.set("Access-Control-Max-Age", "86400");
}

function jsonResponse(data: any, status = 200, request: Request, env: Env): Response {
  const headers = new Headers({
    "Content-Type": "application/json",
  });
  setCorsHeaders(headers, request, env);
  return new Response(JSON.stringify(data), { status, headers });
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    // 1. Handle CORS Preflight
    if (method === "OPTIONS") {
      const headers = new Headers();
      setCorsHeaders(headers, request, env);
      return new Response(null, { status: 204, headers });
    }

    try {
      // 2. Public Routes
      if (path === "/v1/health" && method === "GET") {
        const res = handleHealth();
        const headers = new Headers(res.headers);
        setCorsHeaders(headers, request, env);
        return new Response(res.body, { status: res.status, headers });
      }

      if (path === "/v1/download/version" && method === "GET") {
        const res = handleVersion();
        const headers = new Headers(res.headers);
        setCorsHeaders(headers, request, env);
        return new Response(res.body, { status: res.status, headers });
      }

      // 3. User Identity & Entitlement Status Check (Free or Paid)
      if (path === "/v1/me" && method === "GET") {
        const user = await requireAuthenticatedUser(request, env);
        const res = await handleMe(user.decoded, user.rawToken, env);
        const headers = new Headers(res.headers);
        setCorsHeaders(headers, request, env);
        return new Response(res.body, { status: res.status, headers });
      }

      // 4. Installer Download — Open to ALL authenticated users (Free & Paid)
      if (path === "/v1/download/installer" && method === "GET") {
        const user = await requireAuthenticatedUser(request, env);
        const res = handleInstallerDownload(user, env);
        const headers = new Headers(res.headers);
        setCorsHeaders(headers, request, env);
        return new Response(res.body, { status: res.status, headers });
      }

      // 5. Start Interview Authorization — PAID ONLY
      if (path === "/v1/interview/start" && method === "POST") {
        const user = await requireAuthenticatedUser(request, env);
        const entitled = await requireActiveEntitlement(user, env);
        const res = handleInterviewStart(entitled);
        const headers = new Headers(res.headers);
        setCorsHeaders(headers, request, env);
        return new Response(res.body, { status: res.status, headers });
      }

      // 6. Deepgram Temporary Token Generation — PAID ONLY
      if (path === "/v1/stt/token" && method === "POST") {
        const user = await requireAuthenticatedUser(request, env);
        const entitled = await requireActiveEntitlement(
          user,
          env,
          "Please upgrade your CrackFlow plan to start an interview."
        );
        const res = await handleSttToken(entitled, env);
        const headers = new Headers(res.headers);
        setCorsHeaders(headers, request, env);
        return new Response(res.body, { status: res.status, headers });
      }

      // 7. Gemini AI Completion Proxy — PAID ONLY
      if (path === "/v1/ai/complete" && method === "POST") {
        const user = await requireAuthenticatedUser(request, env);
        const entitled = await requireActiveEntitlement(
          user,
          env,
          "An active paid plan is required to use CrackFlow AI."
        );
        const res = await handleAiComplete(request, entitled, env);
        const headers = new Headers(res.headers);
        setCorsHeaders(headers, request, env);
        return new Response(res.body, { status: res.status, headers });
      }

      // 8. Stripe Billing: Create Checkout Session — Authenticated
      if (path === "/v1/billing/checkout" && method === "POST") {
        const user = await requireAuthenticatedUser(request, env);
        const res = await handleCreateCheckout(request, user, env);
        const headers = new Headers(res.headers);
        setCorsHeaders(headers, request, env);
        return new Response(res.body, { status: res.status, headers });
      }

      // 9. Stripe Billing: Customer Portal Session — Authenticated
      if (path === "/v1/billing/portal" && method === "POST") {
        const user = await requireAuthenticatedUser(request, env);
        const res = await handleBillingPortal(request, user, env);
        const headers = new Headers(res.headers);
        setCorsHeaders(headers, request, env);
        return new Response(res.body, { status: res.status, headers });
      }

      // 10. Stripe Billing: Webhook Listener — Signature Verified
      if (path === "/v1/billing/webhook" && method === "POST") {
        const res = await handleWebhook(request, env);
        const headers = new Headers(res.headers);
        setCorsHeaders(headers, request, env);
        return new Response(res.body, { status: res.status, headers });
      }

      // 11. 404 Not Found
      return jsonResponse(
        {
          error: "NOT_FOUND",
          message: `Endpoint not found: ${method} ${path}`,
        },
        404,
        request,
        env
      );
    } catch (err: any) {
      if (err instanceof HttpError) {
        return jsonResponse(
          {
            error: err.code,
            message: err.message,
            ...(err.details || {}),
          },
          err.status,
          request,
          env
        );
      }

      console.error("[Worker Uncaught Error]", err);
      return jsonResponse(
        {
          error: "INTERNAL_SERVER_ERROR",
          message: "CrackFlow service is temporarily unavailable. Please try again.",
        },
        500,
        request,
        env
      );
    }
  },
};
