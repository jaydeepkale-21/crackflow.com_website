import React, { useState, useEffect } from "react";
import { DashboardIcon, DashboardIconName } from "./DashboardIcons";
import { getInstallerDownload, DownloadResponse } from "../../../services/api";

interface GettingStartedPageProps {
  onOpenVideo: (videoKey?: string) => void;
  onNavigateToPlans: () => void;
}

export const GettingStartedPage: React.FC<GettingStartedPageProps> = ({
  onOpenVideo,
  onNavigateToPlans,
}) => {
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadData, setDownloadData] = useState<DownloadResponse | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Fetch download metadata on mount so release info is authoritative
  useEffect(() => {
    let isMounted = true;
    getInstallerDownload().then((res) => {
      if (isMounted && res.success && res.data) {
        setDownloadData(res.data);
      }
    }).catch(() => {
      // Fallback display values remain accurate to production
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDownload = async () => {
    setDownloadLoading(true);
    setDownloadError(null);
    setDownloadSuccess(null);

    try {
      const res = await getInstallerDownload();
      if (res.success && res.data) {
        setDownloadData(res.data);
        setDownloadSuccess(`Downloading ${res.data.fileName} (${res.data.version})...`);
        window.open(res.data.downloadUrl, "_blank", "noopener,noreferrer");
      } else {
        setDownloadError(res.error || "Unable to retrieve installer link. Please try again.");
      }
    } catch (err: any) {
      setDownloadError(err?.message || "Failed to contact download service.");
    } finally {
      setDownloadLoading(false);
    }
  };

  const setupItems: Array<[DashboardIconName, string, string]> = [
    ["download", "Run the installer", "Open the downloaded setup file to begin."],
    ["check", "Complete installation", "Follow the prompts shown by the Windows installer."],
    ["spark", "Open CrackFlow", "Launch the desktop application after installation."],
    ["user", "Sign in", "Use the same account you registered with."],
    ["mic", "Allow microphone access", "Grant permission so CrackFlow can listen during interviews."],
    ["shield", "Verify audio input", "Confirm the correct input device is selected."],
    ["card", "Activate an eligible interview plan", "Choose eligible interview access before starting an interview."],
  ];

  return (
    <div className="page-stack">
      {/* 1. Welcome Hero */}
      <section className="welcome-panel">
        <div className="welcome-copy">
          <span className="eyebrow">YOUR INTERVIEW COPILOT</span>
          <h2>Welcome to CrackFlow!</h2>
          <p>
            Your AI interview copilot is ready. Download the desktop application
            and get started.
          </p>
          <div className="benefits">
            <span>
              <DashboardIcon name="spark" /> Real-time AI assistance
            </span>
            <span>
              <DashboardIcon name="mic" /> Works during interviews
            </span>
            <span>
              <DashboardIcon name="shield" /> Private and secure
            </span>
          </div>
        </div>
        <div className="product-illustration">
          <img
            src="/assets/images/crackflow-interview-hero.webp"
            onError={(e) => {
              // Fallback to root alias if assets path is missing
              (e.currentTarget as HTMLImageElement).src = "/crackflow-interview-hero.webp";
            }}
            alt="CrackFlow assisting alongside a live Google Meet interview"
          />
        </div>
      </section>

      {/* 2. Download Section */}
      <section className="download-card">
        <div className="download-icon">
          <DashboardIcon name="windows" size={34} />
        </div>
        <div className="download-copy">
          <span className="eyebrow">DESKTOP APPLICATION</span>
          <h2>Download CrackFlow for Windows</h2>
          <p>
            Install the desktop app to access CrackFlow during your interviews.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              className="btn btn-primary"
              onClick={handleDownload}
              disabled={downloadLoading}
            >
              {downloadLoading ? (
                <>
                  <DashboardIcon name="spinner" size={18} /> Preparing Download...
                </>
              ) : (
                <>
                  <DashboardIcon name="download" size={18} /> Download CrackFlow Setup (.exe)
                </>
              )}
            </button>
            {downloadSuccess && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
                <DashboardIcon name="check" size={16} /> {downloadSuccess}
              </span>
            )}
            {downloadError && (
              <span className="text-xs font-semibold text-red-600 flex items-center gap-1.5 animate-in fade-in">
                <DashboardIcon name="alert" size={16} /> {downloadError}
              </span>
            )}
          </div>
        </div>
        <div className="release-info">
          <div>
            <span>Supported OS</span>
            <strong>Windows 10 / 11 (64-bit)</strong>
          </div>
          <div>
            <span>Architecture</span>
            <strong>x64</strong>
          </div>
          <div>
            <span>Version</span>
            <strong>{downloadData?.version || "v2.4.2"}</strong>
          </div>
          <div>
            <span>Installer size</span>
            <strong>~85 MB</strong>
          </div>
        </div>
      </section>

      {/* 3. Setup Video */}
      <section>
        <div className="section-heading">
          <div>
            <span className="eyebrow">QUICK WALKTHROUGH</span>
            <h2>Watch How to Set Up CrackFlow</h2>
          </div>
          <p>
            Follow this quick walkthrough to download, install and set up
            CrackFlow.
          </p>
        </div>
        <div className="featured-video-shell">
          <button
            className="video-thumbnail video-featured"
            onClick={() => onOpenVideo("setup-guide")}
            type="button"
          >
            <div className="video-brand">
              <img
                src="/assets/brand/crackflow-logo.webp"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/crackflow-logo.webp";
                }}
                alt="CrackFlow"
              />
            </div>
            <div className="video-laptop">
              <span className="video-app-bar" />
              <span className="video-app-card" />
              <span className="video-app-card small" />
            </div>
            <span className="play-button">
              <DashboardIcon name="play" size={30} />
            </span>
            <span className="placeholder-label">SETUP WALKTHROUGH</span>
            <span className="duration">3:45</span>
            <span className="sr-only">Play Install and set up CrackFlow</span>
          </button>
          <div className="video-caption">
            <div>
              <h3>Install and set up CrackFlow</h3>
              <p>
                A step-by-step walkthrough covering installation, microphone
                permissions, system audio, and floating toolbar setup.
              </p>
            </div>
            <span>HD Tutorial</span>
          </div>
        </div>
      </section>

      {/* 4. Manual Setup Natural-Flow Instructions */}
      <section className="instructions-card">
        <div className="section-heading compact">
          <div>
            <span className="eyebrow">SETUP CHECKLIST</span>
            <h2>Getting Everything Ready</h2>
          </div>
          <p>A few simple checks before your first interview.</p>
        </div>
        <div className="instruction-list">
          {setupItems.map(([icon, title, text]) => (
            <div className="instruction-row" key={title}>
              <span className="instruction-icon">
                <DashboardIcon name={icon} />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
              <DashboardIcon name="check" size={18} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

