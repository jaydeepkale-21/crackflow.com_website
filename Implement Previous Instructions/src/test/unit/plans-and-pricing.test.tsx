import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PlansPage } from "../../app/components/dashboard/PlansPage";
import * as AuthContextModule from "../../context/AuthContext";

describe("Unit: Plans & Billing Logic", () => {
  it("renders Interview Hours by default with segmented toggle and shared features", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      backendUser: null,
      userProfile: null,
      hasActiveAccess: false,
    } as any);

    render(<PlansPage onSelectPlan={vi.fn().mockResolvedValue({ success: true })} />);

    // Top Header & Category Toggle
    expect(
      screen.getByRole("heading", { name: "Choose Your Interview Plan" })
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Interview Hours" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Subscription" })).toBeInTheDocument();

    // Default Selected Panel (Interview Hours)
    expect(screen.getByRole("heading", { name: "Interview Hours" })).toBeInTheDocument();
    expect(screen.getByText("1 Hour")).toBeInTheDocument();
    expect(screen.getByText("₹199")).toBeInTheDocument();
    expect(screen.getByText("6 Hours")).toBeInTheDocument();
    expect(screen.getByText("₹499")).toBeInTheDocument();
    expect(screen.getByText("Most Popular")).toBeInTheDocument();
    expect(screen.getByText("24 Hours / Whole Day")).toBeInTheDocument();
    expect(screen.getByText("₹999")).toBeInTheDocument();

    // Shared Features Checklist
    expect(
      screen.getByText("Included with every Interview Hours plan")
    ).toBeInTheDocument();
    expect(screen.getByText("Windows Desktop App Access")).toBeInTheDocument();
    expect(screen.getByText("AI Answer Suggestions")).toBeInTheDocument();
    expect(screen.getByText("Real-time Speech-to-Text")).toBeInTheDocument();
    expect(screen.getByText("Private Desktop Overlay")).toBeInTheDocument();

    // Default CTA for 6 Hours (Most popular)
    expect(
      screen.getByRole("button", { name: "Upgrade to 6 Hours · ₹499" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Interview time is cumulative usage; validity is counted from purchase\./i)
    ).toBeInTheDocument();
  });

  it("switches to Subscription view when toggle is clicked", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      backendUser: null,
      userProfile: null,
      hasActiveAccess: false,
    } as any);

    render(<PlansPage onSelectPlan={vi.fn().mockResolvedValue({ success: true })} />);

    // Click Subscription tab
    fireEvent.click(screen.getByRole("tab", { name: "Subscription" }));

    expect(
      screen.getByRole("heading", { name: "Choose Your Subscription Plan" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Subscription" })).toBeInTheDocument();
    expect(screen.getByText("Monthly")).toBeInTheDocument();
    expect(screen.getByText("Yearly Pass")).toBeInTheDocument();
    expect(screen.getByText("Best Value")).toBeInTheDocument();
    expect(screen.getByText("₹4,999")).toBeInTheDocument();

    // Default CTA for Monthly
    expect(
      screen.getByRole("button", { name: "Choose Monthly · ₹999/month" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Included with every subscription")
    ).toBeInTheDocument();
  });

  it("updates selected plan and dynamic CTA when user clicks another row", async () => {
    const mockSelectPlan = vi.fn().mockResolvedValue({ success: true });
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      backendUser: null,
      userProfile: null,
      hasActiveAccess: false,
    } as any);

    render(<PlansPage onSelectPlan={mockSelectPlan} />);

    // Initially 6 Hours is selected
    expect(screen.getByRole("button", { name: "Upgrade to 6 Hours · ₹499" })).toBeInTheDocument();

    // Click "1 Hour" row
    fireEvent.click(screen.getByText("1 Hour"));
    expect(screen.getByRole("button", { name: "Upgrade to 1 Hour · ₹199" })).toBeInTheDocument();

    // Click the dynamic CTA button
    fireEvent.click(screen.getByRole("button", { name: "Upgrade to 1 Hour · ₹199" }));

    await waitFor(() => {
      expect(mockSelectPlan).toHaveBeenCalledWith("INTERVIEW_1H");
    });
  });

  it("toggles between Total and Per unit price views", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      backendUser: null,
      userProfile: null,
      hasActiveAccess: false,
    } as any);

    render(<PlansPage onSelectPlan={vi.fn()} />);

    // Initially Total is active
    expect(screen.getAllByText("/ total").length).toBe(3);

    // Click "Per hour"
    fireEvent.click(screen.getByRole("button", { name: "Per hour" }));
    expect(screen.getAllByText("/ hr").length).toBe(3);
    expect(screen.getByText("₹83")).toBeInTheDocument();
  });

  it("disables plan button and marks Current Plan if user is already on that tier", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      backendUser: {
        planTier: "INTERVIEW_6H",
        subscriptionStatus: "active",
        hasActiveAccess: true,
        remainingSeconds: 15400,
      },
      userProfile: {
        planTier: "INTERVIEW_6H",
        subscriptionStatus: "active",
      },
      hasActiveAccess: true,
    } as any);

    render(<PlansPage onSelectPlan={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Current Plan" })).toBeDisabled();
    expect(screen.getByText("Active License Active")).toBeInTheDocument();
  });
});
