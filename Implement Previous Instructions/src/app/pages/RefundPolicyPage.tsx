import React from "react";
import { LegalLayout } from "../components/legal/LegalLayout";
import { BUSINESS_CONFIG } from "../../config/business";
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Clock,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { Link } from "react-router";

export function RefundPolicyPage() {
  return (
    <LegalLayout
      title="Cancellation & Refund Policy"
      subtitle="Clear, transparent terms regarding subscription cancellations, refund eligibility, duplicate transaction resolution, and digital service delivery."
      badge="Customer Protection"
      lastUpdated="October 2026"
    >
      <div className="space-y-10 text-xs md:text-sm text-[#171A1F] leading-relaxed">
        {/* Verification Summary Card */}
        <section className="p-5 rounded-2xl bg-[#FAFAF8] border border-[#E5E7EB] space-y-3">
          <div className="flex items-center gap-2 font-bold text-[#171A1F] text-sm md:text-base">
            <RotateCcw size={20} className="text-[#F5C518]" />
            <span>Policy Summary for Customers & Payment Partners</span>
          </div>
          <p className="text-[#59616D] leading-relaxed">
            CrackFlow is committed to fair and transparent billing. Because our desktop software and real-time AI cloud compute are provisioned immediately upon purchase, we offer clear cancellation mechanisms and refund safeguards for accidental payments, technical activation failures, and duplicate charges.
          </p>
        </section>

        {/* Section 1: Subscription Cancellation */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            1. Subscription Cancellation
          </h2>
          <p className="text-[#59616D]">
            You may cancel your recurring monthly subscription (Starter or Pro) at any time through your web account dashboard or by submitting a written request to{" "}
            <a href={`mailto:${BUSINESS_CONFIG.supportEmail}`} className="text-blue-600 underline font-mono">
              {BUSINESS_CONFIG.supportEmail}
            </a>
            .
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-[#59616D]">
            <li>
              <strong>Immediate Cancellation Effect:</strong> Canceling your plan stops all future automatic renewal charges immediately.
            </li>
            <li>
              <strong>Access Retention:</strong> You retain full access to all features of your active plan until the end of your current 30-day paid billing cycle.
            </li>
            <li>
              <strong>No Cancellation Penalties:</strong> There are zero cancellation fees or penalties for ending a subscription early.
            </li>
          </ul>
        </section>

        {/* Section 2: Refund Eligibility Window */}
        <section className="space-y-4">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            2. Refund Eligibility & Refund Window
          </h2>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
            <div className="font-bold flex items-center gap-1.5">
              <Clock size={16} />
              <span>Refund Request Window</span>
            </div>
            <p className="leading-relaxed">
              Eligible refund requests must be submitted within{" "}
              <strong className="font-mono text-black font-extrabold bg-amber-200/80 px-1.5 py-0.5 rounded">
                {BUSINESS_CONFIG.refundWindow}
              </strong>{" "}
              of the initial transaction date, subject to the conditions set forth below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Eligible Conditions */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Eligible for Full Refund</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-xs text-emerald-800">
                <li>
                  <strong>Duplicate Payments:</strong> Accidental double-billing or multiple simultaneous transactions for the same account.
                </li>
                <li>
                  <strong>Technical Activation Failure:</strong> If our backend systems fail to provision your paid entitlement and our support team is unable to resolve the issue within 48 business hours.
                </li>
                <li>
                  <strong>Unused Purchases:</strong> Subscriptions or licenses where the user has not initiated any live interview transcription sessions, speech-to-text queries, or AI completions within the {BUSINESS_CONFIG.refundWindow} window.
                </li>
                <li>
                  <strong>Unauthorized Transactions:</strong> Documented fraudulent charges reported promptly prior to service utilization.
                </li>
              </ul>
            </div>

            {/* Ineligible Conditions */}
            <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 space-y-2">
              <div className="flex items-center gap-2 font-bold text-red-900 text-sm">
                <XCircle size={16} className="text-red-600" />
                <span>Ineligible for Refund</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-xs text-red-800">
                <li>
                  <strong>Actively Utilized Services:</strong> Accounts where live interview transcription, OCR, or AI assistance features have been actively consumed.
                </li>
                <li>
                  <strong>Requests Outside Refund Window:</strong> Requests submitted after {BUSINESS_CONFIG.refundWindow} from the date of purchase.
                </li>
                <li>
                  <strong>Subjective Assessment Outcome:</strong> CrackFlow is an assistive productivity tool; dissatisfaction with an interview result, failure to pass an interview, or employer hiring decisions are not grounds for a refund.
                </li>
                <li>
                  <strong>Terms of Service Violations:</strong> Accounts suspended for reverse engineering, account sharing, or abusive activity.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: Lifetime Plan Policy */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            3. Lifetime Pass Refund Terms
          </h2>
          <p className="text-[#59616D]">
            The CrackFlow Lifetime Pass is a discounted one-time payment for permanent hosted access. Refund requests for Lifetime purchases follow the same {BUSINESS_CONFIG.refundWindow} window rule and require that the account has not actively consumed cloud AI or speech recognition capacity. Once significant session volume has been processed, the Lifetime fee becomes non-refundable.
          </p>
        </section>

        {/* Section 4: Refund Request Process */}
        <section className="space-y-4">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            4. How to Request a Refund
          </h2>
          <p className="text-[#59616D]">
            To submit an official refund request, follow these simple steps:
          </p>
          <ol className="list-decimal pl-5 space-y-2 text-[#59616D]">
            <li>
              Send an email to{" "}
              <a href={`mailto:${BUSINESS_CONFIG.supportEmail}`} className="text-blue-600 underline font-mono">
                {BUSINESS_CONFIG.supportEmail}
              </a>{" "}
              from your registered CrackFlow account email address.
            </li>
            <li>
              Include the subject line: <strong>"Refund Request - [Your Order/Payment ID]"</strong>.
            </li>
            <li>
              Provide your transaction reference ID (from your {BUSINESS_CONFIG.paymentProviderName} receipt), date of payment, and the specific reason for your request.
            </li>
            <li>
              Our support team will verify your account status and respond within our standard response window ({BUSINESS_CONFIG.supportResponseTime}).
            </li>
          </ol>
        </section>

        {/* Section 5: Payout Timeline */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            5. Processing Timeline & Payment Method Behavior
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-[#59616D]">
            <li>
              <strong>Original Payment Method:</strong> Approved refunds are credited strictly back to the original source payment instrument (credit card, debit card, UPI, or net banking) used during checkout. We do not issue cash or third-party bank transfers.
            </li>
            <li>
              <strong>Settlement Timeframe:</strong> Once initiated by our billing team, the payment gateway typically credits funds back to your account within <strong>5 to 7 business days</strong>, depending on your issuing bank's clearing cycle.
            </li>
            <li>
              <strong>Entitlement Deactivation:</strong> Upon approval of a refund, the associated plan entitlement and desktop license access are immediately revoked.
            </li>
          </ul>
        </section>

        {/* Section 6: Chargebacks */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            6. Chargebacks and Payment Disputes
          </h2>
          <p className="text-[#59616D]">
            We encourage customers to contact our support team before initiating a chargeback or payment dispute with their bank. Most issues (such as accidental duplicate charges) can be resolved directly and much faster by our team. Unjustified or fraudulent chargebacks may result in immediate permanent suspension of your CrackFlow account.
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}
