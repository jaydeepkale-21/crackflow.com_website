import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { DashboardShell } from "../../app/components/dashboard/DashboardShell";
import * as AuthContextModule from "../../context/AuthContext";
import * as apiModule from "../../services/api";

describe("Acceptance Testing (UAT): Resume Preparation & Desktop Copilot Launch", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    const mockCandidate = {
      user: {
        uid: "uat-candidate-dev-77",
        email: "priya.nair@example.com",
        displayName: "Priya Nair",
        photoURL: null,
        providerData: [{ providerId: "google.com" }],
        metadata: { creationTime: "2026-03-15T08:00:00Z" },
      } as any,
      userProfile: {
        uid: "uat-candidate-dev-77",
        email: "priya.nair@example.com",
        displayName: "Priya Nair",
        photoURL: null,
        planTier: "INTERVIEW_24H",
        subscriptionStatus: "active",
        paymentProvider: "razorpay",
        customerId: "cust_uat_77",
        subscriptionId: null,
        lifetime: false,
      },
      backendUser: {
        uid: "uat-candidate-dev-77",
        email: "priya.nair@example.com",
        planTier: "INTERVIEW_24H",
        displayPlan: "24 Hours Pack",
        subscriptionStatus: "active",
        hasActiveAccess: true,
        remainingSeconds: 86400,
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
      resetPassword: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    };

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(mockCandidate);

    vi.spyOn(apiModule, "createAuthExchangeCode").mockResolvedValue({
      success: true,
      data: {
        success: true,
        code: "cf_uat_priya_8899",
        expiresIn: 600,
        uid: "uat-candidate-dev-77",
      },
    });

    vi.spyOn(apiModule, "getInstallerDownload").mockResolvedValue({
      success: true,
      data: {
        downloadUrl: "https://releases.crackflow.com/CrackFlow-Setup-latest.exe",
        version: "2.1.0",
        fileName: "CrackFlow-Setup-latest.exe",
      },
    });
  });

  it("UAT Scenario: Candidate uploads resume, verifies preview, and launches desktop copilot with fallback protection", async () => {
    render(
      <DashboardShell
        onNavigateHome={vi.fn()}
        onUpgradeToPro={vi.fn()}
      />
    );

    // 1. Candidate navigates to Resume tab
    fireEvent.click(screen.getByRole("button", { name: /Resume/i }));

    // UAT Verification 1: "Start with Desktop App" is disabled by default
    const startBtn = screen.getByRole("button", { name: /Start with Desktop App/i });
    expect(startBtn).toBeDisabled();

    // 2. Candidate uploads their resume
    const candidateFile = new File(["UAT Candidate Experience Details"], "priya_nair_senior_swe.pdf", {
      type: "application/pdf",
    });
    const fileInput = document.querySelector("input[type='file']")!;
    fireEvent.change(fileInput, { target: { files: [candidateFile] } });

    // UAT Verification 2: File is confirmed ready and button is enabled
    await waitFor(() => {
      expect(screen.getByText("priya_nair_senior_swe.pdf")).toBeInTheDocument();
      expect(screen.getByText("Ready for desktop interview context")).toBeInTheDocument();
      expect(startBtn).toBeEnabled();
    });

    // 3. Candidate verifies resume by clicking "View"
    const viewBtn = screen.getByRole("button", { name: /View/i });
    fireEvent.click(viewBtn);

    // UAT Verification 3: Preview dialog opens with resume details
    const previewDialog = screen.getByRole("dialog", { name: /Resume Preview Dialog/i });
    expect(previewDialog).toBeInTheDocument();
    expect(within(previewDialog).getByText(/priya_nair_senior_swe\.pdf/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Close dialog/i }));

    // 4. Candidate clicks "Start with Desktop App"
    fireEvent.click(startBtn);

    // UAT Verification 4: Desktop Launch Dialog opens with single-use session code and deep link
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /Desktop Launch Dialog/i })).toBeInTheDocument();
      expect(screen.getByText("cf_uat_priya_8899")).toBeInTheDocument();
      expect(screen.getByText(/Linking resume/i)).toBeInTheDocument();
    });

    // UAT Verification 5: Fallback installer download is available if desktop app is not yet installed
    const downloadInstallerBtn = screen.getByRole("button", { name: /Download Installer/i });
    expect(downloadInstallerBtn).toBeInTheDocument();

    // Candidate closes the launch dialog
    fireEvent.click(screen.getByRole("button", { name: /Close dialog/i }));
    expect(screen.queryByRole("dialog", { name: /Desktop Launch Dialog/i })).not.toBeInTheDocument();
  });
});
