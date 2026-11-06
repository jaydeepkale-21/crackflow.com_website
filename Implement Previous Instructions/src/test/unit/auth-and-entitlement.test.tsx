import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { ProfilePage } from "../../app/components/dashboard/ProfilePage";
import * as AuthContextModule from "../../context/AuthContext";

describe("Unit: Authentication & Entitlement Display", () => {
  it("renders Free Account badge and Upgrade to Pro banner for free users", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        uid: "user-free-123",
        email: "freeuser@crackflow.in",
        displayName: "Priya Sharma",
        photoURL: null,
        providerData: [{ providerId: "google.com" }],
        metadata: { creationTime: "2026-08-15T10:00:00Z" },
      } as any,
      userProfile: {
        uid: "user-free-123",
        email: "freeuser@crackflow.in",
        displayName: "Priya Sharma",
        photoURL: null,
        planTier: "none",
        subscriptionStatus: "none",
        paymentProvider: "none",
        customerId: null,
        subscriptionId: null,
        lifetime: false,
      },
      backendUser: null,
      hasActiveAccess: false,
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
    });

    render(
      <ProfilePage
        onNavigateToPlans={vi.fn()}
        onOpenEditProfile={vi.fn()}
        onOpenSignOut={vi.fn()}
      />
    );

    // Free account assertions
    expect(screen.getAllByText("Free Account").length).toBeGreaterThan(0);
    expect(screen.getByText("UPGRADE TO PRO")).toBeInTheDocument();
    expect(screen.getByText("View Plans")).toBeInTheDocument();
    expect(screen.getAllByText("Priya Sharma").length).toBeGreaterThan(0);
    expect(screen.getAllByText("freeuser@crackflow.in").length).toBeGreaterThan(0);

    // Negative assertion: Must not display Active License
    expect(screen.queryByText("ACTIVE LICENSE")).not.toBeInTheDocument();
  });

  it("renders Active License badge and active management banner for paid users", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        uid: "user-paid-456",
        email: "paiduser@crackflow.in",
        displayName: "Rahul Verma",
        photoURL: null,
        providerData: [{ providerId: "password" }],
        metadata: { creationTime: "2026-06-01T12:00:00Z" },
      } as any,
      userProfile: {
        uid: "user-paid-456",
        email: "paiduser@crackflow.in",
        displayName: "Rahul Verma",
        photoURL: null,
        planTier: "INTERVIEW_6H",
        subscriptionStatus: "active",
        paymentProvider: "razorpay",
        customerId: null,
        subscriptionId: null,
        lifetime: false,
      },
      backendUser: {
        uid: "user-paid-456",
        email: "paiduser@crackflow.in",
        displayName: "Rahul Verma",
        planTier: "INTERVIEW_6H",
        subscriptionStatus: "active",
        hasActiveAccess: true,
        remainingSeconds: 18000,
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
      refreshProfile: vi.fn(),
      refreshBackend: vi.fn(),
      selectPlan: vi.fn(),
    });

    render(
      <ProfilePage
        onNavigateToPlans={vi.fn()}
        onOpenEditProfile={vi.fn()}
        onOpenSignOut={vi.fn()}
      />
    );

    // Paid account assertions
    expect(screen.getAllByText("Active License").length).toBeGreaterThan(0);
    expect(screen.getByText("ACTIVE LICENSE")).toBeInTheDocument();
    expect(screen.getByText("Manage Plan")).toBeInTheDocument();
    expect(screen.getAllByText("Rahul Verma").length).toBeGreaterThan(0);
    expect(screen.getAllByText("paiduser@crackflow.in").length).toBeGreaterThan(0);

    // Negative assertion: Must not display Upgrade to Pro
    expect(screen.queryByText("UPGRADE TO PRO")).not.toBeInTheDocument();
  });
});
