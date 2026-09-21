import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { PLANS } from "../../config/plans";
import { getInstallerDownload } from "../../services/api";
import {
  ShieldCheck,
  Zap,
  CreditCard,
  LogOut,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Download,
  ExternalLink,
} from "lucide-react";
import { openBillingPortal } from "../../services/api";


interface DashboardProps {
  onReturnToHome: () => void;
  onOpenPricing: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onReturnToHome,
  onOpenPricing,
}) => {
  const { user, userProfile, backendUser, hasActiveAccess, logout, refreshProfile, selectPlan } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState<boolean>(false);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState<boolean>(false);
  const [downloadInfo, setDownloadInfo] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleSelectPlan = async (planId: "starter" | "pro" | "lifetime") => {
    setCheckoutLoading(planId);
    setDemoNotice(null);
    setDownloadInfo(null);
    setDownloadError(null);

    try {
      const res = await selectPlan(planId);
      if (!res.success) {
        setDemoNotice(res.error || "Failed to start checkout session.");
      }
    } catch (err: any) {
      setDemoNotice(`Error selecting plan: ${err?.message || "Failed to initialize checkout"}`);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await openBillingPortal();
      if (res.success && res.data?.portalUrl) {
        window.location.href = res.data.portalUrl;
      } else {
        setDemoNotice(res.error || "Unable to open billing portal. Please verify your subscription.");
      }
    } catch (err: any) {
      setDemoNotice(err?.message || "Failed to contact billing portal.");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleDownloadInstaller = async () => {
    setDownloadLoading(true);
    setDownloadError(null);
    setDownloadInfo(null);

    try {
      const res = await getInstallerDownload();
      if (res.success && res.data) {
        setDownloadInfo(`Download ready: ${res.data.fileName} (${res.data.version})`);
        window.open(res.data.downloadUrl, "_blank");
      } else {
        setDownloadError(res.error || "Unable to generate download link. Please check your subscription.");
      }
    } catch (err: any) {
      setDownloadError(err?.message || "Failed to contact backend download service.");
    } finally {
      setDownloadLoading(false);
    }
  };

  const currentPlanTier = backendUser?.planTier || userProfile?.planTier || "none";
  const subscriptionStatus = backendUser?.subscriptionStatus || userProfile?.subscriptionStatus || "none";
  const paymentProvider = userProfile?.paymentProvider || "dummy";
  const isSubscriber = hasActiveAccess;

  return (
    <div className="min-h-screen bg-[#0A0B0F] text-white pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation / Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
          <div>
            <button
              onClick={onReturnToHome}
              className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-amber-400 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to CrackFlow Home
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              User Dashboard <Sparkles className="w-6 h-6 text-amber-400" />
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshProfile}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-gray-300 transition-all flex items-center gap-2"
            >
              Refresh Profile
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-xs font-semibold text-red-400 transition-all flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>

        {demoNotice && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs flex items-center gap-3 animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
            <span className="font-semibold">{demoNotice}</span>
          </div>
        )}

        {/* User Info & Subscription Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Account Card */}
          <div className="bg-[#0F1117] border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-6">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Avatar"
                    className="w-14 h-14 rounded-2xl border-2 border-amber-500/30 object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xl">
                    {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {userProfile?.displayName || user?.displayName || "CrackFlow User"}
                  </h2>
                  <p className="text-xs text-gray-400 truncate max-w-[220px]">
                    {user?.email}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-white/5 text-[10px] text-gray-400 rounded-md font-mono">
                    UID: {user?.uid.substring(0, 10)}...
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-white/5 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Account Identity</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Firebase Authenticated
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Backend Authorization</span>
                  {backendUser ? (
                    <span className="text-cyan-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Cloudflare Worker Verified
                    </span>
                  ) : (
                    <span className="text-amber-400/80 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Verifying...
                    </span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span>Registered Email</span>
                  <span className="text-gray-300 font-mono text-[11px] truncate max-w-[180px]">
                    {user?.email}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Plan Card */}
          <div className="bg-[#0F1117] border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Active Subscription
                </span>
                <span
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
                    isSubscriber
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                  }`}
                >
                  {subscriptionStatus === "none" ? "No Active Plan" : subscriptionStatus}
                </span>
              </div>

              <div className="my-4">
                <h3 className="text-3xl font-extrabold text-white capitalize">
                  {currentPlanTier === "none" ? "No Plan Selected" : `${currentPlanTier} Plan`}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Payment Mode: <strong className="text-amber-400">{paymentProvider.toUpperCase()}</strong>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Interview Access:{" "}
                  <strong className={hasActiveAccess ? "text-emerald-400" : "text-amber-400/90"}>
                    {hasActiveAccess ? "Active Interview License Granted" : "Upgrade Required to Start Interviews"}
                  </strong>
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              {paymentProvider === "stripe" && userProfile?.customerId ? (
                <button
                  onClick={handleOpenPortal}
                  disabled={portalLoading}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  Manage Subscription in Stripe Portal
                </button>
              ) : (
                <span className="text-xs text-gray-400">Upgrade or Change Plan</span>
              )}
              <button
                onClick={onOpenPricing}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                Pricing Section ↓
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Application Access Card */}
        <div className="bg-[#0F1117] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                Desktop Application Access <Zap className="w-5 h-5 text-amber-400" />
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Download and install CrackFlow for Windows. Free and paid authenticated users can install the application; starting an interview requires an active paid plan.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadInstaller}
                disabled={!user || downloadLoading}
                className="px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-all bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                {downloadLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Preparing Download...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Download CrackFlow Setup (.exe)
                  </>
                )}
              </button>
            </div>
          </div>


          {downloadInfo && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{downloadInfo}</span>
            </div>
          )}

          {downloadError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{downloadError}</span>
            </div>
          )}
        </div>


        {/* Plans & Checkout Selection Grid */}
        <div className="bg-[#0F1117] border border-white/10 rounded-3xl p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                Choose Your Plan <CreditCard className="w-5 h-5 text-amber-400" />
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Select a plan below to upgrade. Secure checkout powered by Stripe Test Mode.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {PLANS.map((plan) => {
              const isCurrentPlan = currentPlanTier === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                    isCurrentPlan
                      ? "bg-amber-500/10 border-amber-500/40"
                      : "bg-white/5 border-white/5 hover:border-white/20"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-base font-bold text-white">{plan.name}</span>
                      {isCurrentPlan && (
                        <span className="px-2 py-0.5 bg-amber-500 text-black font-bold text-[10px] rounded">
                          Current Plan
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-extrabold text-white mb-2">
                      {plan.currencySymbol}
                      {plan.price}
                      <span className="text-xs font-normal text-gray-400">
                        {plan.billingPeriodLabel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-4">{plan.description}</p>
                  </div>

                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isCurrentPlan || checkoutLoading === plan.id}
                    className={`w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isCurrentPlan
                        ? "bg-white/10 text-gray-400 cursor-not-allowed"
                        : "bg-amber-500 hover:bg-amber-400 text-black"
                    }`}
                  >
                    {checkoutLoading === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrentPlan ? (
                      "Active Plan"
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
