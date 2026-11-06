import React, { useState } from "react";
import { DashboardIcon, DashboardIconName } from "./DashboardIcons";

interface SupportItemDef {
  icon: DashboardIconName;
  title: string;
  summary: string;
  details: string;
}

export const SupportPage: React.FC = () => {
  const [expanded, setExpanded] = useState<string | null>("Contact Support");

  const supportItems: SupportItemDef[] = [
    {
      icon: "mail",
      title: "Contact Support",
      summary: "Reach the official CrackFlow engineering and customer team directly.",
      details:
        "For account, billing, or technical inquiries, email us at support@crackflow.in. Our team typically responds within 24 hours on business days.",
    },
    {
      icon: "help",
      title: "Frequently Asked Questions",
      summary: "Common questions about system audio capture, overlay stealth, and interview support.",
      details:
        "CrackFlow works alongside meeting apps like Google Meet, Zoom, Teams, and Webex without taking over your screen or showing up on window shares. System audio capture listens to incoming interviewer speech and generates concise, real-time answers.",
    },
    {
      icon: "download",
      title: "Installation Issues",
      summary: "Troubleshoot downloading, installer SmartScreen warnings, and WebView2 setup.",
      details:
        "Ensure you are running Windows 10 or 11 (64-bit). If Windows SmartScreen prompts 'Windows protected your PC', click 'More info' and then 'Run anyway' to complete the installation.",
    },
    {
      icon: "mic",
      title: "Microphone and Audio Issues",
      summary: "Fix Windows audio permissions, microphone detection, and speaker loops.",
      details:
        "In Windows Settings > Privacy & Security > Microphone, ensure 'Let desktop apps access your microphone' is switched ON. In CrackFlow Settings, confirm that your active headset or microphone is selected as the default audio device.",
    },
    {
      icon: "user",
      title: "Login Problems",
      summary: "Get help signing in with Google or Email/Password across web and desktop.",
      details:
        "Ensure you use the same Google account or registered email address on both the website and the desktop app. If using email/password, you can trigger a password reset from the sign-in modal.",
    },
    {
      icon: "card",
      title: "Payment Problems",
      summary: "Find help with Razorpay UPI, cards, billing errors, or plan activation.",
      details:
        "Payments are processed through Razorpay. Once your transaction completes, your active plan and remaining interview hours update automatically within seconds. If a transaction shows deducted but uncredited, send your Razorpay payment ID to support@crackflow.in.",
    },
    {
      icon: "alert",
      title: "Report a Technical Issue",
      summary: "Share a bug report, audio glitch, or unexpected software behavior.",
      details:
        "When reporting an issue, please describe your Windows version, meeting platform (e.g. Google Meet on Chrome), and any error message displayed. Send details to support@crackflow.in.",
    },
  ];

  return (
    <div className="support-layout">
      {/* Support Intro */}
      <section className="support-intro">
        <span className="support-symbol">
          <DashboardIcon name="help" size={32} />
        </span>
        <span className="eyebrow">WE’RE HERE TO HELP</span>
        <h2>How can we help?</h2>
        <p>
          Choose a topic below to review troubleshooting steps and answers. You
          can also reach our support team directly at{" "}
          <strong className="text-white underline">support@crackflow.in</strong>.
        </p>
      </section>

      {/* Support Items Accordion */}
      <section className="support-list">
        {supportItems.map((item) => {
          const isOpen = expanded === item.title;
          return (
            <div key={item.title}>
              <button
                type="button"
                className={`support-item ${isOpen ? "support-open" : ""}`}
                onClick={() => setExpanded(isOpen ? null : item.title)}
              >
                <span className="support-item-icon">
                  <DashboardIcon name={item.icon} />
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.summary}</small>
                </span>
                <DashboardIcon name="chevron" size={18} />
              </button>
              {isOpen && (
                <div className="support-answer">
                  <p>{item.details}</p>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
};

