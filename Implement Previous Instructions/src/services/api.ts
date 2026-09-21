import { auth } from "./firebase";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface UserMeData {
  uid: string;
  email: string;
  displayName?: string;
  planTier: "none" | "starter" | "pro" | "lifetime";
  subscriptionStatus: "none" | "active" | "canceled" | "past_due" | "expired";
  hasActiveAccess: boolean;
  expiresAt?: string | null;
}

export interface CheckoutResponse {
  checkoutUrl: string;
  sessionId?: string;
}

export interface DownloadResponse {
  downloadUrl: string;
  version: string;
  fileName: string;
  expiresInSeconds?: number;
}

export interface VersionResponse {
  version: string;
  releaseDate: string;
  downloadUrl?: string;
  notes?: string;
}

/**
 * Retrieves the current user's Firebase ID Token for Bearer authentication.
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("User is not authenticated");
  }
  const token = await currentUser.getIdToken(/* forceRefresh */ false);
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * Generic fetch wrapper handling auth headers and JSON parsing.
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  if (!API_BASE_URL) {
    return {
      success: false,
      error: "Backend API base URL (VITE_API_BASE_URL) is not configured.",
    };
  }

  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      let errorMessage = `API Request failed with status ${response.status}`;
      try {
        const jsonErr = JSON.parse(errorText);
        if (jsonErr.error || jsonErr.message) {
          errorMessage = jsonErr.error || jsonErr.message;
        }
      } catch {
        if (errorText) errorMessage = errorText;
      }

      return {
        success: false,
        error: errorMessage,
        code: `HTTP_${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.warn(`[CrackFlow API] Error calling ${endpoint}:`, error?.message || error);
    return {
      success: false,
      error: error?.message || "Network request failed or backend service unreachable.",
    };
  }
}

/**
 * GET /v1/me
 * Retrieves full user account and active entitlement details from Cloudflare backend.
 */
export async function getMe(): Promise<ApiResponse<UserMeData>> {
  return fetchApi<UserMeData>("/v1/me", { method: "GET" });
}

/**
 * POST /v1/billing/checkout
 * Initiates checkout session for chosen plan (Starter, Pro, Lifetime).
 */
export async function createCheckout(planId: string): Promise<ApiResponse<CheckoutResponse>> {
  return fetchApi<CheckoutResponse>("/v1/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ planId }),
  });
}

/**
 * POST /v1/billing/portal
 * Opens Stripe Customer Portal for managing existing subscription.
 */
export async function openBillingPortal(): Promise<ApiResponse<{ portalUrl: string }>> {
  return fetchApi<{ portalUrl: string }>("/v1/billing/portal", {
    method: "POST",
  });
}

/**
 * GET /v1/billing/status
 * Fetches current subscription status and invoice history.
 */
export async function getBillingStatus(): Promise<ApiResponse<any>> {
  return fetchApi<any>("/v1/billing/status", { method: "GET" });
}

/**
 * GET /v1/download/installer
 * Fetches a time-limited signed URL for downloading the CrackFlow desktop app installer.
 */
export async function getInstallerDownload(): Promise<ApiResponse<DownloadResponse>> {
  return fetchApi<DownloadResponse>("/v1/download/installer", { method: "GET" });
}

/**
 * GET /v1/download/version
 * Fetches latest desktop version metadata.
 */
export async function getLatestVersion(): Promise<ApiResponse<VersionResponse>> {
  try {
    // Unauthenticated request possible for latest version check
    const response = await fetch(`${API_BASE_URL}/v1/download/version`);
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }
  } catch (err) {
    // Fallback info if backend unavailable
  }

  return {
    success: true,
    data: {
      version: "v2.4.1",
      releaseDate: "2026-03-01",
      notes: "CrackFlow Desktop Production Release",
    },
  };
}
