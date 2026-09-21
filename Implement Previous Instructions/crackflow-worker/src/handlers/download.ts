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
      downloadUrl: "https://storage.googleapis.com/crackflow-releases/CrackFlow-Setup-2.4.1.exe",
      version: "v2.4.1",
      fileName: "CrackFlow-Setup-2.4.1.exe",
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
      version: "v2.4.1",
      releaseDate: "2026-03-01",
      downloadUrl: null,
      notes: "CrackFlow Desktop Production Release",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
