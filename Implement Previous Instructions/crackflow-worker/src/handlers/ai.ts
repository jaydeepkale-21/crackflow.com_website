import { EntitledUser, Env } from "../types";
import { HttpError } from "../middleware/auth";

/**
 * POST /v1/ai/complete
 * Proxies AI completion requests to Google Gemini API using server-side GEMINI_API_KEY.
 * Strictly restricted to authenticated PAID users.
 * Supports both standard generateContent and SSE streaming (streamGenerateContent).
 */
export async function handleAiComplete(
  request: Request,
  _entitledUser: EntitledUser,
  env: Env
): Promise<Response> {
  const geminiKey = env.GEMINI_API_KEY;

  if (!geminiKey) {
    console.warn("[Worker AI] GEMINI_API_KEY not configured in worker secrets. Returning dev simulation response.");
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: "### Solution (Development Mode)\nGEMINI_API_KEY is not configured in worker secrets. Set GEMINI_API_KEY in .dev.vars to enable live AI responses.",
                },
              ],
            },
          },
        ],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "BAD_REQUEST", "Invalid JSON request body.");
  }

  const model = body.model || "gemini-2.5-flash";
  const stream = body.stream === true;
  const geminiPayload = body.payload || {
    contents: body.contents,
    generationConfig: body.generationConfig,
    systemInstruction: body.systemInstruction,
    safetySettings: body.safetySettings,
  };

  const endpoint = stream
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${geminiKey}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

  try {
    const geminiRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiPayload),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => "");
      console.error("[Worker AI] Gemini API returned error:", geminiRes.status, errText);
      return new Response(errText, {
        status: geminiRes.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (stream) {
      // Pass-through Server-Sent Events stream
      return new Response(geminiRes.body, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const data = await geminiRes.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[Worker AI] Unexpected error calling Gemini:", err);
    throw new HttpError(500, "INTERNAL_ERROR", "Failed to connect to AI provider.");
  }
}
