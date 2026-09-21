# CrackFlow Website — Production Customer Architecture & Data Flow

This document details the production architecture, authentication mechanisms, payment flows, subscription handling, and download protection implemented for the CrackFlow customer portal website.

---

## 1. Overview & Core Architecture

The CrackFlow website serves as:
1. **Public Marketing Site:** High-converting landing page showcasing features, live copilot capabilities, platform support, FAQs, and pricing plans.
2. **Customer Portal:** Protected interface allowing authenticated customers to manage subscriptions, view active plan entitlements, and download desktop application installers.

### Technology Stack
- **Frontend Framework:** React 18 + TypeScript
- **Build System:** Vite 6.3
- **Authentication:** Firebase Auth (Email/Password + Google OAuth)
- **Database:** Firebase Firestore (User documents & metadata)
- **Backend API:** Cloudflare Worker (`/v1/*` endpoints)
- **Styling:** Vanilla CSS + Tailwind v4 + Radix UI primitives (`Dialog`)

---

## 2. Authentication Flow (`src/context/AuthContext.tsx` & `src/services/auth.ts`)

Authentication is managed client-side using the Firebase Web SDK v11.

```
[User Action] → [AuthModal.tsx] → [src/services/auth.ts] → [Firebase Auth API]
                                         ↓
                            [ensureUserDocument()]
                                         ↓
                            [Firestore: users/{uid}]
```

### Supported Auth Methods
- **Email & Password Signup:** Calls `signUpWithEmail(email, password, displayName)`. Updates profile and initializes Firestore user document.
- **Email & Password Signin:** Calls `signInWithEmail(email, password)`.
- **Google OAuth:** Calls `signInWithGoogle()` (popup provider). Automatically syncs or initializes Firestore user document.
- **Password Reset:** Calls `sendPasswordReset(email)`.

### Firestore Document Structure (`users/{uid}`)
```json
{
  "uid": "USER_FIREBASE_UID",
  "email": "user@example.com",
  "displayName": "John Doe",
  "photoURL": null,
  "planTier": "none | starter | pro | lifetime",
  "subscriptionStatus": "none | active | canceled | past_due | expired",
  "customerId": null,
  "subscriptionId": null,
  "lifetime": false,
  "currentPeriodStart": null,
  "currentPeriodEnd": null,
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### Client Security Rules (`firestore.rules`)
Firestore security rules enforce strict field isolation:
- Users can read their own `users/{userId}` document.
- Users **cannot** create or update entitlement fields (`planTier`, `subscriptionStatus`, `customerId`, `subscriptionId`, `lifetime`, `currentPeriodStart`, `currentPeriodEnd`) from the client.
- Entitlement fields can only be set or mutated by backend services / webhooks (Firebase Admin SDK or Cloudflare Worker with admin privileges).

---

## 3. Subscription & Pricing Integration (`src/config/plans.ts` & `src/services/api.ts`)

Plans are centrally defined in `src/config/plans.ts`:
- **Starter:** ₹499/month
- **Pro:** ₹999/month
- **Lifetime:** ₹4,999 one-time

### Checkout Flow
1. User clicks "Get Started", "Get Pro", or "Get Lifetime" on `PricingTeaser` or `Dashboard`.
2. If unauthenticated, `AuthModal` is triggered with `pendingPlanId`.
3. Upon authentication, `createCheckout(planId)` is invoked on `src/services/api.ts`.
4. The client fetches the Firebase ID Token via `getIdToken()` and calls `POST /v1/billing/checkout` with `Authorization: Bearer <token>`.
5. Backend returns `{ checkoutUrl: "https://..." }` and client redirects to payment gateway (Stripe or Razorpay).

---

## 4. Protected Desktop Installer Downloads (`src/app/components/Dashboard.tsx`)

Desktop installers are protected behind user authentication and subscription verification:

1. Authenticated user clicks "Download CrackFlow" on Navbar, Hero, or Dashboard.
2. App calls `getInstallerDownload()` from `src/services/api.ts`.
3. Client attaches `Authorization: Bearer <firebase_id_token>` and calls `GET /v1/download/installer`.
4. Cloudflare Worker verifies ID token and user entitlement.
5. On success, returns signed short-lived R2 bucket download URL (`downloadUrl`).
6. Client triggers browser download.

---

## 5. Environment Variables (`.env.example`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL of Cloudflare Worker backend (e.g. `https://api.crackflow.com`) |
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain (`project-id.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase App ID |

---

## 6. Pending Backend Endpoints Checklist

The following Cloudflare Worker endpoints are defined in `src/services/api.ts` and documented in `docs/API_CONTRACT.md`:
- [ ] `GET /v1/me`
- [ ] `POST /v1/billing/checkout`
- [ ] `GET /v1/billing/status`
- [ ] `GET /v1/download/installer`
- [ ] `GET /v1/download/version`
