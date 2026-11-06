
import React, { useMemo } from "react";
import { DashboardShell, DashboardPage } from "./dashboard/DashboardShell";

interface DashboardProps {
  onReturnToHome: () => void;
  onOpenPricing?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onReturnToHome }) => {
  // Determine initial tab from query param (e.g. ?tab=plans or #pricing)
  const initialPage: DashboardPage = useMemo(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") || params.get("page");
      if (
        tabParam &&
        ["getting-started", "resume", "plans", "tutorials", "profile", "support"].includes(tabParam)
      ) {
        return tabParam as DashboardPage;
      }
      if (params.get("pricing") === "1" || window.location.hash.includes("pricing")) {
        return "plans";
      }
    }
    return "getting-started";
  }, []);

  return (
    <DashboardShell
      onReturnToHome={onReturnToHome}
      initialPage={initialPage}
    />
  );
};

export default Dashboard;
