import React from "react";
import { LegalLayout } from "../components/legal/LegalLayout";
import { BUSINESS_CONFIG } from "../../config/business";
import {
  Monitor,
  Mic,
  Cpu,
  Shield,
  Layers,
  HelpCircle,
  Mail,
  MapPin,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router";

export function AboutPage() {
  return (
    <LegalLayout
      title="About CrackFlow"
      subtitle="Learn about our mission, product architecture, digital delivery model, and the team behind the CrackFlow AI interview assistant."
      badge="Company & Product Overview"
      lastUpdated="October 2026"
    >
      <div className="space-y-8 text-sm md:text-base text-[#171A1F]">
        {/* Section 1: Introduction */}
        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#171A1F] border-b pb-2 border-[#E5E7EB]">
            1. Who We Are
          </h2>
          <p className="leading-relaxed text-[#59616D]">
            <strong className="text-[#171A1F]">CrackFlow</strong> ({BUSINESS_CONFIG.websiteUrl}) is an independent digital software service designed to provide real-time, context-aware artificial intelligence assistance during technical and behavioral interviews.
          </p>
          <p className="leading-relaxed text-[#59616D]">
            Job interviews in high-demand technical fields often place intense cognitive loads on candidates. CrackFlow was built to act as a structured, unobtrusive digital copilot—helping candidates organize thoughts, reference system design patterns, review code complexity, and ground their responses in their authentic personal experience.
          </p>
        </section>

        {/* Section 2: What CrackFlow Does */}
        <section className="space-y-4">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#171A1F] border-b pb-2 border-[#E5E7EB]">
            2. What CrackFlow Does
          </h2>
          <p className="leading-relaxed text-[#59616D]">
            CrackFlow is a digital software system comprising two interconnected components: a web-based account and entitlement platform, and a specialized native desktop application for Windows.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#FAFAF8] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#171A1F]">
                <Mic size={18} className="text-[#F5C518]" />
                <span>Speech-to-Text Transcription</span>
              </div>
              <p className="text-xs md:text-sm text-[#59616D] leading-relaxed">
                When explicitly activated by the user during an interview session, CrackFlow captures live microphone and system audio to stream high-accuracy real-time speech transcription via secure cloud endpoints.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#FAFAF8] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#171A1F]">
                <Cpu size={18} className="text-[#F5C518]" />
                <span>AI Response Synthesis</span>
              </div>
              <p className="text-xs md:text-sm text-[#59616D] leading-relaxed">
                Transcribed dialogue is processed through advanced neural language models via our secure cloud infrastructure to generate structured talking points, algorithm outlines, and concise explanations.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#FAFAF8] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#171A1F]">
                <Layers size={18} className="text-[#F5C518]" />
                <span>Context Grounding</span>
              </div>
              <p className="text-xs md:text-sm text-[#59616D] leading-relaxed">
                Users can upload their own resume and target job descriptions prior to an interview. AI outputs reference the user's authentic skills and background rather than generating generic responses.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#FAFAF8] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#171A1F]">
                <Monitor size={18} className="text-[#F5C518]" />
                <span>Private Desktop Overlay</span>
              </div>
              <p className="text-xs md:text-sm text-[#59616D] leading-relaxed">
                The desktop client runs as a native Windows application featuring a transparent overlay with hardware-level display affinity, designed to remain private and excluded from screen-sharing software.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Who the Product is Designed For */}
        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#171A1F] border-b pb-2 border-[#E5E7EB]">
            3. Target Audience & Permitted Use
          </h2>
          <p className="leading-relaxed text-[#59616D]">
            CrackFlow is designed for:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-[#59616D]">
            <li>Software developers, data engineers, and technical professionals preparing for competitive technical rounds.</li>
            <li>Candidates seeking structured feedback and real-time thought organization during conversational assessments.</li>
            <li>Professionals conducting self-directed mock interviews and practicing live technical communication.</li>
          </ul>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs md:text-sm space-y-2">
            <p className="font-semibold flex items-center gap-1.5">
              <Shield size={16} className="text-amber-700" />
              <span>Ethical Use & Regulatory Compliance Statement</span>
            </p>
            <p className="leading-relaxed">
              CrackFlow is an assistive productivity tool. We do not make misleading claims of guaranteed job placement, 100% answer accuracy, or automated interview passing. Users remain strictly responsible for complying with the rules of their interviewers, employers, academic institutions, and examination platforms, as well as applicable wiretapping and audio recording consent laws.
            </p>
          </div>
        </section>

        {/* Section 4: Architecture & Relationship */}
        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#171A1F] border-b pb-2 border-[#E5E7EB]">
            4. Website & Desktop Application Relationship
          </h2>
          <p className="leading-relaxed text-[#59616D]">
            CrackFlow operates as a hybrid SaaS and desktop application:
          </p>
          <ol className="list-decimal pl-5 space-y-2 text-[#59616D]">
            <li>
              <strong className="text-[#171A1F]">The Website ({BUSINESS_CONFIG.websiteUrl}):</strong> Serves as the public portal, product information center, secure authentication hub, and billing management center. All subscription purchases and account provisioning occur through this web portal.
            </li>
            <li>
              <strong className="text-[#171A1F]">The Cloud Backend:</strong> High-availability secure cloud infrastructure handling encrypted API routing, session authorization token exchange, and payment webhook verification.
            </li>
            <li>
              <strong className="text-[#171A1F]">The Desktop Application:</strong> A standalone Windows software installer provided digitally to eligible registered users. Authenticated users link their desktop client using single-use cryptographic authorization codes issued by the website.
            </li>
          </ol>
        </section>

        {/* Section 5: Business & Operator Information */}
        <section className="space-y-4">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#171A1F] border-b pb-2 border-[#E5E7EB]">
            5. Business & Operator Information
          </h2>
          <p className="leading-relaxed text-[#59616D]">
            In compliance with merchant verification standards and e-commerce transparency guidelines, our business and contact details are set forth below:
          </p>

          <div className="bg-[#FAFAF8] border border-[#E5E7EB] rounded-2xl p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Building2 size={18} className="text-[#59616D] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs uppercase font-bold text-[#59616D]">Legal Operator Name</div>
                  <div className="text-sm font-semibold text-[#171A1F] font-mono">
                    {BUSINESS_CONFIG.legalBusinessName}
                  </div>
                  <div className="text-[11px] text-[#59616D]">Trade Name: CrackFlow</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-[#59616D] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs uppercase font-bold text-[#59616D]">Operating / Registered Address</div>
                  <div className="text-sm font-semibold text-[#171A1F] font-mono">
                    {BUSINESS_CONFIG.registeredAddress}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail size={18} className="text-[#59616D] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs uppercase font-bold text-[#59616D]">Official Customer Support</div>
                  <a
                    href={`mailto:${BUSINESS_CONFIG.supportEmail}`}
                    className="text-sm font-semibold text-blue-600 hover:underline font-mono"
                  >
                    {BUSINESS_CONFIG.supportEmail}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <HelpCircle size={18} className="text-[#59616D] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs uppercase font-bold text-[#59616D]">Support Response Time</div>
                  <div className="text-sm font-semibold text-[#171A1F]">
                    {BUSINESS_CONFIG.supportResponseTime}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Quick Reference Links */}
        <section className="space-y-3 pt-2">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#171A1F] border-b pb-2 border-[#E5E7EB]">
            6. Related Policies & Verification Documents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Link
              to="/pricing"
              className="p-3 rounded-xl border border-[#E5E7EB] hover:bg-[#F4F4F0] flex items-center justify-between text-[#171A1F] no-underline transition-colors"
            >
              <span className="font-semibold">View Plans & Pricing</span>
              <span className="text-xs text-[#59616D]">→</span>
            </Link>
            <Link
              to="/shipping-policy"
              className="p-3 rounded-xl border border-[#E5E7EB] hover:bg-[#F4F4F0] flex items-center justify-between text-[#171A1F] no-underline transition-colors"
            >
              <span className="font-semibold">Digital Delivery Policy</span>
              <span className="text-xs text-[#59616D]">→</span>
            </Link>
            <Link
              to="/terms-and-conditions"
              className="p-3 rounded-xl border border-[#E5E7EB] hover:bg-[#F4F4F0] flex items-center justify-between text-[#171A1F] no-underline transition-colors"
            >
              <span className="font-semibold">Terms & Conditions</span>
              <span className="text-xs text-[#59616D]">→</span>
            </Link>
            <Link
              to="/refund-policy"
              className="p-3 rounded-xl border border-[#E5E7EB] hover:bg-[#F4F4F0] flex items-center justify-between text-[#171A1F] no-underline transition-colors"
            >
              <span className="font-semibold">Refund & Cancellation Policy</span>
              <span className="text-xs text-[#59616D]">→</span>
            </Link>
          </div>
        </section>
      </div>
    </LegalLayout>
  );
}
