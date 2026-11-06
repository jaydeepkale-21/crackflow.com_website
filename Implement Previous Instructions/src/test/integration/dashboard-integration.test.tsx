import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DashboardShell } from "../../app/components/dashboard/DashboardShell";
import * as AuthContextModule from "../../context/AuthContext";
import * as firestoreModule from "../../services/firestore";

describe("Integration: Dashboard Components & Services", () => {
  const mockLogout = vi.fn().mockResolvedValue(undefined);
  const mockRefresh = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("integrates user identity, profile editing, and sign-out confirmation", async () => {
    const mockAuth = {
      user: {
        uid: "user-int-101",
        email: "ananya@crackflow.in",
        displayName: "Ananya Roy",
        photoURL: null,
        providerData: [{ providerId: "password" }],
        metadata: { creationTime: "2026-05-10T08:00:00Z" },
      } as any,
      userProfile: {
        uid: "user-int-101",
        email: "ananya@crackflow.in",
        displayName: "Ananya Roy",
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
      logout: mockLogout,
      resetPassword: vi.fn(),
      refreshProfile: mockRefresh,
      refreshBackend: vi.fn(),
      selectPlan: vi.fn(),
    };

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue(mockAuth);
    vi.spyOn(firestoreModule, "updateUserProfile").mockResolvedValue(undefined);

    render(<DashboardShell onReturnToHome={vi.fn()} initialPage="profile" />);

    // Check user data is integrated
    expect(screen.getAllByText("Ananya Roy").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ananya@crackflow.in").length).toBeGreaterThan(0);

    // Click Edit Profile
    const editBtn = screen.getByRole("button", { name: /Edit Profile/i });
    fireEvent.click(editBtn);

    // Edit profile dialog opens
    expect(screen.getByRole("heading", { name: "Edit Profile" })).toBeInTheDocument();
    const nameInput = screen.getByPlaceholderText("Enter your name");
    fireEvent.change(nameInput, { target: { value: "Ananya Roy Senior" } });

    // Save
    const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(firestoreModule.updateUserProfile).toHaveBeenCalledWith("user-int-101", {
        displayName: "Ananya Roy Senior",
      });
      expect(mockRefresh).toHaveBeenCalled();
    });

    // Sign out confirmation dialog
    const signOutBtn = screen.getByRole("button", { name: /Sign Out/i });
    fireEvent.click(signOutBtn);

    expect(screen.getByRole("heading", { name: "Sign out of CrackFlow?" })).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    const confirmSignOut = dialog.querySelector(".btn-danger")!;
    fireEvent.click(confirmSignOut);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  it("opens walkthrough dialog when a tutorial video thumbnail is clicked", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        uid: "user-vid-1",
        email: "test@crackflow.in",
        displayName: "Test User",
        providerData: [],
      } as any,
      userProfile: null,
      backendUser: null,
      hasActiveAccess: false,
    } as any);

    render(<DashboardShell onReturnToHome={vi.fn()} initialPage="tutorials" />);

    // Click featured setup guide
    const playButtons = screen.getAllByRole("button", { name: /Play Complete Setup Guide/i });
    fireEvent.click(playButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Full overview covering installation/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Close Walkthrough/i })).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: /Close Walkthrough/i }));
    expect(screen.queryByText(/Full overview covering installation/i)).not.toBeInTheDocument();
  });
});
