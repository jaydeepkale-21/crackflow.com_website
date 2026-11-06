import React, { useState, useEffect } from "react";
import { DashboardIcon, DashboardIconName } from "./DashboardIcons";
import { GettingStartedPage } from "./GettingStartedPage";
import { ResumePage } from "./ResumePage";
import { PlansPage } from "./PlansPage";
import { TutorialsPage } from "./TutorialsPage";
import { ProfilePage } from "./ProfilePage";
import { SupportPage } from "./SupportPage";
import { DashboardModals, ActiveModal } from "./Modals";
import { useAuth } from "../../../context/AuthContext";

export type DashboardPage =
  | "getting-started"
  | "resume"
  | "plans"
  | "tutorials"
  | "profile"
  | "support";

interface PageMeta {
  title: string;
  description: string;
}

const PAGE_METADATA: Record<DashboardPage, PageMeta> = {
  "getting-started": {
    title: "Getting Started",
    description: "Set up CrackFlow and get ready for your next interview.",
  },
  resume: {
    title: "Resume",
    description: "Keep your resume ready for more relevant interview preparation.",
  },
  plans: {
    title: "Plans & Billing",
    description: "Choose flexible interview hours or a recurring plan.",
  },
  tutorials: {
    title: "How to Use & Setup",
    description: "Learn the essentials and explore every available feature.",
  },
  profile: {
    title: "Profile",
    description: "Manage your personal information and account security.",
  },
  support: {
    title: "Help & Support",
    description: "Find answers and get help with CrackFlow.",
  },
};

interface NavItem {
  id: DashboardPage;
  label: string;
  icon: DashboardIconName;
}

const MAIN_NAV_ITEMS: NavItem[] = [
  { id: "getting-started", label: "Getting Started", icon: "home" },
  { id: "resume", label: "Resume", icon: "file" },
  { id: "plans", label: "Plans & Billing", icon: "card" },
  { id: "tutorials", label: "How to Use & Setup", icon: "play" },
  { id: "profile", label: "Profile", icon: "user" },
];

interface DashboardShellProps {
  onReturnToHome: () => void;
  initialPage?: DashboardPage;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  onReturnToHome,
  initialPage = "getting-started",
}) => {
  const { user, userProfile, hasActiveAccess, selectPlan } = useAuth();
  const [currentPage, setCurrentPage] = useState<DashboardPage>(initialPage);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [activeVideoKey, setActiveVideoKey] = useState<string>("setup-guide");
  const [toastMessage, setToastMessage] = useState<string>("");

  const isPaid = hasActiveAccess;
  const displayName = userProfile?.displayName || user?.displayName || "CrackFlow User";
  const userEmail = user?.email || "user@crackflow.in";
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "CF";

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  // Toast timer auto-dismiss
  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleNavigate = (page: DashboardPage) => {
    setCurrentPage(page);
    setMobileOpen(false);
    setProfileDropdownOpen(false);
  };

  const handleOpenVideo = (videoKey?: string) => {
    setActiveVideoKey(videoKey || "setup-guide");
    setActiveModal("video");
  };

  const renderActivePage = () => {
    switch (currentPage) {
      case "getting-started":
        return (
          <GettingStartedPage
            onOpenVideo={handleOpenVideo}
            onNavigateToPlans={() => handleNavigate("plans")}
          />
        );
      case "resume":
        return (
          <ResumePage
            onNavigateToGettingStarted={() => handleNavigate("getting-started")}
          />
        );
      case "plans":
        return <PlansPage onSelectPlan={selectPlan} />;
      case "tutorials":
        return <TutorialsPage onOpenVideo={handleOpenVideo} />;
      case "profile":
        return (
          <ProfilePage
            onNavigateToPlans={() => handleNavigate("plans")}
            onOpenEditProfile={() => setActiveModal("edit-profile")}
            onOpenSignOut={() => setActiveModal("sign-out")}
          />
        );
      case "support":
        return <SupportPage />;
      default:
        return (
          <GettingStartedPage
            onOpenVideo={handleOpenVideo}
            onNavigateToPlans={() => handleNavigate("plans")}
          />
        );
    }
  };

  return (
    <div className="app-shell">
      {/* Mobile Backdrop Scrim */}
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ─── SIDEBAR ────────────────────────────────────────────── */}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <button
            type="button"
            className="mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <DashboardIcon name="close" size={18} />
          </button>

          <img
            className="brand-logo"
            src="/assets/brand/crackflow-logo.png"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/crackflow-logo.png";
            }}
            alt="CrackFlow"
            onClick={onReturnToHome}
            title="Return to CrackFlow Home"
          />

          <span className={`status-badge ${isPaid ? "status-paid" : "status-free"}`}>
            <span className="status-dot" />
            {isPaid ? "Active License" : "Free Account"}
          </span>
        </div>

        {/* Sidebar Nav: 1. Getting Started, 2. Resume, 3. Plans & Billing, 4. How to Use & Setup, 5. Profile */}
        <nav className="nav-list" aria-label="Dashboard primary navigation">
          {MAIN_NAV_ITEMS.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${isActive ? "nav-active" : ""}`}
                onClick={() => handleNavigate(item.id)}
              >
                <DashboardIcon name={item.icon} size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Bottom: Back to Website + Help & Support + User Badge */}
        <div className="sidebar-bottom">
          <button
            type="button"
            className="nav-item back-to-site-nav-item"
            onClick={onReturnToHome}
            title="Return to main website landing page"
          >
            <DashboardIcon name="home" size={18} />
            <span>Back to Website</span>
          </button>

          <button
            type="button"
            className={`nav-item ${currentPage === "support" ? "nav-active" : ""}`}
            onClick={() => handleNavigate("support")}
          >
            <DashboardIcon name="help" size={18} />
            <span>Help & Support</span>
          </button>

          <div
            className="sidebar-user cursor-pointer hover:bg-neutral-50 p-1.5 rounded-xl transition-colors"
            onClick={() => handleNavigate("profile")}
            title="View Profile"
          >
            <div className="avatar avatar-small">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={displayName} />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div>
              <strong>{displayName}</strong>
              <span>{userEmail}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── APP MAIN ───────────────────────────────────────────── */}
      <div className="app-main">
        {/* Top Header */}
        <header className="topbar">
          <div className="header-title-wrap">
            <button
              type="button"
              className="menu-button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open mobile menu"
            >
              <DashboardIcon name="menu" size={20} />
            </button>
            <div>
              <h1>{PAGE_METADATA[currentPage].title}</h1>
              <p>{PAGE_METADATA[currentPage].description}</p>
            </div>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="back-to-website-btn"
              onClick={onReturnToHome}
              title="Return to main website landing page"
            >
              <DashboardIcon name="home" size={15} />
              <span>Back to Website</span>
            </button>

            <span className={`status-badge ${isPaid ? "status-paid" : "status-free"}`}>
              <span className="status-dot" />
              {isPaid ? "Active License" : "Free Account"}
            </span>

            <div className="profile-menu-wrap">
              <button
                type="button"
                className="profile-trigger"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                aria-expanded={profileDropdownOpen}
              >
                <span className="avatar">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={displayName} />
                  ) : (
                    <span>{initials}</span>
                  )}
                </span>
                <span className="profile-trigger-name">{displayName}</span>
                <DashboardIcon name="chevron" size={16} />
              </button>

              {profileDropdownOpen && (
                <div className="profile-dropdown">
                  <button
                    type="button"
                    onClick={() => handleNavigate("profile")}
                  >
                    <DashboardIcon name="user" size={16} /> My Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate("plans")}
                  >
                    <DashboardIcon name="card" size={16} /> Plans & Billing
                  </button>
                  <button
                    type="button"
                    onClick={onReturnToHome}
                  >
                    <DashboardIcon name="home" size={16} /> Back to Website
                  </button>
                  <div className="dropdown-separator" />
                  <button
                    type="button"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      setActiveModal("sign-out");
                    }}
                  >
                    <DashboardIcon name="external" size={16} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="content">{renderActivePage()}</main>
      </div>

      {/* Dashboard Modals */}
      <DashboardModals
        modal={activeModal}
        videoKey={activeVideoKey}
        onClose={() => setActiveModal(null)}
        onShowToast={(msg) => setToastMessage(msg)}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="toast animate-in fade-in slide-in-from-bottom-3 duration-200">
          <DashboardIcon name="check" size={16} /> {toastMessage}
        </div>
      )}
    </div>
  );
};

