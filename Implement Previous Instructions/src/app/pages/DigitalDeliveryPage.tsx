import React from "react";
import { LegalLayout } from "../components/legal/LegalLayout";
import { BUSINESS_CONFIG } from "../../config/business";
import {
  Truck,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Mail,
  HelpCircle,
} from "lucide-react";
import { Link } from "react-router";

export function DigitalDeliveryPage() {
  return (
    <LegalLayout
      title="Digital Delivery Policy (Shipping / Delivery Policy)"
      subtitle="Details on how CrackFlow digital software, desktop client installers, and subscription entitlements are delivered to customers."
      badge="Fulfillment Policy"
      lastUpdated="October 2026"
    >
      <div className="space-y-8 text-sm md:text-base text-[#171A1F]">
        {/* Core Statement */}
        <section className="p-5 rounded-2xl bg-[#FAFAF8] border border-[#E5E7EB] space-y-3">
          <div className="flex items-center gap-2.5 font-bold text-[#171A1F] text-base">
            <Truck size={20} className="text-[#F5C518]" />
            <span>Digital-Only Service Delivery (No Physical Shipment)</span>
          </div>
          <p className="text-[#59616D] leading-relaxed text-xs md:text-sm">
            <strong>CrackFlow</strong> is a purely digital Software-as-a-Service (SaaS) and downloadable desktop software product.{" "}
            <span className="font-semibold text-[#171A1F]">
              No physical goods, parcels, hardware tokens, CD-ROMs, or courier shipments are ever sent or delivered to your postal address.
            </span>{" "}
            All deliveries, product access, software installers, and subscription entitlements occur electronically via the Internet immediately following payment completion.
          </p>
        </section>

        {/* Delivery Workflow */}
        <section className="space-y-4">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#171A1F] border-b pb-2 border-[#E5E7EB]">
            1. Electronic Delivery Process & Timeline
          </h2>
          <p className="text-[#59616D] leading-relaxed">
            The fulfillment lifecycle for CrackFlow subscriptions and licenses proceeds as follows:
          </p>

          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-3 p-4 rounded-xl border border-[#E5E7EB] bg-white">
              <div className="w-7 h-7 rounded-full bg-[#F5C518]/20 text-[#20252B] font-bold flex items-center justify-center shrink-0 text-xs">
                1
              </div>
              <div className="space-y-1">
                <div className="font-bold text-[#171A1F]">Instant Entitlement Provisioning</div>
                <p className="text-xs md:text-sm text-[#59616D] leading-relaxed">
                  Upon authorized payment confirmation by our verified payment gateway ({BUSINESS_CONFIG.paymentProviderName}), our backend webhook automatically provisions your account entitlement in our database in real time (typically within 1 to 5 seconds).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl border border-[#E5E7EB] bg-white">
              <div className="w-7 h-7 rounded-full bg-[#F5C518]/20 text-[#20252B] font-bold flex items-center justify-center shrink-0 text-xs">
                2
              </div>
              <div className="space-y-1">
                <div className="font-bold text-[#171A1F]">Web Dashboard & Confirmation Receipt</div>
                <p className="text-xs md:text-sm text-[#59616D] leading-relaxed">
                  You are redirected to the CrackFlow confirmation screen, and an electronic transaction receipt/invoice is dispatched to your registered account email by the payment gateway.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl border border-[#E5E7EB] bg-white">
              <div className="w-7 h-7 rounded-full bg-[#F5C518]/20 text-[#20252B] font-bold flex items-center justify-center shrink-0 text-xs">
                3
              </div>
              <div className="space-y-1">
                <div className="font-bold text-[#171A1F]">Desktop Software Download Access</div>
                <p className="text-xs md:text-sm text-[#59616D] leading-relaxed">
                  Active subscribers immediately unlock access to download the latest authenticated CrackFlow Windows desktop installer directly from the web dashboard.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl border border-[#E5E7EB] bg-white">
              <div className="w-7 h-7 rounded-full bg-[#F5C518]/20 text-[#20252B] font-bold flex items-center justify-center shrink-0 text-xs">
                4
              </div>
              <div className="space-y-1">
                <div className="font-bold text-[#171A1F]">Desktop Client Authorization</div>
                <p className="text-xs md:text-sm text-[#59616D] leading-relaxed">
                  To activate the desktop copilot, users log in using their web account credentials or use our secure single-use authorization bridge (<code>crackflow://auth</code>), binding their active entitlement to their desktop session.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Subscription Continuity */}
        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#171A1F] border-b pb-2 border-[#E5E7EB]">
            2. Duration & Continuity of Access
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-[#59616D]">
            <li>
              <strong>Monthly Plans (Starter & Pro):</strong> Entitlement is delivered continuously for the duration of the active billing period (30 days). Access renews automatically upon successful renewal payment unless canceled by the user prior to the billing cycle end date.
            </li>
            <li>
              <strong>Lifetime Pass:</strong> Entitlement is delivered continuously for the operational lifetime of the CrackFlow service offering without recurring renewal requirements.
            </li>
            <li>
              <strong>Service Suspension or Expiration:</strong> If a recurring subscription payment fails or the user cancels their plan, access continues until the end of the paid billing period, after which desktop AI assistance features revert to inactive status.
            </li>
          </ul>
        </section>

        {/* Technical Delivery Issues */}
        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#171A1F] border-b pb-2 border-[#E5E7EB]">
            3. Delivery Failures & Support Resolution
          </h2>
          <p className="text-[#59616D] leading-relaxed">
            In rare instances where network interruptions, banking gateway delays, or browser caching prevent immediate digital entitlement activation:
          </p>
          <ol className="list-decimal pl-5 space-y-2 text-[#59616D]">
            <li>Refresh your web dashboard at <code>{BUSINESS_CONFIG.websiteUrl}/dashboard</code>.</li>
            <li>Verify whether your bank account or payment provider was debited and note your payment transaction ID.</li>
            <li>
              If your account status does not reflect your active plan within 15 minutes of payment, email our support team at{" "}
              <a href={`mailto:${BUSINESS_CONFIG.supportEmail}`} className="text-blue-600 hover:underline font-mono">
                {BUSINESS_CONFIG.supportEmail}
              </a>{" "}
              with the subject <strong>"Delivery / Activation Assistance"</strong> and include your registered email and transaction reference.
            </li>
            <li>
              Our support team will manually verify the payment ledger and restore or activate your entitlement within our support response window ({BUSINESS_CONFIG.supportResponseTime}).
            </li>
          </ol>
        </section>

        {/* Refunds Link */}
        <section className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs md:text-sm space-y-2">
          <div className="font-semibold flex items-center gap-1.5 text-amber-900">
            <AlertCircle size={16} />
            <span>Connection to Refund & Cancellation Policy</span>
          </div>
          <p className="leading-relaxed">
            Because CrackFlow begins digital service delivery immediately upon account activation, cancellations and refund requests are governed strictly by our{" "}
            <Link to="/refund-policy" className="font-bold underline text-amber-950 hover:text-black">
              Refund & Cancellation Policy
            </Link>
            . Please review the refund terms before completing checkout.
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}
