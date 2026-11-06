import React, { useState } from "react";
import { DashboardIcon } from "./DashboardIcons";
import { getInstallerDownload } from "../../../services/api";

interface DesktopLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeName?: string;
  exchangeCode: string | null;
  isGeneratingCode: boolean;
  onRetryLaunch: () => void;
}

export const DesktopLaunchModal: React.FC<DesktopLaunchModalProps> = ({
  isOpen,
  onClose,
  resumeName,
  exchangeCode,
  isGeneratingCode,
  onRetryLaunch,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    if (!exchangeCode) return;
    navigator.clipboard.writeText(exchangeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await getInstallerDownload();
      const rawUrl = res.data?.downloadUrl;
      const targetUrl = (rawUrl && !rawUrl.includes("storage.googleapis.com"))
        ? rawUrl
        : "/downloads/CrackFlow-Setup.exe";
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    } catch {
      // Fallback
      window.open("/downloads/CrackFlow-Setup.exe", "_blank");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Desktop Launch Dialog"
      onMouseDown={onClose}
    >
      <div
        className="dialog"
        style={{ maxWidth: "500px", width: "100%" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          className="dialog-close"
          onClick={onClose}
          aria-label="Close dialog"
          type="button"
        >
          <DashboardIcon name="close" size={16} />
        </button>

        <span className="dialog-icon">
          {isGeneratingCode ? (
            <DashboardIcon name="spinner" size={26} />
          ) : (
            <DashboardIcon name="windows" size={26} />
          )}
        </span>

        <h2>Opening CrackFlow Desktop App</h2>
        <p>
          {resumeName ? (
            <>
              Linking resume <strong>{resumeName}</strong> with your live interview copilot.
            </>
          ) : (
            "Connecting your session to the CrackFlow desktop application."
          )}
        </p>

        {isGeneratingCode ? (
          <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center gap-2 text-xs text-amber-800">
            <DashboardIcon name="spinner" size={16} />
            <span>Generating secure single-use session code...</span>
          </div>
        ) : (
          <>
            <div className="mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-left text-xs text-emerald-800">
              <div className="flex items-center gap-1.5 font-bold text-emerald-700 mb-1">
                <DashboardIcon name="check" size={14} />
                <span>Redirecting to Desktop App</span>
              </div>
              If your browser prompts you to open CrackFlow, click <strong>Open CrackFlow</strong>.
            </div>

            {exchangeCode && (
              <div className="dialog-code-box">
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>
                    Single-Use Session Code (10 min):
                  </div>
                  <span className="dialog-code-value">{exchangeCode}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: "32px", padding: "6px 12px", fontSize: "11px" }}
                  onClick={handleCopyCode}
                >
                  <DashboardIcon name="copy" size={14} />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            )}

            <div
              style={{
                marginTop: "16px",
                padding: "12px",
                background: "#fcfcfa",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                fontSize: "11px",
                color: "var(--muted)",
                textAlign: "left",
              }}
            >
              <strong>Didn't open or don't have the desktop app installed?</strong>
              <div style={{ marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: "34px", padding: "6px 12px", fontSize: "11px" }}
                  onClick={onRetryLaunch}
                >
                  <DashboardIcon name="replace" size={14} /> Try Opening Again
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ minHeight: "34px", padding: "6px 12px", fontSize: "11px" }}
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  <DashboardIcon name="download" size={14} />
                  {downloading ? "Preparing..." : "Download Installer"}
                </button>
              </div>
            </div>
          </>
        )}

        <div className="dialog-actions" style={{ marginTop: "20px" }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
