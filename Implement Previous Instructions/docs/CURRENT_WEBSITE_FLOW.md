# Current CrackFlow Website Architecture & Flow Documentation

**Project Name:** Implement Previous Instructions (CrackFlow Marketing Website)  
**Document Purpose:** Comprehensive audit and technical baseline documentation of the current CrackFlow website codebase.  
**Date:** September 18, 2026  

---

## 1. Project Structure

### Technology Stack & Tools
- **Framework:** React 18 (`react`, `react-dom`)
- **Language:** TypeScript (`.tsx`, `.ts`)
- **Build Tool & Server:** Vite 6 (`vite` v6.3.5) with `@vitejs/plugin-react`
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite` v4.1.12), Vanilla CSS (`src/styles/theme.css`, `default_shadcn_theme.css`), Lucide React icons (`lucide-react` v0.487.0)
- **UI Components:** Radix UI primitive collection located in `src/app/components/ui/` (e.g., Dialog, Accordion, Dropdown Menu, Tabs, Sidebar, etc.) with utility classes (`clsx`, `tailwind-merge`, `class-variance-authority`).

### Directory & File Layout
```
/
├── index.html                               # HTML entry point, SEO meta tags, Schema.org JSON-LD
├── package.json                             # Package manifest & dependencies
├── vite.config.ts                           # Vite configuration with @ path alias & Figma asset resolver
├── postcss.config.mjs                       # PostCSS configuration
├── guidelines/
│   └── Guidelines.md                        # Design system & prompt guidelines
├── public/
│   ├── llms.txt & llms-full.txt             # LLM documentation files
│   ├── robots.txt                           # Search engine crawling rules
│   ├── site.webmanifest                     # Web app manifest
│   └── sitemap.xml                          # Site XML map
├── src/
│   ├── main.tsx                             # Application entry point (renders <App /> into #root)
│   ├── app/
│   │   ├── App.tsx                          # Core landing page implementation (all UI sections)
│   │   └── components/
│   │       ├── ui/                          # 48 Radix UI / Shadcn UI components
│   │       └── figma/
│   │           └── ImageWithFallback.tsx    # Helper component for image loading fallback
│   ├── imports/
│   │   ├── Screenshot_2026-07-15_221950.png
│   │   └── pasted_text/
│   │       └── crackflow-marketing-design.md# Product & design specifications
│   └── styles/
│       ├── fonts.css                        # Font imports
│       ├── globals.css                      # Global styles
│       ├── index.css                        # Base stylesheet
│       ├── tailwind.css                     # Tailwind entry
│       └── theme.css                        # Color tokens & theme CSS variables
```

---

## 2. Current Website Page Flow

The application is structured as a **Single Page Application (SPA)** with in-page smooth scrolling anchor navigation. No client-side router (`react-router`) routes are currently active or declared in `App.tsx`.

### Visual Page Flow
```
Single Landing Page (index.html / App.tsx)
 ├── Floating Navbar (#hero, #features, #how-it-works, #demos, #pricing, #compare)
 ├── Hero Section (#hero)
 │    ├── Download CTA (href="#")
 │    └── Watch Demo CTA (#demos)
 ├── Supported Platforms Strip
 ├── Problem → Solution Section
 ├── How It Works Section (#how-it-works)
 ├── Core Features Section (#features)
 ├── Real-Time Demo Preview (Dark Section)
 ├── Interactive Demo Showcase (#demos)
 ├── Privacy & Security Section
 ├── Beta User Testimonials Section
 ├── Pricing Section (#pricing)
 │    ├── Starter Plan (₹499/mo) — CTA (href="#")
 │    ├── Pro Plan (₹999/mo) — CTA (href="#")
 │    └── Lifetime Plan (₹4,999) — CTA (href="#")
 ├── Competitor Comparison Section (#compare)
 ├── Frequently Asked Questions (FAQ) Section
 ├── Final CTA Section
 └── Footer
```

### Section Route Audit

| Anchor / Section | Purpose | Access | Main Components | Data Used | Actions | Current API | Current Status |
|---|---|---|---|---|---|---|---|
| `#hero` | Main headline, value proposition & primary download CTA | Public | `Navbar`, `Hero` | Hardcoded hero copy & trust badges | Smooth scroll, CTA click (`href="#"`) | None | WORKING (UI placeholder links) |
| `#features` | Detailed breakdown of CrackFlow features (Live, Code, Context, Mock, Control) | Public | `Features`, `FeatureCard` | Hardcoded feature list | Feature exploration, video demo trigger | None | WORKING (UI placeholder links) |
| `#how-it-works` | 5-step process and candidate-interviewer architecture diagram | Public | `HowItWorks` | Hardcoded steps & architecture metadata | Static view | None | WORKING |
| `#demos` | Category tab switching between Video, Coding, and Assistance demos | Public | `Demos` | Hardcoded demo items array | Active tab selection state | None | WORKING (Client-side state) |
| `#pricing` | Pricing cards for Starter, Pro, and Lifetime tiers | Public | `PricingTeaser` | Hardcoded plans array | Select plan CTA (`href="#"`) | None | WORKING (UI placeholder links) |
| `#compare` | Comparison matrix vs competitors (Parakeet, Interview Sidekick, etc.) | Public | `Compare` | Hardcoded competitor table data | Static view, link CTA | None | WORKING |
| `FAQ` | Accordion for 15 candidate questions | Public | `FAQ` | Hardcoded `FAQS` array | Toggle accordion items | None | WORKING (Client-side state) |

---

## 3. Current Website Functionality

| Function | Current Status | File(s) | Notes |
|---|---|---|---|
| **Signup** | NOT IMPLEMENTED | - | No registration forms, UI modals, or endpoints exist. |
| **Login** | NOT IMPLEMENTED | - | No login form, email/password handler, or auth state. |
| **Google Login** | NOT IMPLEMENTED | - | No OAuth client or Google SignIn integration. |
| **Logout** | NOT IMPLEMENTED | - | No session termination or logout button. |
| **Password Reset** | NOT IMPLEMENTED | - | No password recovery workflow. |
| **Auth State** | NOT IMPLEMENTED | - | No user session, token, or context provider. |
| **Profile** | NOT IMPLEMENTED | - | No user profile view or account manager. |
| **Account Information** | NOT IMPLEMENTED | - | No account settings or billing management. |
| **User State** | NOT IMPLEMENTED | - | Application operates entirely unauthenticated. |
| **Pricing Plans** | PLACEHOLDER | `src/app/App.tsx` | Visual cards exist with INR prices and features. |
| **Plan Selection** | PLACEHOLDER | `src/app/App.tsx` | CTA buttons lead to `#` (no selection state saved). |
| **Plan Data** | WORKING (Hardcoded) | `src/app/App.tsx` | `plans` array stored directly inside component. |
| **Feature Information** | WORKING (Hardcoded) | `src/app/App.tsx` | Features listed across marketing sections. |
| **Checkout** | NOT IMPLEMENTED | - | No payment processing or checkout flow. |
| **Payment Provider** | NOT IMPLEMENTED | - | Neither Razorpay nor Stripe SDKs are integrated. |
| **Payment Success/Failure**| NOT IMPLEMENTED | - | No callback handlers or redirect routes. |
| **Subscription** | NOT IMPLEMENTED | - | No subscription management backend or webhooks. |
| **Dashboard** | NOT IMPLEMENTED | - | No candidate dashboard page or panel. |
| **Download Button** | PLACEHOLDER | `src/app/App.tsx` | Buttons exist in Navbar, Hero, and Final CTA (`href="#"`). |
| **Download Link** | PLACEHOLDER | `src/app/App.tsx` | No active binary host URL configured. |
| **App Version** | PLACEHOLDER | `index.html`, `src/app/App.tsx` | Static verification date (Jul 2026) in markup. |
| **Download Protection** | NOT IMPLEMENTED | - | Direct downloads are unauthenticated placeholders. |
| **Contact / Support** | PLACEHOLDER | `src/app/App.tsx` | Footer lists links pointing to `href="#"`. |
| **Legal Pages** | PLACEHOLDER | `src/app/App.tsx` | Footer lists Privacy/Terms links pointing to `href="#"`. |

---

## 4. Current Data Flow

```
[User Browser]
      │
      ▼
[React Render Engine (App.tsx)]
      │
      ├──> Reads Local React State (useState)
      │      ├── darkMode (boolean)
      │      ├── mobileOpen (boolean)
      │      ├── active (navigation hash string)
      │      ├── tab (demo active index number)
      │      └── open (FAQ active index number)
      │
      └──> Renders Hardcoded Constants
             ├── NAV_LINKS
             ├── FAQS
             ├── plans (Starter, Pro, Lifetime)
             └── competitors
```

**Backend / API Data Flow:**  
Currently, **there is no backend server or API integration**. All content is static and rendered entirely client-side.

---

## 5. Current Authentication

- **Firebase Configured:** No
- **Firebase Auth Installed:** No
- **Login Implemented:** No
- **Signup Implemented:** No
- **Google Login Implemented:** No
- **Auth State Implemented:** No
- **Token Retrieval Mechanism:** No
- **Protected Routes Implemented:** No

*Search Results in `src/`:* Zero references to `firebase`, `OAuth`, `JWT`, `currentUser`, or auth hooks.

---

## 6. Current Payment

- **Payment Implemented:** No
- **Payment Providers (Stripe / Razorpay):** None installed or configured
- **Checkout Implemented:** No
- **Plans Connected to Checkout:** No (CTA buttons point to `href="#"`)
- **Subscription Status Stored:** No
- **Webhooks Implemented:** No
- **Payment Status:** Placeholder UI only (`PricingTeaser` component in `src/app/App.tsx`)

---

## 7. Current Pricing / Plan Structure

Pricing plans are defined as a static array inside `PricingTeaser()` in `src/app/App.tsx`:

| Plan Name | Price | Billing Period | Features | Limits | Storage Location |
|---|---|---|---|---|---|
| **Starter** | ₹499 | /month | 20 AI assists per session, Live copilot, Basic keyboard shortcuts | 20 assists/session | `src/app/App.tsx` (Hardcoded) |
| **Pro** | ₹999 | /month | Unlimited assists, Context loading, Code mode, Mock interviews, Priority support | Unlimited assists | `src/app/App.tsx` (Hardcoded) |
| **Lifetime** | ₹4,999 | one-time | All Pro features, Lifetime updates, Early access to new features | Lifetime | `src/app/App.tsx` (Hardcoded) |

*Data Source:* Hardcoded in frontend code. No API connection.

---

## 8. Current Desktop Download Flow

### Download Flow Visualization
```
Website (Navbar / Hero / Final CTA)
 ↓
Click "Download CrackFlow" / "Download for Windows"
 ↓
Target URL: href="#" (Anchor fallback)
 ↓
Result: Page scrolls to top or stays on current section (No file downloaded)
```

- **Download Public:** Yes (no login check)
- **Login Required:** No
- **Subscription Required:** No
- **Installer Host:** Not configured
- **Download URL:** Placeholder `href="#"`
- **Version Information:** Hardcoded static mention in platform verification section

---

## 9. Current API / Backend Communication

| Request | Method | URL | Purpose | Authentication |
|---|---|---|---|---|
| *None* | *None* | *None* | *No API calls exist in the current codebase* | *None* |

*Codebase Audit:* Zero occurrences of `fetch()`, `axios`, or HTTP request abstractions in `src/`.

---

## 10. Current Environment Variables

- **Environment Files Present:** None (`.env`, `.env.local`, `.env.example` are missing)
- **Active Environment Variables:** None currently defined or consumed.

---

## 11. Current Firebase / Firestore Status

- **Firebase Project Config:** None
- **Firebase Auth:** None
- **Firestore Instance:** None
- **Security Rules:** None
- **Collections / User Documents:** None

---

## 12. Current Website → Future Architecture

*Note: Future architecture is documented for planning purposes only and is NOT implemented in this step.*

### Future Auth & Data Integration Flow
```
Website Front-End (App.tsx / Auth Modal)
 ↓
Firebase Auth (Google OAuth / Email-Password)
 ↓
Firebase ID Token Generation
 ↓
Cloudflare Workers API Gateway
 ↓
Firestore Database & Payment Processing (Razorpay/Stripe)
```

### Secure Download Flow
```
Candidate Clicks Download
 ↓
Cloudflare Worker Verification (Validates Auth ID Token & Subscription Tier in Firestore)
 ↓
Generates Short-Lived Signed Download URL
 ↓
Candidate Receives Desktop Installer (.exe)
```

### Strategic Code Location Identifiers for Integration

1. **Firebase SDK Initialization:**  
   `src/services/firebase.ts` (New service file to be added)
2. **Auth State & Modals:**  
   `src/app/App.tsx` (Update `Navbar` CTA buttons & attach Auth Provider)
3. **Checkout Integration:**  
   `src/app/App.tsx` (`PricingTeaser` component CTA handlers)
4. **User Dashboard:**  
   `src/app/components/Dashboard.tsx` (New component for candidate portal)
5. **Protected Download Handler:**  
   `src/app/App.tsx` (`Hero` and `Navbar` download click event handlers)

---

## 13. Baseline Architectural Conclusion

The current React/Vite codebase is a well-structured, production-ready design foundation for CrackFlow's marketing surface. It contains complete visual components, high-quality styling, and responsive UI layouts, making it ideal to build authentication, payments, and desktop download integrations directly into its existing component architecture without refactoring or redesigning.
