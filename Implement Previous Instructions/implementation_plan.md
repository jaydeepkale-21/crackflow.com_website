# Phase 2 — Cloudflare Worker Backend + Frontend Integration

Establish the secure Cloudflare Worker backend that verifies Firebase ID tokens and serves as the single source of truth for user entitlement (`hasActiveAccess`), then wire up the frontend to call it.

## What This Phase Delivers

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /v1/health` | None | Liveness check |
| `GET /v1/me` | Bearer token | User identity + entitlement |
| `GET /v1/download/installer` | Bearer token + active plan | Protected installer download link |
| `GET /v1/download/version` | None | Latest public version metadata |

> [!IMPORTANT]
> **Billing endpoints (`/v1/billing/*`) are NOT in scope for this phase.** They will be added when Stripe/Razorpay is integrated later.

> [!IMPORTANT]
> **The Worker reads Firestore using the Firebase REST API** (no Admin SDK — not compatible with Workers runtime). It needs a **Service Account JSON key** to generate OAuth 2.0 access tokens for Firestore.

---

## Open Questions

> [!IMPORTANT]
> **Service Account Key Required** — To let the Worker read Firestore, you need to create a Firebase Service Account key:
> 1. Go to [Firebase Console → Project Settings → Service Accounts](https://console.firebase.google.com/project/crackflow/settings/serviceaccounts/adminsdk)
> 2. Click **"Generate new private key"**
> 3. Provide the JSON file content so I can store it as a Wrangler secret.
>
> *This is needed before the worker can be deployed and tested end-to-end.*

> [!IMPORTANT]
> **Cloudflare Account** — Do you have a Cloudflare account and are you logged into `wrangler`? The worker will be deployed to `crackflow-api.your-subdomain.workers.dev`. If not yet logged in, run `npx wrangler login` after the files are created.

---

## Proposed Changes

### Cloudflare Worker (NEW project: `crackflow-worker/`)

This is a **brand-new sub-project** folder alongside the website.

#### [NEW] `crackflow-worker/wrangler.toml`
Worker configuration — name, compatibility date, routes.

#### [NEW] `crackflow-worker/package.json`
Minimal package with `wrangler` as dev dependency, TypeScript types.

#### [NEW] `crackflow-worker/tsconfig.json`
TypeScript config targeting Cloudflare Workers runtime.

#### [NEW] `crackflow-worker/src/index.ts`
Main entry — request router dispatching to handlers.

#### [NEW] `crackflow-worker/src/middleware/auth.ts`
Firebase ID token verifier using **Web Crypto API** (no Node.js, Workers-compatible):
- Fetches Google's public JWK keys (cached via `caches` API)
- Verifies JWT signature, expiry, audience (`crackflow`), issuer
- Returns decoded `{ uid, email }`

#### [NEW] `crackflow-worker/src/lib/firestore.ts`
Firestore REST API client:
- Authenticates with Service Account → OAuth 2.0 token
- `getDocument(collection, docId)` → returns parsed Firestore document fields

#### [NEW] `crackflow-worker/src/handlers/health.ts`
`GET /v1/health` → `{ status: "ok", timestamp }`

#### [NEW] `crackflow-worker/src/handlers/me.ts`
`GET /v1/me` → verifies token, reads `users/{uid}` from Firestore, computes `hasActiveAccess`

#### [NEW] `crackflow-worker/src/handlers/download.ts`
- `GET /v1/download/installer` → checks `hasActiveAccess`, returns placeholder signed URL (R2 integration later)
- `GET /v1/download/version` → public, returns hardcoded version metadata

#### [NEW] `crackflow-worker/.dev.vars`
Local secrets file (git-ignored): `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_JSON`

---

### Frontend Website (MODIFY existing)

#### [MODIFY] [`AuthContext.tsx`](file:///c:/Users/kalej/Desktop/crackflow_webiste/Implement%20Previous%20Instructions/src/context/AuthContext.tsx)
- After login, call `getMe()` from `api.ts` to fetch backend entitlement
- Expose `backendUser` (the `UserMeData` from the worker) and `hasActiveAccess` in context
- Gracefully fall back to Firestore-local data if backend isn't configured yet

#### [MODIFY] [`Dashboard.tsx`](file:///c:/Users/kalej/Desktop/crackflow_webiste/Implement%20Previous%20Instructions/src/app/components/Dashboard.tsx)
- Show "Backend Verified ✓" badge when `backendUser` is loaded
- Show download button that calls `getInstallerDownload()` if `hasActiveAccess === true`
- Show "No Active Plan" if `hasActiveAccess === false`

#### [MODIFY] [`.env.local`](file:///c:/Users/kalej/Desktop/crackflow_webiste/Implement%20Previous%20Instructions/.env.local)
Add: `VITE_API_BASE_URL=http://localhost:8787` (for local dev)

---

## Verification Plan

### Automated
```bash
# In crackflow-worker/
npx tsc --noEmit
npx wrangler dev   # Start local worker on :8787

# In website/
npm run dev        # Start on :5173
```

### Manual Test Cases
1. `GET http://localhost:8787/v1/health` → `{ status: "ok" }`
2. `GET http://localhost:8787/v1/me` (no token) → `401 Unauthorized`
3. Login on website → call `/v1/me` with real token → returns user profile
4. Dummy-activate a plan → `/v1/me` returns `hasActiveAccess: true`
5. Dashboard shows download button when plan is active
6. `GET /v1/download/installer` with inactive plan → `403 Forbidden`
