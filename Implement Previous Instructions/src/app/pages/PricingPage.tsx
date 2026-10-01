import React from "react";
import { LegalLayout } from "../components/legal/LegalLayout";
import { PLANS } from "../../config/plans";
import { BUSINESS_CONFIG } from "../../config/business";
import { Check, Shield, AlertCircle, HelpCircle, ArrowRight, Zap, RefreshCw, Lock } from "lucide-react";
import { Link } from "react-router";

export function PricingPage() {
  return (
    <LegalLayout
      title="Pricing & Subscription Plans"
      subtitle="Transparent, upfront pricing in Indian Rupees (INR) for the CrackFlow desktop AI interview assistant. No hidden fees or automatic surprises."
      badge="Transparent Pricing"
      lastUpdated="October 2026"
    >
      <div className="space-y-10 text-sm md:text-base text-[#171A1F]">
        {/* Intro */}
        <section className="space-y-3">
          <p className="text-[#59616D] leading-relaxed">
            CrackFlow provides tiered access to its desktop AI copilot, speech-to-text processing, and real-time guidance engines. All subscriptions and licenses are delivered digitally upon successful payment completion.
          </p>
        </section>

        {/* Pricing Cards Grid */}
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 flex flex-col justify-between relative transition-all ${
                  plan.popular
                    ? "border-[#F5C518] bg-[#F5C518]/5 shadow-md shadow-[#F5C518]/10"
                    : "border-[#E5E7EB] bg-white shadow-sm"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-6 text-[11px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#F5C518] text-[#20252B] tracking-wider shadow-sm">
                    Most Popular
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#171A1F]">{plan.name}</h3>
                    <p className="text-xs text-[#59616D] mt-1 min-h-[32px]">
                      {plan.description}
                    </p>
                  </div>

                  <div className="border-t border-b border-[#E5E7EB] py-4 space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl md:text-4xl font-extrabold text-[#171A1F]">
                        {plan.currencySymbol}{plan.price}
                      </span>
                      <span className="text-xs md:text-sm text-[#59616D] font-medium">
                        {plan.billingPeriodLabel}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#59616D]">
                      Type:{" "}
                      <span className="font-semibold text-[#171A1F]">
                        {plan.billingPeriod === "monthly" ? "Recurring Monthly Subscription" : "One-Time Payment"}
                      </span>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <ul className="space-y-2.5 text-xs md:text-sm pt-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        {feature.included ? (
                          <Check size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                        ) : (
                          <span className="text-gray-300 select-none mt-0.5 shrink-0">✕</span>
                        )}
                        <span className={feature.included ? "text-[#171A1F]" : "text-gray-400"}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 space-y-3">
                  <Link
                    to="/#pricing"
                    className={`w-full py-3 rounded-xl font-bold text-xs md:text-sm text-center flex items-center justify-center gap-2 no-underline transition-all ${
                      plan.popular
                        ? "bg-[#F5C518] hover:bg-[#eab308] text-[#20252B] shadow-sm"
                        : "bg-[#171A1F] hover:bg-[#20252B] text-white"
                    }`}
                  >
                    <span>{plan.buttonText}</span>
                    <ArrowRight size={14} />
                  </Link>

                  <div className="text-center text-[11px] text-[#59616D]">
                    {plan.billingPeriod === "monthly" ? (
                      <span>Cancel anytime via dashboard</span>
                    ) : (
                      <span>Pay once, no recurring fees</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Lifetime Plan Clarification Section (Crucial) */}
        <section className="bg-[#FAFAF8] border border-[#E5E7EB] rounded-2xl p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-2 text-base md:text-lg font-bold text-[#171A1F]">
            <Zap size={20} className="text-[#F5C518]" />
            <span>Definition and Scope of "Lifetime Pass"</span>
          </div>
          <div className="space-y-3 text-xs md:text-sm text-[#59616D] leading-relaxed">
            <p>
              In accordance with consumer protection guidelines and payment gateway transparency requirements, the term <strong>"Lifetime"</strong> refers strictly to the operational commercial lifespan of the CrackFlow service offering, not the biological lifetime of the purchaser or an infinite corporate existence.
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>No Recurring Fees:</strong> Lifetime Pass holders pay a single one-time charge (₹4999) and receive continuous hosted access to CrackFlow Pro capabilities for as long as CrackFlow operates the service, without monthly or annual renewals.
              </li>
              <li>
                <strong>Updates Included:</strong> All minor and major software updates released for the current CrackFlow desktop client architecture are included without additional licensing charges.
              </li>
              <li>
                <strong>Fair Use & Cloud Limits:</strong> To prevent infrastructure abuse, AI completions and speech transcription are governed by standard fair-use thresholds sufficient for typical personal interview schedules.
              </li>
              <li>
                <strong>Service Longevity:</strong> While we endeavor to maintain CrackFlow indefinitely, access depends upon continued operational feasibility. In the unlikely event of service discontinuation, reasonable advance notice will be provided to account holders.
              </li>
            </ul>
          </div>
        </section>

        {/* Plan Comparison & Policies Table */}
        <section className="space-y-4">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#171A1F] border-b pb-2 border-[#E5E7EB]">
            Billing & Policy Breakdown by Plan
          </h2>
          <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
            <table className="w-full text-left text-xs md:text-sm border-collapse">
              <thead className="bg-[#F4F4F0] text-[#171A1F]">
                <tr>
                  <th className="p-3.5 border-b border-[#E5E7EB] font-bold">Plan Detail</th>
                  <th className="p-3.5 border-b border-[#E5E7EB] font-bold">Starter</th>
                  <th className="p-3.5 border-b border-[#E5E7EB] font-bold">Pro</th>
                  <th className="p-3.5 border-b border-[#E5E7EB] font-bold">Lifetime Pass</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#59616D]">
                <tr>
                  <td className="p-3.5 font-medium text-[#171A1F]">Price</td>
                  <td className="p-3.5">₹499 / month</td>
                  <td className="p-3.5">₹999 / month</td>
                  <td className="p-3.5">₹4999 one-time</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-[#171A1F]">Billing Type</td>
                  <td className="p-3.5">Recurring subscription</td>
                  <td className="p-3.5">Recurring subscription</td>
                  <td className="p-3.5">Single charge</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-[#171A1F]">Billing Cycle</td>
                  <td className="p-3.5">Every 30 days</td>
                  <td className="p-3.5">Every 30 days</td>
                  <td className="p-3.5">Perpetual service license</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-[#171A1F]">Cancellation</td>
                  <td className="p-3.5">Cancel anytime; active until period end</td>
                  <td className="p-3.5">Cancel anytime; active until period end</td>
                  <td className="p-3.5">N/A (No renewals)</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-[#171A1F]">Refund Policy</td>
                  <td className="p-3.5" colSpan={3}>
                    Subject to our{" "}
                    <Link to="/refund-policy" className="text-blue-600 hover:underline font-semibold">
                      Refund & Cancellation Policy
                    </Link>{" "}
                    (available for unused entitlements within the refund window).
                  </td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-[#171A1F]">Digital Delivery</td>
                  <td className="p-3.5" colSpan={3}>
                    Instant electronic entitlement activation upon successful payment. See our{" "}
                    <Link to="/shipping-policy" className="text-blue-600 hover:underline font-semibold">
                      Digital Delivery Policy
                    </Link>
                    .
                  </td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-[#171A1F]">Payment Processing</td>
                  <td className="p-3.5" colSpan={3}>
                    Processed securely via {BUSINESS_CONFIG.paymentProviderName}. Instant electronic receipts and order confirmations issued upon successful checkout.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Pre-Payment Notice & Legal Acceptance */}
        <section className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs md:text-sm space-y-3">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <Shield size={18} />
            <span>Pre-Purchase Legal Agreement Notice</span>
          </div>
          <p className="leading-relaxed">
            By initiating checkout and completing your purchase on CrackFlow, you agree to our{" "}
            <Link to="/terms-and-conditions" className="font-bold underline text-amber-950 hover:text-black">
              Terms & Conditions
            </Link>
            , acknowledge our{" "}
            <Link to="/privacy-policy" className="font-bold underline text-amber-950 hover:text-black">
              Privacy Policy
            </Link>
            , and accept our{" "}
            <Link to="/refund-policy" className="font-bold underline text-amber-950 hover:text-black">
              Refund & Cancellation Policy
            </Link>{" "}
            and{" "}
            <Link to="/shipping-policy" className="font-bold underline text-amber-950 hover:text-black">
              Digital Delivery Policy
            </Link>
            .
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-amber-800">
            <span className="flex items-center gap-1">
              <Lock size={12} /> 256-bit Encrypted Checkout
            </span>
            <span>•</span>
            <span>Processed via Verified Gateway ({BUSINESS_CONFIG.paymentProviderName})</span>
            <span>•</span>
            <span>Instant Digital Activation</span>
          </div>
        </section>
      </div>
    </LegalLayout>
  );
}
