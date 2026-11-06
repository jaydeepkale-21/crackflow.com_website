import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DashboardShell } from "../../app/components/dashboard/DashboardShell";
import * as AuthContextModule from "../../context/AuthContext";
import * as apiModule from "../../services/api";

describe("System: End-to-End User Workflows", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("Scenario 1: Full Free User Journey across all dashboard modules", async () => {
    const mockFreeAuth = {
      user: {
        uid: "free-workflow-uid",
        email: "neha.kapoor@example.com",
        displayName: "Neha Kapoor",
        photoURL: null,
        providerData: [{ providerId: "google.com" }],
        metadata: { creationTime: "2026-10-01T00:00:00Z" },
      } as any,
      userProfile: {
        uid: "free-workflow-uid",
        email: "neha.kapoor@example.com",
        displayName: "Neha Kapoor",
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

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(mockFreeAuth);
    vi.spyOn(apiModule, "getInstallerDownload").mockResolvedValue({
      success: true,
      data: {
        downloadUrl: "https://storage.googleapis.com/crackflow-releases/CrackFlow-Setup-2.4.1.exe",
        version: "v2.4.1",
        fileName: "CrackFlow-Setup-2.4.1.exe",
      },
    });

    render(<DashboardShell onReturnToHome={vi.fn()} />);

    // 1. Getting Started: verify hero, benefits, and download
    expect(screen.getByRole("heading", { name: "Welcome to CrackFlow!" })).toBeInTheDocument();
    expect(screen.getByText("Real-time AI assistance")).toBeInTheDocument();
    expect(screen.getByText("Works during interviews")).toBeInTheDocument();
    expect(screen.getByText("Private and secure")).toBeInTheDocument();
    expect(screen.getByText("Download CrackFlow for Windows")).toBeInTheDocument();

    // 2. Navigate to Resume & upload
    fireEvent.click(screen.getByRole("button", { name: /Resume/i }));
    expect(screen.getByRole("heading", { name: "Upload Your Resume" })).toBeInTheDocument();

    const sampleFile = new File(["sample resume content"], "neha_resume_lead.pdf", {
      type: "application/pdf",
    });
    const fileInput = document.querySelector("input[type='file']")!;
    fireEvent.change(fileInput, { target: { files: [sampleFile] } });

    await waitFor(() => {
      expect(screen.getByText("neha_resume_lead.pdf")).toBeInTheDocument();
      expect(screen.getByText("Ready for desktop interview context")).toBeInTheDocument();
    });

    // 3. Navigate to Plans & Billing
    fireEvent.click(screen.getByRole("button", { name: /Plans & Billing/i }));
    expect(screen.getByRole("heading", { name: "Choose Your Interview Plan" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Interview Hours" })).toBeInTheDocument();

    // 4. Navigate to How to Use & Setup
    fireEvent.click(screen.getByRole("button", { name: /How to Use & Setup/i }));
    expect(screen.getAllByText("Complete Setup Guide").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Explore CrackFlow Features" })).toBeInTheDocument();

    // 5. Navigate to Profile
    fireEvent.click(screen.getByRole("button", { name: /Profile/i }));
    expect(screen.getAllByText("Neha Kapoor").length).toBeGreaterThan(0);
    expect(screen.getAllByText("neha.kapoor@example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Free Account").length).toBeGreaterThan(0);
    expect(screen.getByText("UPGRADE TO PRO")).toBeInTheDocument();
  });

  it("Scenario 2: Paid User Experience and Shared Layout Consistency", () => {
    const mockPaidAuth = {
      user: {
        uid: "paid-workflow-uid",
        email: "vikram.singh@example.com",
        displayName: "Vikram Singh",
        photoURL: null,
        providerData: [{ providerId: "password" }],
        metadata: { creationTime: "2026-04-12T00:00:00Z" },
      } as any,
      userProfile: {
        uid: "paid-workflow-uid",
        email: "vikram.singh@example.com",
        displayName: "Vikram Singh",
        photoURL: null,
        planTier: "INTERVIEW_24H",
        subscriptionStatus: "active",
        paymentProvider: "razorpay",
        customerId: null,
        subscriptionId: null,
        lifetime: false,
      },
      backendUser: {
        uid: "paid-workflow-uid",
        email: "vikram.singh@example.com",
        displayName: "Vikram Singh",
        planTier: "INTERVIEW_24H",
        subscriptionStatus: "active",
        hasActiveAccess: true,
        remainingSeconds: 86400,
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
    };

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(mockPaidAuth);

    render(<DashboardShell onReturnToHome={vi.fn()} initialPage="profile" />);

    // Profile shows Active License
    expect(screen.getAllByText("Active License").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Vikram Singh").length).toBeGreaterThan(0);
    expect(screen.getAllByText("vikram.singh@example.com").length).toBeGreaterThan(0);
    expect(screen.getByText("ACTIVE LICENSE")).toBeInTheDocument();
    expect(screen.getByText("Manage Plan")).toBeInTheDocument();

    // Verify all 5 main navigation links and bottom link are present just like Free user
    expect(screen.getByRole("button", { name: /Getting Started/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resume/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Plans & Billing/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /How to Use & Setup/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Profile$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Help & Support/i })).toBeInTheDocument();
  });
});
