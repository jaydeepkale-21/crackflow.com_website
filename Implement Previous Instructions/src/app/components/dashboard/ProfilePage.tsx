import React from "react";
import { DashboardIcon } from "./DashboardIcons";
import { useAuth } from "../../../context/AuthContext";

interface ProfilePageProps {
  onNavigateToPlans: () => void;
  onOpenEditProfile: () => void;
  onOpenSignOut: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onNavigateToPlans,
  onOpenEditProfile,
  onOpenSignOut,
}) => {
  const { user, userProfile, backendUser, hasActiveAccess, hasGoogleProvider } = useAuth();

  const displayName = userProfile?.displayName || user?.displayName || "CrackFlow User";
  const email = user?.email || "No email registered";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "CF";

  // Format member since date
  let memberSince = "Recent";
  if (user?.metadata?.creationTime) {
    try {
      const d = new Date(user.metadata.creationTime);
      memberSince = d.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    } catch {}
  }

  const isPaid = hasActiveAccess || (backendUser?.hasActiveAccess ?? false);
  const isGoogle = hasGoogleProvider || user?.providerData.some((p) => p.providerId === "google.com");

  // Plan name formatter
  const formatPlanName = (tier?: string, displayPlan?: string): string => {
    if (displayPlan && displayPlan !== "Free") return displayPlan;
    if (!tier || tier === "none") return "Free Account";
    switch (tier.toUpperCase()) {
      case "INTERVIEW_1H":
        return "1 Hour";
      case "INTERVIEW_6H":
        return "6 Hours (Most Popular)";
      case "INTERVIEW_24H":
        return "24 Hours / Whole Day";
      case "MONTHLY":
      case "PRO":
        return "Monthly Unlimited";
      case "YEARLY":
      case "LIFETIME":
        return "Yearly Pass";
      case "STARTER":
        return "Starter Plan";
      default:
        return tier;
    }
  };

  // Remaining interview time formatter
  const formatRemainingTime = (remainingSeconds?: number, accessType?: string) => {
    if (accessType === "subscription") {
      return {
        value: "Unlimited",
        note: "Continuous live interview assistance",
      };
    }
    const total = Math.max(0, remainingSeconds || 0);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    if (hours === 0 && minutes === 0) {
      return { value: "0m", note: "No remaining balance" };
    }
    const value = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    return {
      value,
      note: "Actual live interview balance",
    };
  };

  // Plan validity and expiration formatter
  const formatValidity = (expiresAt?: string | null) => {
    if (!expiresAt) {
      return { dateStr: "Active", note: "Standard preparation window" };
    }
    try {
      const exp = new Date(expiresAt);
      const dateStr = exp.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const diffMs = exp.getTime() - Date.now();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const note = diffDays > 0 ? `${diffDays} days remaining` : "Expired";
      return { dateStr, note };
    } catch {
      return { dateStr: "Active", note: "Standard validity window" };
    }
  };

  // Payment provider formatter
  const formatPaymentProvider = (provider?: string) => {
    if (provider === "razorpay") return "Razorpay Verified";
    if (provider === "stripe") return "Stripe Verified";
    return "Verified Payment";
  };

  const activePlanName = formatPlanName(
    backendUser?.planTier || userProfile?.planTier,
    backendUser?.displayPlan
  );
  const remainingTime = formatRemainingTime(
    backendUser?.remainingSeconds,
    backendUser?.accessType
  );
  const validity = formatValidity(backendUser?.expiresAt || userProfile?.currentPeriodEnd);

  return (
    <div className="profile-layout">
      {/* Main Profile Info Card */}
      <div className="profile-main">
        <section className="profile-card">
          <div className="profile-card-top">
            <div className="avatar avatar-large">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={displayName} />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="profile-identity">
              <h2>{displayName}</h2>
              <p>{email}</p>
              <span className={`status-badge ${isPaid ? "status-paid" : "status-free"}`}>
                <span className="status-dot" />
                {isPaid ? "Active License" : "Free Account"}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onOpenEditProfile}
            >
              Edit Profile
            </button>
          </div>

          {/* Account Details Table */}
          <div className="profile-info">
            <div className="info-row">
              <span>Full name</span>
              <strong>{displayName}</strong>
            </div>
            <div className="info-row">
              <span>Registered email</span>
              <strong>{email}</strong>
            </div>

            {isPaid ? (
              <>
                <div className="info-row">
                  <span>Active plan</span>
                  <strong>{activePlanName}</strong>
                </div>
                <div className="info-row">
                  <span>Desktop app access</span>
                  <strong className="text-emerald-700 flex items-center gap-1 justify-end">
                    <DashboardIcon name="shield" size={13} /> Authorized & Verified
                  </strong>
                </div>
                <div className="info-row">
                  <span>Payment provider</span>
                  <strong>{formatPaymentProvider(userProfile?.paymentProvider)}</strong>
                </div>
              </>
            ) : (
              <div className="info-row">
                <span>Account type</span>
                <strong>Free Account</strong>
              </div>
            )}

            <div className="info-row">
              <span>Login method</span>
              <strong>{isGoogle ? "Connected with Google" : "Email & Password"}</strong>
            </div>
            <div className="info-row">
              <span>Member since</span>
              <strong>{memberSince}</strong>
            </div>
          </div>

          {/* Paid User Live Usage & Validity Summary (0 Extra Database Queries) */}
          {isPaid && (
            <div className="profile-usage-card" aria-label="Usage and validity summary">
              <div className="profile-usage-header">
                <DashboardIcon name="clock" size={15} />
                <h3>Active Plan & Usage Summary</h3>
              </div>
              <div className="profile-metrics-grid">
                <div className="profile-metric-box">
                  <div className="profile-metric-icon">
                    <DashboardIcon name="clock" size={18} />
                  </div>
                  <div className="profile-metric-info">
                    <span className="profile-metric-label">Remaining Interview Time</span>
                    <strong className="profile-metric-value">{remainingTime.value}</strong>
                    <span className="profile-metric-note">{remainingTime.note}</span>
                  </div>
                </div>

                <div className="profile-metric-box">
                  <div className="profile-metric-icon">
                    <DashboardIcon name="calendar" size={18} />
                  </div>
                  <div className="profile-metric-info">
                    <span className="profile-metric-label">Validity & Expiry</span>
                    <strong className="profile-metric-value">{validity.dateStr}</strong>
                    <span className="profile-metric-note">{validity.note}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Security Card */}
        <section className="security-card">
          <div className="security-icon">
            <DashboardIcon name="shield" size={22} />
          </div>
          <div>
            <h2>Account Security</h2>
            <p>
              {isGoogle
                ? "Your account is connected with Google. Password and authentication credentials are secure and managed via your Google account."
                : "Your account is secured with email and password credentials. You can request a password reset anytime from the sign-in modal."}
            </p>
          </div>
          <span className="connected-label">
            <DashboardIcon name="check" size={15} />{" "}
            {isGoogle ? "Connected with Google" : "Password Protected"}
          </span>
        </section>

        {/* Sign Out Action */}
        <button
          type="button"
          className="signout-action"
          onClick={onOpenSignOut}
        >
          <DashboardIcon name="external" size={16} /> Sign Out
        </button>
      </div>

      {/* Right Aside Banner (Free vs Paid) */}
      <aside>
        {isPaid ? (
          <div className="account-banner paid-banner">
            <span className="banner-icon">
              <DashboardIcon name="shield" size={24} />
            </span>
            <span className="eyebrow">ACTIVE LICENSE</span>
            <h2>Your account is active</h2>
            <p>
              Your {activePlanName} is active with {remainingTime.value} of interview assistance available.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onNavigateToPlans}
            >
              Manage Plan <DashboardIcon name="arrow" size={16} />
            </button>
          </div>
        ) : (
          <div className="account-banner">
            <span className="banner-icon">
              <DashboardIcon name="spark" size={24} />
            </span>
            <span className="eyebrow">UPGRADE TO PRO</span>
            <h2>Get interview access</h2>
            <p>Choose a plan that fits your needs and preparation schedule.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onNavigateToPlans}
            >
              View Plans <DashboardIcon name="arrow" size={16} />
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};
