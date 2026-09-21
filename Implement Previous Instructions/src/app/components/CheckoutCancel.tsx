import React from "react";
import { XCircle, ArrowLeft, CreditCard } from "lucide-react";

interface CheckoutCancelProps {
  onBackToPricing: () => void;
  onGoToDashboard: () => void;
}

export const CheckoutCancel: React.FC<CheckoutCancelProps> = ({
  onBackToPricing,
  onGoToDashboard,
}) => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-[#0F1117] border border-white/10 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-gray-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="py-6 space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
            <XCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Checkout Cancelled</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              No charge was made. You can return to view plans or continue using your existing account.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <button
              onClick={onBackToPricing}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" /> View Plans & Pricing
            </button>
            <button
              onClick={onGoToDashboard}
              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
