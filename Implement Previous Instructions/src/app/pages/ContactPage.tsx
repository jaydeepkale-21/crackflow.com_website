import React from "react";
import { LegalLayout } from "../components/legal/LegalLayout";
import { BUSINESS_CONFIG } from "../../config/business";
import {
  Mail,
  Phone,
  MapPin,
  Building2,
  Clock,
  Globe,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";

export function ContactPage() {
  return (
    <LegalLayout
      title="Contact Us"
      subtitle="Reach the CrackFlow team for support, subscription inquiries, and compliance. All inquiries are handled directly via our verified support email."
      badge="Merchant & Support Information"
      lastUpdated="October 2026"
    >
      <div className="space-y-8 text-sm md:text-base text-[#171A1F]">
        {/* Primary Support Email Callout */}
        <section className="bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border border-[#F5C518]/40 rounded-2xl p-6 md:p-8 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F5C518] flex items-center justify-center text-[#20252B] shadow-sm shrink-0">
              <Mail size={22} className="text-[#20252B]" />
            </div>
            <div>
              <div className="text-xs uppercase font-extrabold tracking-wider text-[#59616D]">
                Primary Contact Channel
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-[#171A1F]">
                Direct Customer Support Email
              </h2>
            </div>
          </div>

          <p className="text-sm md:text-base text-[#59616D] leading-relaxed">
            We provide all customer support, billing assistance, technical guidance, and refund resolution directly through our verified email desk:
          </p>

          <div className="bg-white p-4 md:p-5 rounded-xl border border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-[#59616D] uppercase tracking-wider mb-1">
                Official Support Desk Email
              </div>
              <a
                href={`mailto:${BUSINESS_CONFIG.supportEmail}`}
                className="text-lg md:text-xl font-extrabold text-blue-600 hover:underline font-mono"
              >
                {BUSINESS_CONFIG.supportEmail}
              </a>
            </div>
            <a
              href={`mailto:${BUSINESS_CONFIG.supportEmail}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#F5C518] hover:bg-[#eab308] text-[#20252B] font-bold text-sm shadow-sm transition-all no-underline shrink-0"
            >
              <Mail size={16} />
              <span>Email Support Team</span>
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[#59616D] pt-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock size={14} className="text-[#171A1F]" /> Standard Turnaround: {BUSINESS_CONFIG.supportResponseTime}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck size={14} className="text-emerald-600" /> Monitored Daily
            </span>
          </div>
        </section>

        {/* Official Merchant Details */}
        <section className="bg-[#FAFAF8] border border-[#E5E7EB] rounded-2xl p-6 md:p-8 space-y-6">
          <div className="border-b border-[#E5E7EB] pb-4">
            <h2 className="text-lg md:text-xl font-bold text-[#171A1F]">
              Business Operator & Registered Details
            </h2>
            <p className="text-xs md:text-sm text-[#59616D] mt-1">
              Official merchant credentials provided for customer reference and payment gateway verification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#F5C518]/20 flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-[#20252B]" />
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase font-bold text-[#59616D]">
                  Legal Entity / Business Operator
                </div>
                <div className="text-sm font-bold text-[#171A1F] font-mono">
                  {BUSINESS_CONFIG.legalBusinessName}
                </div>
                <div className="text-xs text-[#59616D]">Brand & Platform: CrackFlow</div>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#F5C518]/20 flex items-center justify-center shrink-0">
                <Phone size={18} className="text-[#20252B]" />
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase font-bold text-[#59616D]">
                  Contact Phone
                </div>
                <div className="text-sm font-bold text-[#171A1F] font-mono">
                  {BUSINESS_CONFIG.contactPhone}
                </div>
                <div className="text-xs text-[#59616D]">Customer telephone helpline</div>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#F5C518]/20 flex items-center justify-center shrink-0">
                <MapPin size={18} className="text-[#20252B]" />
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase font-bold text-[#59616D]">
                  Registered / Operating Address
                </div>
                <div className="text-sm font-semibold text-[#171A1F] font-mono leading-relaxed">
                  {BUSINESS_CONFIG.registeredAddress}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#F5C518]/20 flex items-center justify-center shrink-0">
                <Globe size={18} className="text-[#20252B]" />
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase font-bold text-[#59616D]">Official Website</div>
                <div>
                  <a
                    href={BUSINESS_CONFIG.websiteUrl}
                    className="text-sm font-bold text-blue-600 hover:underline font-mono"
                  >
                    {BUSINESS_CONFIG.websiteUrl}
                  </a>
                </div>
                <div className="text-xs text-[#59616D]">Digital SaaS Platform</div>
              </div>
            </div>
          </div>
        </section>

        {/* Email Guidelines Box */}
        <section className="p-5 rounded-2xl border border-[#E5E7EB] bg-white space-y-3">
          <div className="font-bold text-[#171A1F] flex items-center gap-2">
            <HelpCircle size={18} className="text-[#F5C518]" />
            <span>Email Inquiry Guidelines</span>
          </div>
          <p className="text-xs md:text-sm text-[#59616D] leading-relaxed">
            When emailing our support team at <a href={`mailto:${BUSINESS_CONFIG.supportEmail}`} className="text-blue-600 hover:underline font-mono font-medium">{BUSINESS_CONFIG.supportEmail}</a>, please include your registered account email, order or payment reference (if applicable), and a clear description of your issue. This ensures the fastest turnaround.
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}
