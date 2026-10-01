import React, { useEffect } from "react";
import { Link, useLocation } from "react-router";
import {
  Zap,
  ArrowLeft,
  ShieldCheck,
  FileText,
  HelpCircle,
  Mail,
  Receipt,
  Truck,
  RotateCcw,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { BUSINESS_CONFIG } from "../../../config/business";
import { Footer } from "../Footer";

interface LegalLayoutProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  badge?: string;
  children: React.ReactNode;
}

const LEGAL_NAV = [
  { label: "About Us", href: "/about", icon: HelpCircle },
  { label: "Pricing Details", href: "/pricing", icon: CheckCircle },
  { label: "Terms & Conditions", href: "/terms-and-conditions", icon: FileText },
  { label: "Privacy Policy", href: "/privacy-policy", icon: ShieldCheck },
  { label: "Refund & Cancellation", href: "/refund-policy", icon: RotateCcw },
  { label: "Digital Delivery Policy", href: "/shipping-policy", icon: Truck },
  { label: "Contact Support", href: "/contact", icon: Mail },
];

export function LegalLayout({
  title,
  subtitle,
  lastUpdated = "October 2026",
  badge = "Official Policy",
  children,
}: LegalLayoutProps) {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#171A1F] flex flex-col font-['Manrope',sans-serif]">
      {/* Top Banner Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E5E7EB] transition-all">
        <div className="max-w-[1380px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-2.5 text-inherit no-underline group"
              title="Return to CrackFlow Home"
            >
              <div className="w-8 h-8 rounded-lg bg-[#F5C518] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Zap size={18} className="text-[#20252B] fill-current" />
              </div>
              <span className="font-extrabold text-lg tracking-tight">CrackFlow</span>
            </Link>

            <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-md bg-[#F4F4F0] text-[#59616D]">
              Legal & Business Center
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-[#59616D] hover:text-[#171A1F] px-3 py-1.5 rounded-lg hover:bg-[#F4F4F0] transition-colors no-underline"
            >
              <ArrowLeft size={14} />
              <span>Back to Home</span>
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-1 text-xs md:text-sm font-bold text-[#20252B] bg-[#F5C518] hover:bg-[#eab308] px-4 py-1.5 rounded-full shadow-sm transition-all no-underline"
            >
              <span>View Plans</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <div className="bg-gradient-to-b from-[#FFFFFF] to-[#FAFAF8] border-b border-[#E5E7EB] py-10 md:py-14">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#F5C518]/20 text-[#20252B] border border-[#F5C518]/40">
              {badge}
            </span>
            <span className="text-xs text-[#59616D]">Last Updated: {lastUpdated}</span>
            <span className="text-xs text-[#59616D]">•</span>
            <span className="text-xs text-[#59616D]">Public Documentation</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#171A1F] mb-3">
            {title}
          </h1>
          {subtitle && (
            <p className="text-base md:text-lg text-[#59616D] max-w-3xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-[1200px] w-full mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Document Body */}
          <main className="lg:col-span-8 bg-white border border-[#E5E7EB] rounded-2xl p-6 md:p-10 shadow-sm leading-relaxed">
            {children}
          </main>

          {/* Sidebar Navigation */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            {/* Quick Directory Card */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#59616D] mb-4">
                Legal & Verification Links
              </h3>
              <nav className="space-y-1">
                {LEGAL_NAV.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  if (item.isExternal) {
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors no-underline text-[#59616D] hover:text-[#171A1F] hover:bg-[#F4F4F0]"
                      >
                        <Icon size={16} className="text-[#59616D]" />
                        <span className="flex-1">{item.label}</span>
                        <ExternalLink size={12} className="opacity-60" />
                      </a>
                    );
                  }
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors no-underline ${
                        isActive
                          ? "bg-[#F5C518]/15 text-[#171A1F] font-bold border border-[#F5C518]/40"
                          : "text-[#59616D] hover:text-[#171A1F] hover:bg-[#F4F4F0]"
                      }`}
                    >
                      <Icon
                        size={16}
                        className={isActive ? "text-[#20252B]" : "text-[#59616D]"}
                      />
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Business Contact Box */}
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#59616D]">
                Customer & Compliance Contact
              </h4>
              <p className="text-xs text-[#59616D] leading-relaxed">
                For questions regarding legal terms, invoices, refund requests, or compliance inquiries:
              </p>
              <div className="bg-[#FAFAF8] p-3 rounded-xl border border-[#E5E7EB] space-y-1 text-xs">
                <div className="font-semibold text-[#171A1F]">Email Support:</div>
                <a
                  href={`mailto:${BUSINESS_CONFIG.supportEmail}`}
                  className="text-blue-600 hover:underline font-mono text-[11px]"
                >
                  {BUSINESS_CONFIG.supportEmail}
                </a>
                <div className="text-[11px] text-[#59616D] pt-1">
                  Response SLA: {BUSINESS_CONFIG.supportResponseTime}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}

