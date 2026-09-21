# CrackFlow Cloudflare Worker Backend — API Contract

This document specifies the REST API contract between the CrackFlow Website frontend and the Cloudflare Worker backend.

All authenticated requests must include the Firebase ID Token in the Authorization header:
```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

---

## 1. Get Current User & Entitlement (`GET /v1/me`)

Retrieves full user account details, plan tier, and active entitlement status.

### Request
- **Method:** `GET`
- **Path:** `/v1/me`
- **Headers:** `Authorization: Bearer <token>`

### Response (`200 OK`)
```json
{
  "uid": "abc123xyz",
  "email": "user@example.com",
  "displayName": "John Doe",
  "planTier": "pro",
  "subscriptionStatus": "active",
  "hasActiveAccess": true,
  "expiresAt": "2026-10-01T00:00:00Z"
}
```

### Errors
- `401 Unauthorized`: Invalid or expired Firebase ID token.
- `500 Internal Server Error`: Backend database failure.

---

## 2. Create Billing Checkout Session (`POST /v1/billing/checkout`)

Creates a payment gateway checkout session (Stripe / Razorpay) for the specified plan.

### Request
- **Method:** `POST`
- **Path:** `/v1/billing/checkout`
- **Headers:** 
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Body:**
```json
{
  "planId": "starter" | "pro" | "lifetime"
}
```

### Response (`200 OK`)
```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

### Errors
- `400 Bad Request`: Missing or invalid `planId`.
- `401 Unauthorized`: Missing or invalid token.

---

## 3. Get Billing & Subscription Status (`GET /v1/billing/status`)

Fetches detailed subscription billing cycle, payment method summary, and invoice history.

### Request
- **Method:** `GET`
- **Path:** `/v1/billing/status`
- **Headers:** `Authorization: Bearer <token>`

### Response (`200 OK`)
```json
{
  "planTier": "pro",
  "status": "active",
  "currentPeriodStart": "2026-09-01T00:00:00Z",
  "currentPeriodEnd": "2026-10-01T00:00:00Z",
  "cancelAtPeriodEnd": false,
  "invoices": [
    {
      "id": "inv_123",
      "amount": 999,
      "currency": "INR",
      "status": "paid",
      "date": "2026-09-01T00:00:00Z"
    }
  ]
}
```

---

## 4. Get Protected Installer Download (`GET /v1/download/installer`)

Generates a time-limited signed URL for downloading the desktop application installer.

### Request
- **Method:** `GET`
- **Path:** `/v1/download/installer`
- **Headers:** `Authorization: Bearer <token>`

### Response (`200 OK`)
```json
{
  "downloadUrl": "https://r2.crackflow.com/installers/CrackFlow-Setup-2.4.1.exe?token=...",
  "version": "v2.4.1",
  "fileName": "CrackFlow-Setup-2.4.1.exe",
  "expiresInSeconds": 300
}
```

### Errors
- `401 Unauthorized`: User not authenticated.
- `403 Forbidden`: User does not have active subscription/license.

---

## 5. Get Latest Desktop Version (`GET /v1/download/version`)

Public endpoint returning latest release version metadata.

### Request
- **Method:** `GET`
- **Path:** `/v1/download/version`
- **Headers:** None required.

### Response (`200 OK`)
```json
{
  "version": "v2.4.1",
  "releaseDate": "2026-03-01",
  "downloadUrl": null,
  "notes": "CrackFlow Desktop Production Release"
}
```
