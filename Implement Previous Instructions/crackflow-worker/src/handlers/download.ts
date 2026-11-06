import { AuthenticatedUser, Env } from "../types";

/**
 * GET /v1/download/installer
 * Authorization: Requires valid Firebase ID token ONLY.
 * Free & Paid authenticated users are authorized to download.
 */
export function handleInstallerDownload(
  _user: AuthenticatedUser,
  _env: Env
): Response {
  return new Response(
    JSON.stringify({
      downloadUrl: "/downloads/CrackFlow-Setup.exe",
      version: "v0.1.0",
      fileName: "CrackFlow-Setup.exe",
      expiresInSeconds: 300,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export function handleVersion(): Response {
  return new Response(
    JSON.stringify({
      version: "v0.1.0",
      releaseDate: "2026-11-06",
      downloadUrl: "/downloads/CrackFlow-Setup.exe",
      notes: "CrackFlow Desktop Production Release v0.1.0",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
