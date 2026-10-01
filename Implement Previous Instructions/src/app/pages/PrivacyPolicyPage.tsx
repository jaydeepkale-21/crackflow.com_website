import React from "react";
import { LegalLayout } from "../components/legal/LegalLayout";
import { BUSINESS_CONFIG } from "../../config/business";
import { ShieldCheck, Lock, Eye, Database, Cpu, Mic, FileText, CheckCircle2 } from "lucide-react";
import { Link } from "react-router";

export function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="Transparency regarding how CrackFlow collects, processes, and safeguards user account data, audio streams, and interview context."
      badge="Data Protection & Privacy"
      lastUpdated="October 2026"
    >
      <div className="space-y-10 text-xs md:text-sm text-[#171A1F] leading-relaxed">
        {/* Core Privacy Summary */}
        <section className="p-5 rounded-2xl bg-[#FAFAF8] border border-[#E5E7EB] space-y-3">
          <div className="flex items-center gap-2 font-bold text-[#171A1F] text-sm md:text-base">
            <ShieldCheck size={20} className="text-emerald-600" />
            <span>Privacy Principles & Security Standards</span>
          </div>
          <p className="text-[#59616D] leading-relaxed">
            CrackFlow is built on candidate privacy and operational discretion. We collect only the minimum data necessary to authenticate your account, provision your subscription, transcribe speech during active sessions, and synthesize AI responses. We do not sell your personal information or audio records to advertisers or data brokers.
          </p>
        </section>

        {/* Section 1: Introduction */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            1. Introduction
          </h2>
          <p className="text-[#59616D]">
            This Privacy Policy explains how {BUSINESS_CONFIG.legalBusinessName} ("CrackFlow", "we", "us", or "our") collects, uses, and discloses information when you use our website ({BUSINESS_CONFIG.websiteUrl}), our web dashboard, and our native desktop software application (collectively, the "Services").
          </p>
          <p className="text-[#59616D]">
            By accessing or using the Services, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree, please do not use our Services.
          </p>
        </section>

        {/* Section 2: Information We Collect */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            2. Information We Collect
          </h2>
          <p className="text-[#59616D]">
            Depending on your interactions with CrackFlow, we collect information you provide directly, technical information collected automatically from your device, and temporary data streams generated during interview assistance sessions.
          </p>
        </section>

        {/* Section 3: Account Information */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            3. Account Information
          </h2>
          <p className="text-[#59616D]">
            When you register an account, we collect your email address, display name, and unique user identifier (UID). This information is stored securely in our identity database to manage your login state and active subscription tier.
          </p>
        </section>

        {/* Section 4: Authentication Information */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            4. Authentication Information
          </h2>
          <p className="text-[#59616D]">
            User authentication is managed via Google Firebase Authentication. We use JSON Web Tokens (JWT) and short-lived desktop authorization exchange codes (e.g., 60-second single-use tokens) to link your web subscription with your desktop application securely without sharing plaintext passwords.
          </p>
        </section>

        {/* Section 5: Payment Information */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            5. Payment Information & Gateway Handling
          </h2>
          <p className="text-[#59616D]">
            When you purchase a subscription or license, all financial transactions are processed directly by our PCI-DSS Level 1 certified payment gateway partner ({BUSINESS_CONFIG.paymentProviderName}).
          </p>
          <p className="text-[#59616D]">
            <strong className="text-[#171A1F]">Cardholder Data Security:</strong> CrackFlow servers never collect, process, view, or store credit card numbers, debit card numbers, expiration dates, or CVV security codes. Payment gateways notify our backend of successful transactions via signed cryptographic webhooks containing only transaction identifiers, purchased plan IDs, and payment status.
          </p>
        </section>

        {/* Section 6: Device and Technical Information */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            6. Device and Technical Information
          </h2>
          <p className="text-[#59616D]">
            When you connect to our web dashboard or cloud APIs, our servers automatically log technical information including your IP address, browser type, operating system version, desktop client version, and timestamps to diagnose technical faults and protect against denial-of-service attacks.
          </p>
        </section>

        {/* Section 7: Audio / Microphone Processing */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            7. Audio & Microphone Processing
          </h2>
          <p className="text-[#59616D]">
            <strong className="text-[#171A1F]">When Audio is Captured:</strong> Audio input (microphone and system audio) is captured ONLY when you explicitly click to launch or resume an interview assistance session inside the Desktop Client. CrackFlow never records or listens in the background when an interview session is inactive.
          </p>
          <p className="text-[#59616D]">
            <strong className="text-[#171A1F]">Transient Processing:</strong> Captured audio is converted to digital packets and streamed in real time over encrypted TLS connections to our speech-to-text provider. Raw audio is not permanently archived on our database servers once transcription is finalized.
          </p>
        </section>

        {/* Section 8: Speech-to-Text Processing */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            8. Speech-to-Text Processing
          </h2>
          <p className="text-[#59616D]">
            We utilize secure speech recognition infrastructure for automated transcription during live sessions. Temporary, time-limited authentication tokens are issued to active paid subscribers. Audio data transmitted to our speech recognition infrastructure is processed in real time and is not used to train public machine learning models.
          </p>
        </section>

        {/* Section 9: AI Processing */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            9. AI Processing
          </h2>
          <p className="text-[#59616D]">
            Transcribed conversational queries and user-loaded context files are processed through enterprise artificial intelligence models via our secure cloud backend. We utilize business API endpoints where inputs and outputs are processed ephemerally and are not retained to train foundation models.
          </p>
        </section>

        {/* Section 10: Screenshots / OCR */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            10. Screenshots and Optical Character Recognition (OCR)
          </h2>
          <p className="text-[#59616D]">
            Where enabled on Pro plans, the user may explicitly trigger screen capture for code problem analysis. Screen regions are captured locally in memory, converted to text via OCR or visual AI endpoints, and the temporary image buffer is immediately released. CrackFlow does not continuously capture or record your screen.
          </p>
        </section>

        {/* Section 11: Interview Session Data */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            11. Interview Session Data & Context Files
          </h2>
          <p className="text-[#59616D]">
            Any resume or job description text you choose to preload is saved locally or in your encrypted account database to ground AI responses during your session. You can clear, replace, or delete your context documents at any time from your account settings.
          </p>
        </section>

        {/* Section 12: Cookies and Similar Technologies */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            12. Cookies and Similar Technologies
          </h2>
          <p className="text-[#59616D]">
            Our website uses strictly necessary authentication cookies and local storage tokens to preserve your login session, dark mode preferences, and checkout state. We do not use intrusive third-party cross-site advertising trackers.
          </p>
        </section>

        {/* Section 13: How We Use Information */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            13. How We Use Information
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-[#59616D]">
            <li>To authenticate users and maintain account security.</li>
            <li>To verify subscription status and enforce plan limits.</li>
            <li>To provide live speech-to-text and AI interview hints.</li>
            <li>To transmit transaction confirmations, receipts, and security alerts.</li>
            <li>To investigate technical bugs and resolve customer support tickets.</li>
          </ul>
        </section>

        {/* Section 14: Third-Party Service Providers */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            14. Categories of Third-Party Service Providers
          </h2>
          <p className="text-[#59616D]">
            We partner with trusted third-party service providers to deliver essential infrastructure, security, and transaction processing:
          </p>
          <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F4F4F0] text-[#171A1F]">
                <tr>
                  <th className="p-3 border-b border-[#E5E7EB] font-bold">Service Category</th>
                  <th className="p-3 border-b border-[#E5E7EB] font-bold">Purpose</th>
                  <th className="p-3 border-b border-[#E5E7EB] font-bold">Data Handled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#59616D]">
                <tr>
                  <td className="p-3 font-semibold text-[#171A1F]">Authentication & Identity</td>
                  <td className="p-3">User sign-in, session authorization & account security</td>
                  <td className="p-3">Email, User ID, Plan Tier</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[#171A1F]">Cloud Infrastructure & Edge Proxy</td>
                  <td className="p-3">API gateway routing, DDoS mitigation & webhook security</td>
                  <td className="p-3">Encrypted API payloads, IP address</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[#171A1F]">Speech-to-Text Recognition</td>
                  <td className="p-3">Real-time voice transcription during active sessions</td>
                  <td className="p-3">Transient audio streams (session-only)</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[#171A1F]">Artificial Intelligence Models</td>
                  <td className="p-3">Generative answer synthesis & code assistance</td>
                  <td className="p-3">Transcribed query text & user context prompts</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[#171A1F]">Payment Gateway ({BUSINESS_CONFIG.paymentProviderName})</td>
                  <td className="p-3">Subscription checkout, billing & payment verification</td>
                  <td className="p-3">Billing details, Order ID, Payment Status</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 15: Data Retention */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            15. Data Retention
          </h2>
          <p className="text-[#59616D]">
            We retain account information for as long as your account remains active. Audio streams are processed ephemerally and discarded immediately after transcription. Inactive accounts or deleted accounts are expunged from production databases in accordance with our deletion process.
          </p>
        </section>

        {/* Section 16: Data Security */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            16. Data Security
          </h2>
          <p className="text-[#59616D]">
            We maintain technical, administrative, and physical safeguards designed to protect personal data against unauthorized access, loss, or alteration. All communication between the desktop app, website, and cloud endpoints is encrypted using TLS 1.3.
          </p>
        </section>

        {/* Section 17: International Data Transfers */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            17. International Data Transfers
          </h2>
          <p className="text-[#59616D]">
            Because our cloud infrastructure providers maintain globally distributed points of presence, your data may be processed in secure tier-1 data centers located outside your home state or country. We ensure that all infrastructure partners maintain industry-standard security certifications (SOC 2, ISO 27001).
          </p>
        </section>

        {/* Section 18: User Rights */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            18. User Rights
          </h2>
          <p className="text-[#59616D]">
            Depending on your jurisdiction, you have the right to request access to the personal data we hold about you, request corrections to inaccurate data, or request permanent deletion of your account.
          </p>
        </section>

        {/* Section 19: Account/Data Deletion */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            19. Account & Data Deletion
          </h2>
          <p className="text-[#59616D]">
            To permanently delete your CrackFlow account, email our privacy team at{" "}
            <a href={`mailto:${BUSINESS_CONFIG.supportEmail}`} className="text-blue-600 underline font-mono">
              {BUSINESS_CONFIG.supportEmail}
            </a>{" "}
            with the subject <strong>"Account Deletion Request"</strong> from your registered account email address. All associated profile records, session contexts, and user profiles will be permanently purged within 14 business days.
          </p>
        </section>

        {/* Section 20: Children's Privacy */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            20. Children's Privacy
          </h2>
          <p className="text-[#59616D]">
            CrackFlow is strictly intended for adults and professional job seekers. We do not knowingly collect personal data from children under the age of 18. If you believe a minor has created an account, please contact us immediately to remove the data.
          </p>
        </section>

        {/* Section 21: Changes to Privacy Policy */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            21. Changes to Privacy Policy
          </h2>
          <p className="text-[#59616D]">
            We may update this Privacy Policy from time to time to reflect operational or regulatory changes. The updated version will be indicated by the "Last Updated" date at the top of this page.
          </p>
        </section>

        {/* Section 22: Contact Us */}
        <section className="space-y-3">
          <h2 className="text-base md:text-lg font-bold text-[#171A1F] border-b pb-1.5 border-[#E5E7EB]">
            22. Contact Us
          </h2>
          <p className="text-[#59616D]">
            For questions or concerns regarding our privacy practices or data handling, please contact our Data Protection Officer at:
          </p>
          <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#FAFAF8] space-y-1 font-mono text-xs">
            <div><strong>Entity:</strong> {BUSINESS_CONFIG.legalBusinessName}</div>
            <div><strong>Email:</strong> {BUSINESS_CONFIG.supportEmail}</div>
            <div><strong>Address:</strong> {BUSINESS_CONFIG.registeredAddress}</div>
            <div><strong>Response Time:</strong> {BUSINESS_CONFIG.supportResponseTime}</div>
          </div>
        </section>
      </div>
    </LegalLayout>
  );
}
