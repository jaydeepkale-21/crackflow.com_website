import React from "react";
import { Link } from "react-router";
import { Zap, ShieldCheck, FileText, HelpCircle, Mail, Receipt, Truck, RotateCcw, ExternalLink } from "lucide-react";
import { BUSINESS_CONFIG } from "../../config/business";

export function Footer() {
  const currentYear = BUSINESS_CONFIG.copyrightYear || 2026;

  const footerGroups = [
    {
      heading: "Product & Plans",
      links: [
        { label: "Features", href: "/#features", isAnchor: true },
        { label: "Pricing Details", href: "/pricing" },
        { label: "How It Works", href: "/#how-it-works", isAnchor: true },
        { label: "Competitor Comparison", href: "/#compare", isAnchor: true },
      ],
    },
    {
      heading: "Legal & Policies",
      links: [
        { label: "Terms & Conditions", href: "/terms-and-conditions" },
        { label: "Privacy Policy", href: "/privacy-policy" },
        { label: "Refund & Cancellation Policy", href: "/refund-policy" },
        { label: "Digital Delivery / Shipping Policy", href: "/shipping-policy" },
      ],
    },
    {
      heading: "Company & Support",
      links: [
        { label: "About Us", href: "/about" },
        { label: "Contact Us", href: "/contact" },
      ],
    },
  ];

  return (
    <footer
      className="py-14 md:py-16 px-5 md:px-10 border-t border-[#E5E7EB] bg-white text-[#171A1F]"
      style={{ fontFamily: "Manrope, sans-serif" }}
    >
      <div className="max-w-[1380px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="sm:col-span-2 md:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2 text-inherit no-underline">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                style={{ background: "#F5C518" }}
              >
                <Zap size={16} className="text-[#20252B] fill-current" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-[#171A1F]">CrackFlow</span>
            </Link>

            <p className="text-xs md:text-sm text-[#59616D] max-w-sm leading-relaxed">
              Native desktop AI copilot for real-time interview thought organization, speech-to-text assistance, and live coding guidance.
            </p>

            <div className="pt-1 text-xs text-[#59616D] space-y-1">
              <div>
                Operator: <span className="font-semibold text-[#171A1F] font-mono">{BUSINESS_CONFIG.legalBusinessName}</span>
              </div>
              <div>
                Support:{" "}
                <a href={`mailto:${BUSINESS_CONFIG.supportEmail}`} className="text-blue-600 hover:underline font-mono">
                  {BUSINESS_CONFIG.supportEmail}
                </a>
              </div>
              <div>
                Official Website:{" "}
                <a href={BUSINESS_CONFIG.websiteUrl} className="text-blue-600 hover:underline font-mono">
                  {BUSINESS_CONFIG.websiteUrl}
                </a>
              </div>
            </div>
          </div>

          {/* Nav Columns */}
          {footerGroups.map((group) => (
            <div key={group.heading} className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#171A1F]">
                {group.heading}
              </p>
              <ul className="space-y-2 text-xs md:text-sm list-none p-0 m-0">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {link.isExternal ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#59616D] hover:text-[#171A1F] transition-colors inline-flex items-center gap-1 no-underline"
                      >
                        <span>{link.label}</span>
                        <ExternalLink size={11} className="opacity-70" />
                      </a>
                    ) : link.isAnchor ? (
                      <a
                        href={link.href}
                        className="text-[#59616D] hover:text-[#171A1F] transition-colors no-underline"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-[#59616D] hover:text-[#171A1F] transition-colors no-underline font-medium"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-[#E5E7EB] text-xs text-[#59616D]">
          <div>
            © {currentYear} CrackFlow. All rights reserved.
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <span>Digital SaaS & Desktop Software</span>
            <span>•</span>
            <span>Payment Provider: {BUSINESS_CONFIG.paymentProviderName}</span>
            <span>•</span>
            <Link to="/shipping-policy" className="hover:underline text-[#59616D]">
              Digital Delivery Only
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
