import React, { useState } from "react";
import { DashboardIcon } from "./DashboardIcons";
import { useAuth } from "../../../context/AuthContext";

interface PlansPageProps {
  onSelectPlan: (planId: string) => Promise<any>;
}

type PricingCategory = "hours" | "subscription";
type ViewMode = "total" | "per_unit";

interface PlanItem {
  id: string;
  name: string;
  badge?: string;
  meta: string;
  totalPrice: string;
  totalSuffix: string;
  perUnitPrice: string;
  perUnitSuffix: string;
}

const HOURS_PLANS: PlanItem[] = [
  {
    id: "INTERVIEW_1H",
    name: "1 Hour",
    meta: "234 AI Screen Solves · Valid 30 days",
    totalPrice: "₹199",
    totalSuffix: "/ total",
    perUnitPrice: "₹199",
    perUnitSuffix: "/ hr",
  },
  {
    id: "INTERVIEW_6H",
    name: "6 Hours",
    badge: "Most Popular",
    meta: "587 AI Screen Solves · Valid 90 days",
    totalPrice: "₹499",
    totalSuffix: "/ total",
    perUnitPrice: "₹83",
    perUnitSuffix: "/ hr",
  },
  {
    id: "INTERVIEW_24H",
    name: "24 Hours / Whole Day",
    meta: "1,175 AI Screen Solves · Valid 180 days",
    totalPrice: "₹999",
    totalSuffix: "/ total",
    perUnitPrice: "₹42",
    perUnitSuffix: "/ hr",
  },
];

const SUBSCRIPTION_PLANS: PlanItem[] = [
  {
    id: "MONTHLY",
    name: "Monthly",
    meta: "1 Month · Flexible monthly access",
    totalPrice: "₹999",
    totalSuffix: "/ month",
    perUnitPrice: "₹999",
    perUnitSuffix: "/ month",
  },
  {
    id: "YEARLY",
    name: "Yearly Pass",
    badge: "Best Value",
    meta: "12 Months · Long-term access",
    totalPrice: "₹4,999",
    totalSuffix: "/ year",
    perUnitPrice: "₹417",
    perUnitSuffix: "/ mo",
  },
];

const SHARED_FEATURES = [
  "Windows Desktop App Access",
  "AI Answer Suggestions",
  "Real-time Speech-to-Text",
  "Private Desktop Overlay",
];

export const PlansPage: React.FC<PlansPageProps> = ({ onSelectPlan }) => {
  const { backendUser, userProfile, hasActiveAccess } = useAuth();
  const [activeCategory, setActiveCategory] = useState<PricingCategory>("hours");
  const [selectedHoursPlan, setSelectedHoursPlan] = useState<string>("INTERVIEW_6H");
  const [selectedSubPlan, setSelectedSubPlan] = useState<string>("MONTHLY");
  const [hoursViewMode, setHoursViewMode] = useState<ViewMode>("total");
  const [subViewMode, setSubViewMode] = useState<ViewMode>("total");
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const currentPlanTier = backendUser?.planTier || userProfile?.planTier || "none";

  const isHours = activeCategory === "hours";
  const currentPlans = isHours ? HOURS_PLANS : SUBSCRIPTION_PLANS;
  const currentSelectedId = isHours ? selectedHoursPlan : selectedSubPlan;
  const currentViewMode = isHours ? hoursViewMode : subViewMode;

  const selectedPlan =
    currentPlans.find((p) => p.id === currentSelectedId) || currentPlans[0];

  const isCurrentPlanSelected = currentPlanTier === selectedPlan.id;
  const isLoading = loadingPlanId === selectedPlan.id;

  const handleSelectRow = (planId: string) => {
    if (isHours) {
      setSelectedHoursPlan(planId);
    } else {
      setSelectedSubPlan(planId);
    }
  };

  const handleCheckout = async () => {
    setLoadingPlanId(selectedPlan.id);
    setNotice(null);
    try {
      const res = await onSelectPlan(selectedPlan.id);
      if (res && !res.success) {
        setNotice(res.error || "Failed to start checkout. Please try again.");
      }
    } catch (err: any) {
      setNotice(err?.message || "Error launching checkout session.");
    } finally {
      setLoadingPlanId(null);
    }
  };

  const getButtonLabel = () => {
    if (isLoading) {
      return (
        <>
          <DashboardIcon name="spinner" size={16} /> Opening Checkout...
        </>
      );
    }
    if (isCurrentPlanSelected) {
      return "Current Plan";
    }
    if (isHours) {
      return `Upgrade to ${selectedPlan.name} · ${selectedPlan.totalPrice}`;
    }
    const cleanSuffix = selectedPlan.totalSuffix.replace(/\s+/g, "");
    return `Choose ${selectedPlan.name} · ${selectedPlan.totalPrice}${cleanSuffix}`;
  };

  return (
    <div className="plans-container page-stack">
      {/* Notice if checkout error */}
      {notice && (
        <div
          role="alert"
          className="w-full max-w-[600px] p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 mb-2"
        >
          <DashboardIcon name="alert" size={16} />
          <span>{notice}</span>
        </div>
      )}

      {/* Authoritative User Entitlement Status if active */}
      {hasActiveAccess && (
        <div className="w-full max-w-[600px] p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <strong className="text-emerald-900 text-sm">Active License Active</strong>
            </div>
            <p className="text-xs text-emerald-800 mt-1">
              Your account currently has verified interview access ({currentPlanTier}).
            </p>
          </div>
          {backendUser?.remainingSeconds !== undefined && backendUser.remainingSeconds > 0 && (
            <div className="px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-2">
              <DashboardIcon name="clock" size={14} />
              <span>
                Remaining: {Math.floor(backendUser.remainingSeconds / 3600)}h{" "}
                {Math.floor((backendUser.remainingSeconds % 3600) / 60)}m
              </span>
            </div>
          )}
        </div>
      )}

      {/* Top Header */}
      <header className="plans-header">
        <div className="plans-brand">
          <img
            src="/assets/brand/crackflow-logo.png"
            alt="CrackFlow"
            className="plans-brand-logo"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/crackflow-logo.png";
            }}
          />
        </div>

        <h1 className="plans-title">
          {isHours ? "Choose Your Interview Plan" : "Choose Your Subscription Plan"}
        </h1>
        <p className="plans-subtitle">
          Flexible pricing options for every stage of your interview journey.
        </p>

        {/* Centered Segmented Toggle */}
        <div className="pricing-category-toggle" role="tablist" aria-label="Pricing Categories">
          <button
            type="button"
            role="tab"
            aria-selected={isHours}
            className={`pricing-category-btn ${isHours ? "active" : ""}`}
            onClick={() => setActiveCategory("hours")}
          >
            Interview Hours
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isHours}
            className={`pricing-category-btn ${!isHours ? "active" : ""}`}
            onClick={() => setActiveCategory("subscription")}
          >
            Subscription
          </button>
        </div>
      </header>

      {/* Main Centered Pricing Panel */}
      <main className="pricing-panel-card">
        {/* Panel Header */}
        <div className="pricing-panel-header">
          <div className="pricing-header-left">
            <div className="pricing-header-icon">
              <DashboardIcon name={isHours ? "clock" : "calendar"} size={20} />
            </div>
            <div className="pricing-header-info">
              <h3>{isHours ? "Interview Hours" : "Subscription"}</h3>
              <p>
                {isHours
                  ? "Choose the interview time that fits your preparation."
                  : "Ongoing access for continuous interview preparation."}
              </p>
            </div>
          </div>

          {/* View Switch: Total vs Per hour / Per month */}
          <div className="pricing-view-switch" role="group" aria-label="Pricing view switch">
            <button
              type="button"
              className={`pricing-view-btn ${currentViewMode === "total" ? "active" : ""}`}
              onClick={() => {
                if (isHours) setHoursViewMode("total");
                else setSubViewMode("total");
              }}
            >
              Total
            </button>
            <button
              type="button"
              className={`pricing-view-btn ${currentViewMode === "per_unit" ? "active" : ""}`}
              onClick={() => {
                if (isHours) setHoursViewMode("per_unit");
                else setSubViewMode("per_unit");
              }}
            >
              {isHours ? "Per hour" : "Per month"}
            </button>
          </div>
        </div>

        {/* Selectable Horizontal Rows */}
        <div className="pricing-rows" role="radiogroup" aria-label="Available plans">
          {currentPlans.map((plan) => {
            const isSelected = plan.id === currentSelectedId;
            const displayPrice =
              currentViewMode === "total" ? plan.totalPrice : plan.perUnitPrice;
            const displayPeriod =
              currentViewMode === "total" ? plan.totalSuffix : plan.perUnitSuffix;

            return (
              <div
                key={plan.id}
                role="radio"
                tabIndex={0}
                aria-checked={isSelected}
                className={`pricing-row-item ${isSelected ? "selected" : ""}`}
                onClick={() => handleSelectRow(plan.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectRow(plan.id);
                  }
                }}
              >
                <div className="pricing-row-left">
                  <div className={`pricing-radio ${isSelected ? "checked" : ""}`}>
                    {isSelected && <span className="pricing-radio-dot" />}
                  </div>
                  <div className="pricing-row-details">
                    <div className="pricing-row-title-row">
                      <span className="pricing-row-name">{plan.name}</span>
                      {plan.badge && (
                        <span className="pricing-popular-badge">{plan.badge}</span>
                      )}
                    </div>
                    <span className="pricing-row-meta">{plan.meta}</span>
                  </div>
                </div>

                <div className="pricing-row-right">
                  <div className="pricing-row-price">{displayPrice}</div>
                  <div className="pricing-row-period">{displayPeriod}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pricing-divider" />

        {/* Shared Features Section */}
        <section className="pricing-features-section" aria-label="Included features">
          <div className="pricing-features-title">
            <DashboardIcon name="star" size={15} className="pricing-features-star" />
            <span>
              {isHours
                ? "Included with every Interview Hours plan"
                : "Included with every subscription"}
            </span>
          </div>

          <div className="pricing-features-grid">
            {SHARED_FEATURES.map((feature, idx) => (
              <div key={idx} className="pricing-feature-item">
                <DashboardIcon name="check" size={14} className="pricing-feature-check" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Prominent CTA Button */}
        <button
          type="button"
          className="pricing-cta-btn"
          disabled={isLoading || isCurrentPlanSelected}
          onClick={handleCheckout}
        >
          {getButtonLabel()}
        </button>

        {/* Footer Note */}
        <p className="pricing-footer-note">
          {isHours
            ? "Interview time is cumulative usage; validity is counted from purchase."
            : "Subscription access follows the active billing period."}
        </p>
      </main>
    </div>
  );
};
