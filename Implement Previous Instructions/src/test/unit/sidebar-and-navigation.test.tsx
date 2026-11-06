import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardShell } from "../../app/components/dashboard/DashboardShell";
import * as AuthContextModule from "../../context/AuthContext";

describe("Unit: Sidebar Navigation & Structure", () => {
  const mockAuth = {
    user: {
      uid: "test-user-1",
      email: "test@crackflow.in",
      displayName: "Amit Patel",
      photoURL: null,
      providerData: [],
    } as any,
    userProfile: {
      uid: "test-user-1",
      email: "test@crackflow.in",
      displayName: "Amit Patel",
      photoURL: null,
      planTier: "none" as const,
      subscriptionStatus: "none" as const,
      paymentProvider: "none" as const,
      customerId: null,
      subscriptionId: null,
      lifetime: false,
    },
    backendUser: null,
    hasActiveAccess: false,
    loading: false,
    isAuthenticated: true,
    isEmailVerified: true,
    providers: [],
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
  };

  it("renders all sidebar items in the exact required sequence", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(mockAuth);

    render(<DashboardShell onReturnToHome={vi.fn()} />);

    // Check logo
    const logoImg = screen.getAllByAltText("CrackFlow")[0];
    expect(logoImg).toBeInTheDocument();
    expect(logoImg.getAttribute("src")).toMatch(/crackflow-logo\.(webp|png)/);

    // Check nav links in exact order:
    // 1. Getting Started, 2. Resume, 3. Plans & Billing, 4. How to Use & Setup, 5. Profile
    const navItems = screen.getAllByRole("button").filter((b) =>
      ["Getting Started", "Resume", "Plans & Billing", "How to Use & Setup", "Profile", "Help & Support"].some(
        (name) => b.textContent?.includes(name)
      )
    );

    const labels = navItems.map((item) => item.textContent?.trim());
    expect(labels[0]).toBe("Getting Started");
    expect(labels[1]).toBe("Resume");
    expect(labels[2]).toBe("Plans & Billing");
    expect(labels[3]).toBe("How to Use & Setup");
    expect(labels[4]).toBe("Profile");
    expect(labels[5]).toBe("Help & Support");
  });

  it("updates page title and active navigation state when clicking items", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(mockAuth);

    render(<DashboardShell onReturnToHome={vi.fn()} />);

    // Initially on Getting Started
    expect(screen.getByRole("heading", { name: "Welcome to CrackFlow!" })).toBeInTheDocument();

    // Click Resume
    fireEvent.click(screen.getByRole("button", { name: /Resume/i }));
    expect(screen.getByRole("heading", { name: "Upload Your Resume" })).toBeInTheDocument();

    // Click Plans & Billing
    fireEvent.click(screen.getByRole("button", { name: /Plans & Billing/i }));
    expect(screen.getByRole("heading", { name: "Choose Your Interview Plan" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Interview Hours" })).toBeInTheDocument();

    // Click How to Use & Setup
    fireEvent.click(screen.getByRole("button", { name: /How to Use & Setup/i }));
    expect(screen.getAllByText("Complete Setup Guide").length).toBeGreaterThan(0);

    // Click Profile
    fireEvent.click(screen.getByRole("button", { name: /Profile/i }));
    expect(screen.getByText("Account Security")).toBeInTheDocument();

    // Click Help & Support
    fireEvent.click(screen.getByRole("button", { name: /Help & Support/i }));
    expect(screen.getByRole("heading", { name: "How can we help?" })).toBeInTheDocument();
  });
});
