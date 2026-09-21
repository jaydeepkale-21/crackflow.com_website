import React, { useEffect, useState } from "react";
import { CheckCircle2, Clock, Loader2, Download, ArrowRight, RefreshCw } from "lucide-react";
import { getMe } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

interface CheckoutSuccessProps {
  onGoToDashboard: () => void;
  onDownloadApp?: () => void;
}

export const CheckoutSuccess: React.FC<CheckoutSuccessProps> = ({
  onGoToDashboard,
  onDownloadApp,
}) => {
  const { refreshBackend, refreshProfile } = useAuth();
  const [polling, setPolling] = useState<boolean>(true);
  const [activated, setActivated] = useState<boolean>(false);
  const [attempts, setAttempts] = useState<number>(0);
  const [planTier, setPlanTier] = useState<string>("pro");

  const MAX_ATTEMPTS = 10; // 10 attempts * 3s = 30s

  useEffect(() => {
    let timer: any = null;
    let currentAttempts = 0;

    const checkStatus = async () => {
      currentAttempts++;
      setAttempts(currentAttempts);

      try {
        const res = await getMe();
        if (res.success && res.data && res.data.hasActiveAccess) {
          setActivated(true);
          setPlanTier(res.data.planTier || "pro");
          setPolling(false);
          await refreshBackend();
          await refreshProfile();
          return;
        }
      } catch (err) {
        console.warn("[CheckoutSuccess] Error checking entitlement:", err);
      }

      if (currentAttempts >= MAX_ATTEMPTS) {
        setPolling(false);
      } else {
        timer = setTimeout(checkStatus, 3000);
      }
    };

    // Initial check after short delay (to let webhook arrive)
    timer = setTimeout(checkStatus, 1500);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleManualRetry = async () => {
    setPolling(true);
    try {
      const res = await getMe();
      if (res.success && res.data && res.data.hasActiveAccess) {
        setActivated(true);
        setPlanTier(res.data.planTier || "pro");
        await refreshBackend();
        await refreshProfile();
      }
    } finally {
      setPolling(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-[#0F1117] border border-white/10 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {polling ? (
          <div className="py-8 space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Payment Received</h2>
              <p className="text-sm text-gray-400">
                Confirming your subscription with our secure servers... ({attempts}/{MAX_ATTEMPTS})
              </p>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-300"
                style={{ width: `${(attempts / MAX_ATTEMPTS) * 100}%` }}
              />
            </div>
          </div>
        ) : activated ? (
          <div className="py-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active Entitlement
              </span>
              <h2 className="text-2xl font-extrabold text-white">
                Welcome to CrackFlow {planTier.toUpperCase()}!
              </h2>
              <p className="text-sm text-gray-400">
                Your payment was verified. Real-time interview assistance and desktop access are now active on your account.
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <button
                onClick={onGoToDashboard}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </button>

              {onDownloadApp && (
                <button
                  onClick={onDownloadApp}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download Desktop App
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Clock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Activating Plan</h2>
              <p className="text-sm text-amber-300/90 leading-relaxed">
                Payment received. Your CrackFlow plan is still being activated. Please refresh or try again shortly.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Webhook confirmation is in progress. Your access will be automatically available as soon as it syncs.
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <button
                onClick={handleManualRetry}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Check Status Again
              </button>
              <button
                onClick={onGoToDashboard}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                Continue to Dashboard →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
