import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { DashboardShell } from "../../app/components/dashboard/DashboardShell";
import * as AuthContextModule from "../../context/AuthContext";
import * as apiModule from "../../services/api";

describe("System: End-to-End Resume & Desktop Workflow", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    const mockAuth = {
      user: {
        uid: "sys-user-resume-01",
        email: "system.tester@example.com",
        displayName: "System Tester",
        photoURL: null,
        providerData: [{ providerId: "google.com" }],
        metadata: { creationTime: "2026-01-01T00:00:00Z" },
      } as any,
      userProfile: {
        uid: "sys-user-resume-01",
        email: "system.tester@example.com",
        displayName: "System Tester",
        photoURL: null,
        planTier: "none",
        subscriptionStatus: "none",
        paymentProvider: "none",
        customerId: null,
        subscriptionId: null,
        lifetime: false,
      },
      backendUser: {
        uid: "sys-user-resume-01",
        email: "system.tester@example.com",
        planTier: "none",
        displayPlan: "Free Candidate",
        subscriptionStatus: "none",
        hasActiveAccess: false,
        remainingSeconds: 0,
      },
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
      resetPassword: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    };

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(mockAuth);

    vi.spyOn(apiModule, "createAuthExchangeCode").mockResolvedValue({
      success: true,
      data: {
        success: true,
        code: "cf_system_test_code_99",
        expiresIn: 600,
        uid: "sys-user-resume-01",
      },
    });
  });

  it("completes full system lifecycle: empty check -> upload -> preview -> desktop launch -> delete -> navigate back", async () => {
    render(
      <DashboardShell
        onNavigateHome={vi.fn()}
        onUpgradeToPro={vi.fn()}
      />
    );

    // 1. Navigate to Resume tab
    fireEvent.click(screen.getByRole("button", { name: /Resume/i }));
    expect(screen.getByRole("heading", { name: "Upload Your Resume" })).toBeInTheDocument();

    // 2. Start button is initially disabled
    const startBtn = screen.getByRole("button", { name: /Start with Desktop App/i });
    expect(startBtn).toBeDisabled();

    // 3. Upload resume
    const testFile = new File(["system test resume bytes"], "full_stack_lead_cv.pdf", {
      type: "application/pdf",
    });
    const fileInput = document.querySelector("input[type='file']")!;
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(screen.getByText("full_stack_lead_cv.pdf")).toBeInTheDocument();
      expect(startBtn).toBeEnabled();
    });

    // 4. View Resume Preview Dialog
    const viewBtn = screen.getByRole("button", { name: /View/i });
    fireEvent.click(viewBtn);
    const previewDialog = screen.getByRole("dialog", { name: /Resume Preview Dialog/i });
    expect(previewDialog).toBeInTheDocument();
    expect(within(previewDialog).getByText(/full_stack_lead_cv\.pdf/)).toBeInTheDocument();

    // Close preview
    const closePreviewBtn = screen.getByRole("button", { name: /Close dialog/i });
    fireEvent.click(closePreviewBtn);
    expect(screen.queryByRole("dialog", { name: /Resume Preview Dialog/i })).not.toBeInTheDocument();

    // 5. Click Start with Desktop App
    fireEvent.click(startBtn);
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /Desktop Launch Dialog/i })).toBeInTheDocument();
      expect(screen.getByText("cf_system_test_code_99")).toBeInTheDocument();
    });

    // Close launch modal
    const closeLaunchBtn = screen.getByRole("button", { name: /Close dialog/i });
    fireEvent.click(closeLaunchBtn);
    expect(screen.queryByRole("dialog", { name: /Desktop Launch Dialog/i })).not.toBeInTheDocument();

    // 6. Delete resume
    const removeBtn = screen.getByRole("button", { name: /Remove/i });
    fireEvent.click(removeBtn);
    expect(screen.getByText("Drag and drop your resume here")).toBeInTheDocument();
    expect(startBtn).toBeDisabled();

    // 7. Click Back button to navigate to Getting Started
    const backBtn = screen.getByRole("button", { name: /^Back$/i });
    fireEvent.click(backBtn);
    expect(screen.getByText("YOUR INTERVIEW COPILOT")).toBeInTheDocument();
    expect(screen.getByText("Welcome to CrackFlow!")).toBeInTheDocument();
  });
});
