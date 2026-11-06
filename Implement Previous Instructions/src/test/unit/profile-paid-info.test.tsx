import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { ProfilePage } from "../../app/components/dashboard/ProfilePage";
import * as AuthContextModule from "../../context/AuthContext";

describe("Unit: Paid User Profile Information", () => {
  it("renders remaining interview time, validity, plan tier, and payment info for a paid pack user", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        uid: "paid-uid-1",
        email: "vikram@example.com",
        displayName: "Vikram Malhotra",
        photoURL: null,
        providerData: [{ providerId: "google.com" }],
        metadata: { creationTime: "2026-03-15T00:00:00Z" },
      } as any,
      userProfile: {
        uid: "paid-uid-1",
        email: "vikram@example.com",
        displayName: "Vikram Malhotra",
        photoURL: null,
        planTier: "INTERVIEW_6H",
        subscriptionStatus: "active",
        paymentProvider: "razorpay",
        customerId: "cust_123",
        subscriptionId: null,
        lifetime: false,
      },
      backendUser: {
        uid: "paid-uid-1",
        email: "vikram@example.com",
        planTier: "INTERVIEW_6H",
        displayPlan: "6 Hours (Most Popular)",
        subscriptionStatus: "active",
        hasActiveAccess: true,
        remainingSeconds: 16400, // 4 hours, 33 minutes
        expiresAt: "2026-12-15T00:00:00.000Z",
        accessType: "pack",
      },
      hasActiveAccess: true,
      hasGoogleProvider: true,
    } as any);

    render(
      <ProfilePage
        onNavigateToPlans={vi.fn()}
        onOpenEditProfile={vi.fn()}
        onOpenSignOut={vi.fn()}
      />
    );

    // Identity
    expect(screen.getAllByText("Vikram Malhotra").length).toBeGreaterThan(0);
    expect(screen.getAllByText("vikram@example.com").length).toBeGreaterThan(0);
    expect(screen.getByText("Active License")).toBeInTheDocument();

    // Table rows
    expect(screen.getByText("6 Hours (Most Popular)")).toBeInTheDocument();
    expect(screen.getByText(/Authorized & Verified/i)).toBeInTheDocument();
    expect(screen.getByText("Razorpay Verified")).toBeInTheDocument();
    expect(screen.getAllByText("Connected with Google").length).toBeGreaterThan(0);

    // Live Usage & Validity Card
    expect(screen.getByText("Active Plan & Usage Summary")).toBeInTheDocument();
    expect(screen.getByText("Remaining Interview Time")).toBeInTheDocument();
    expect(screen.getByText("4h 33m")).toBeInTheDocument();
    expect(screen.getByText("Actual live interview balance")).toBeInTheDocument();
    expect(screen.getByText("Validity & Expiry")).toBeInTheDocument();
    expect(screen.getByText("Dec 15, 2026")).toBeInTheDocument();

    // Strict Negative Assertion: AI screen solver should NOT be shown
    expect(screen.queryByText(/screen solve/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/screen solver/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/screenshot ai/i)).not.toBeInTheDocument();
  });

  it("renders Unlimited live interview time for subscription users without showing screen solver", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        uid: "sub-uid-2",
        email: "priya@example.com",
        displayName: "Priya Sharma",
        photoURL: null,
        providerData: [{ providerId: "password" }],
        metadata: { creationTime: "2026-02-01T00:00:00Z" },
      } as any,
      userProfile: {
        uid: "sub-uid-2",
        email: "priya@example.com",
        displayName: "Priya Sharma",
        photoURL: null,
        planTier: "monthly",
        subscriptionStatus: "active",
        paymentProvider: "stripe",
        customerId: "cust_stripe_456",
        subscriptionId: "sub_stripe_456",
        lifetime: false,
      },
      backendUser: {
        uid: "sub-uid-2",
        email: "priya@example.com",
        planTier: "monthly",
        displayPlan: "Monthly Unlimited",
        subscriptionStatus: "active",
        hasActiveAccess: true,
        remainingSeconds: 180000,
        expiresAt: "2026-11-30T00:00:00.000Z",
        accessType: "subscription",
      },
      hasActiveAccess: true,
      hasGoogleProvider: false,
    } as any);

    render(
      <ProfilePage
        onNavigateToPlans={vi.fn()}
        onOpenEditProfile={vi.fn()}
        onOpenSignOut={vi.fn()}
      />
    );

    expect(screen.getByText("Unlimited")).toBeInTheDocument();
    expect(screen.getByText("Continuous live interview assistance")).toBeInTheDocument();
    expect(screen.getByText("Monthly Unlimited")).toBeInTheDocument();
    expect(screen.getByText("Stripe Verified")).toBeInTheDocument();

    // Strict Negative Assertion
    expect(screen.queryByText(/screen solve/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/screen solver/i)).not.toBeInTheDocument();
  });

  it("renders Free Account view with Upgrade CTA and no usage card for free users", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        uid: "free-uid-3",
        email: "rahul@example.com",
        displayName: "Rahul Sen",
        photoURL: null,
        providerData: [{ providerId: "password" }],
        metadata: { creationTime: "2026-08-01T00:00:00Z" },
      } as any,
      userProfile: {
        uid: "free-uid-3",
        email: "rahul@example.com",
        displayName: "Rahul Sen",
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
      hasGoogleProvider: false,
    } as any);

    render(
      <ProfilePage
        onNavigateToPlans={vi.fn()}
        onOpenEditProfile={vi.fn()}
        onOpenSignOut={vi.fn()}
      />
    );

    expect(screen.getAllByText("Free Account").length).toBeGreaterThan(0);
    expect(screen.getByText("UPGRADE TO PRO")).toBeInTheDocument();
    expect(screen.getByText("View Plans")).toBeInTheDocument();

    // Does not show usage summary
    expect(screen.queryByText("Active Plan & Usage Summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Remaining Interview Time")).not.toBeInTheDocument();
  });
});
