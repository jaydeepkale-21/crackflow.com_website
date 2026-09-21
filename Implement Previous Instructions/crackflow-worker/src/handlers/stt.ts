import { EntitledUser, Env, SttTokenResponse } from "../types";
import { HttpError } from "../middleware/auth";

/**
 * POST /v1/stt/token
 * Obtains a temporary Deepgram JWT using Deepgram's official Token-Based Auth endpoint:
 * POST https://api.deepgram.com/v1/auth/grant
 *
 * Strictly restricted to authenticated PAID users.
 * Permanent DEEPGRAM_API_KEY stays exclusively in Cloudflare Worker secrets.
 */
export async function handleSttToken(
  _entitledUser: EntitledUser,
  env: Env
): Promise<Response> {
  const deepgramKey = env.DEEPGRAM_API_KEY;

  if (!deepgramKey) {
    // In local development before user adds their secret key, provide a test token
    console.warn("[Worker STT] DEEPGRAM_API_KEY not configured in worker secrets. Providing development simulation token.");
    const devToken: SttTokenResponse = {
      token: "dev_mock_deepgram_jwt_token_sample",
      expiresInSeconds: 3600,
    };
    return new Response(JSON.stringify(devToken), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ttl = 3600;

  try {
    const response = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: {
        Authorization: `Token ${deepgramKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[Worker STT] Deepgram grant failed:", response.status, errText);
      throw new HttpError(
        502,
        "DEEPGRAM_GRANT_FAILED",
        "Failed to generate temporary speech-to-text credentials from provider."
      );
    }

    const data = (await response.json()) as any;
    const token = data.access_token || data.token || data.key;

    if (!token) {
      throw new HttpError(
        502,
        "DEEPGRAM_INVALID_RESPONSE",
        "Provider response did not contain access token."
      );
    }

    const result: SttTokenResponse = {
      token,
      expiresInSeconds: data.expires_in || ttl,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    if (err instanceof HttpError) throw err;
    console.error("[Worker STT] Unexpected error granting Deepgram token:", err);
    throw new HttpError(
      500,
      "INTERNAL_ERROR",
      "Unable to provision speech recognition session."
    );
  }
}
