import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DashboardShell } from "../../app/components/dashboard/DashboardShell";
import * as AuthContextModule from "../../context/AuthContext";
import * as firestoreModule from "../../services/firestore";

describe("Acceptance (UAT): Paid User Profile Experience", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("UAT Scenario 1: Paid Candidate reviews active hours pack, verified desktop license, and navigates to Plans", async () => {
    const mockAuth = {
      user: {
        uid: "uat-candidate-01",
        email: "arjun.verma@example.com",
        displayName: "Arjun Verma",
        photoURL: null,
        providerData: [{ providerId: "google.com" }],
        metadata: { creationTime: "2026-06-01T10:00:00Z" },
      } as any,
      userProfile: {
        uid: "uat-candidate-01",
        email: "arjun.verma@example.com",
        displayName: "Arjun Verma",
        photoURL: null,
        planTier: "INTERVIEW_24H",
        subscriptionStatus: "active",
        paymentProvider: "razorpay",
        customerId: "cust_razorpay_99",
        subscriptionId: null,
        lifetime: false,
      },
      backendUser: {
        uid: "uat-candidate-01",
        email: "arjun.verma@example.com",
        planTier: "INTERVIEW_24H",
        displayPlan: "24 Hours / Whole Day",
        subscriptionStatus: "active",
        hasActiveAccess: true,
        remainingSeconds: 75600, // 21 hours
        expiresAt: "2026-12-01T00:00:00.000Z",
        accessType: "pack",
      },
      hasActiveAccess: true,
      loading: false,
      isAuthenticated: true,
      isEmailVerified: true,
      providers: ["google.com"],
      hasPasswordProvider: false,
      hasGoogleProvider: true,
      login: vi.fn(),
      signup: vi.fn(),
      loginWithGoogle: vi.fn(),
      linkPendingCredential: vi.fn(),
      linkGoogleAccount: vi.fn(),
      addPasswordToAccount: vi.fn(),
      sendVerificationEmail: vi.fn(),
      reloadAndCheckVerification: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
      refreshProfile: vi.fn(),
      refreshBackend: vi.fn(),
      selectPlan: vi.fn(),
    };

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(mockAuth);

    render(<DashboardShell onReturnToHome={vi.fn()} initialPage="profile" />);

    // 1. Verify user identity & license badge
    expect(screen.getAllByText("Arjun Verma").length).toBeGreaterThan(0);
    expect(screen.getAllByText("arjun.verma@example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Active License").length).toBeGreaterThan(0);

    // 2. Verify Remaining Interview Time metric box
    expect(screen.getByText("Active Plan & Usage Summary")).toBeInTheDocument();
    expect(screen.getByText("Remaining Interview Time")).toBeInTheDocument();
    expect(screen.getByText("21h 0m")).toBeInTheDocument();
    expect(screen.getByText("Actual live interview balance")).toBeInTheDocument();

    // 3. Verify Validity & Expiry
    expect(screen.getByText("Validity & Expiry")).toBeInTheDocument();
    expect(screen.getByText("Dec 1, 2026")).toBeInTheDocument();

    // 4. Verify Account & Billing rows
    expect(screen.getByText("24 Hours / Whole Day")).toBeInTheDocument();
    expect(screen.getByText(/Authorized & Verified/i)).toBeInTheDocument();
    expect(screen.getByText("Razorpay Verified")).toBeInTheDocument();

    // 5. Verify NO screen solver clutter is present
    expect(screen.queryByText(/screen solver/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/screen solve/i)).not.toBeInTheDocument();

    // 6. User clicks "Manage Plan" -> navigates to Plans & Billing
    const managePlanBtn = screen.getByRole("button", { name: /Manage Plan/i });
    fireEvent.click(managePlanBtn);

    expect(screen.getByRole("heading", { name: "Choose Your Interview Plan" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Interview Hours" })).toBeInTheDocument();
  });

  it("UAT Scenario 2: Subscription Candidate views Unlimited live access and edits display name", async () => {
    const mockRefresh = vi.fn().mockResolvedValue(undefined);
    const mockAuth = {
      user: {
        uid: "uat-candidate-02",
        email: "kavita.nair@example.com",
        displayName: "Kavita Nair",
        photoURL: null,
        providerData: [{ providerId: "password" }],
        metadata: { creationTime: "2026-04-10T10:00:00Z" },
      } as any,
      userProfile: {
        uid: "uat-candidate-02",
        email: "kavita.nair@example.com",
        displayName: "Kavita Nair",
        photoURL: null,
        planTier: "monthly",
        subscriptionStatus: "active",
        paymentProvider: "stripe",
        customerId: "cust_stripe_88",
        subscriptionId: "sub_stripe_88",
        lifetime: false,
      },
      backendUser: {
        uid: "uat-candidate-02",
        email: "kavita.nair@example.com",
        planTier: "monthly",
        displayPlan: "Monthly Unlimited",
        subscriptionStatus: "active",
        hasActiveAccess: true,
        remainingSeconds: 180000,
        expiresAt: "2026-11-20T00:00:00.000Z",
        accessType: "subscription",
      },
      hasActiveAccess: true,
      loading: false,
      isAuthenticated: true,
      isEmailVerified: true,
      providers: ["password"],
      hasPasswordProvider: true,
      hasGoogleProvider: false,
      login: vi.fn(),
      signup: vi.fn(),
      loginWithGoogle: vi.fn(),
      linkPendingCredential: vi.fn(),
      linkGoogleAccount: vi.fn(),
      addPasswordToAccount: vi.fn(),
      sendVerificationEmail: vi.fn(),
      reloadAndCheckVerification: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
      refreshProfile: mockRefresh,
      refreshBackend: vi.fn(),
      selectPlan: vi.fn(),
    };

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(mockAuth);
    vi.spyOn(firestoreModule, "updateUserProfile").mockResolvedValue(undefined);

    render(<DashboardShell onReturnToHome={vi.fn()} initialPage="profile" />);

    // 1. Verify Unlimited entitlement
    expect(screen.getByText("Unlimited")).toBeInTheDocument();
    expect(screen.getByText("Continuous live interview assistance")).toBeInTheDocument();
    expect(screen.getByText("Monthly Unlimited")).toBeInTheDocument();
    expect(screen.getByText("Stripe Verified")).toBeInTheDocument();

    // 2. Click Edit Profile
    fireEvent.click(screen.getByRole("button", { name: /Edit Profile/i }));
    expect(screen.getByRole("heading", { name: "Edit Profile" })).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText("Enter your name");
    fireEvent.change(nameInput, { target: { value: "Kavita Nair Tech Lead" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(firestoreModule.updateUserProfile).toHaveBeenCalledWith("uat-candidate-02", {
        displayName: "Kavita Nair Tech Lead",
      });
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});

