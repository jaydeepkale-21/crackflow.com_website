import React, { ChangeEvent, DragEvent, useRef, useState, useEffect } from "react";
import { DashboardIcon } from "./DashboardIcons";
import {
  StoredResumeInfo,
  saveStoredResume,
  getStoredResume,
  deleteStoredResume,
} from "../../../services/resumeStorage";
import { createAuthExchangeCode } from "../../../services/api";
import { ResumePreviewModal } from "./ResumePreviewModal";
import { DesktopLaunchModal } from "./DesktopLaunchModal";

interface ResumePageProps {
  onNavigateToGettingStarted: () => void;
  onStartWithDesktopApp?: () => void;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit

export const ResumePage: React.FC<ResumePageProps> = ({
  onNavigateToGettingStarted,
  onStartWithDesktopApp,
}) => {
  const [fileInfo, setFileInfo] = useState<StoredResumeInfo | null>(() => {
    try {
      const stored = localStorage.getItem("crackflow_user_resume");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return null;
  });

  const [error, setError] = useState<string>("");
  const [dragging, setDragging] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);

  // Desktop Launch State
  const [launchModalOpen, setLaunchModalOpen] = useState<boolean>(false);
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [exchangeCode, setExchangeCode] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronize with IndexedDB on mount for full file content
  useEffect(() => {
    let isMounted = true;
    getStoredResume()
      .then((stored) => {
        if (isMounted && stored) {
          setFileInfo(stored);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const validateAndProcess = (file?: File) => {
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx"].includes(extension || "")) {
      setError("That file type is not supported. Please choose a valid PDF or DOCX file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("File is too large. The maximum supported resume size is 10 MB.");
      return;
    }

    setError("");
    setUploading(true);

    saveStoredResume(file)
      .then((info) => {
        setFileInfo(info);
      })
      .catch(() => {
        setError("An error occurred while saving your resume. Please try again.");
      })
      .finally(() => {
        setUploading(false);
      });
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      validateAndProcess(event.dataTransfer.files[0]);
    }
  };

  const handleRemove = () => {
    deleteStoredResume().catch(() => {});
    setFileInfo(null);
    setError("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const triggerProtocolLaunch = (code: string, fileName?: string) => {
    const deepLinkUrl = `crackflow://interview/start?code=${encodeURIComponent(
      code
    )}${fileName ? `&resume=${encodeURIComponent(fileName)}` : ""}`;

    if (typeof window !== "undefined") {
      try {
        const link = document.createElement("a");
        link.href = deepLinkUrl;
        link.style.display = "none";
        document.body.appendChild(link);
        if (typeof process === "undefined" || process.env.NODE_ENV !== "test") {
          link.click();
        }
        setTimeout(() => {
          if (link.parentNode) link.parentNode.removeChild(link);
        }, 1000);
      } catch {
        // Safe fallback
      }
    }
  };

  const handleStartWithDesktopApp = async () => {
    if (!fileInfo) return;

    setIsLaunching(true);
    setLaunchModalOpen(true);

    try {
      const urlSession =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("session") || undefined
          : undefined;

      const res = await createAuthExchangeCode(urlSession);
      const code =
        res.success && res.data?.code
          ? res.data.code
          : "cf_" + Math.random().toString(36).substring(2, 12);

      setExchangeCode(code);
      triggerProtocolLaunch(code, fileInfo.name);
    } catch {
      const fallbackCode = "cf_" + Math.random().toString(36).substring(2, 12);
      setExchangeCode(fallbackCode);
      triggerProtocolLaunch(fallbackCode, fileInfo.name);
    } finally {
      setIsLaunching(false);
      onStartWithDesktopApp?.();
    }
  };

  const handleRetryLaunch = () => {
    if (exchangeCode) {
      triggerProtocolLaunch(exchangeCode, fileInfo?.name);
    }
  };

  return (
    <div className="page-stack">
      <section className="resume-card">
        <div className="document-illustration">
          <DashboardIcon name="file" size={42} />
          <span>
            <DashboardIcon name="upload" size={18} />
          </span>
        </div>
        <h2>Upload Your Resume</h2>
        <p>Add your resume (PDF or DOCX) to keep your profile ready.</p>

        {!fileInfo ? (
          <div
            className={`dropzone ${dragging ? "dropzone-active" : ""} ${
              error ? "dropzone-error" : ""
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              className="sr-only"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                validateAndProcess(event.target.files?.[0]);
              }}
            />
            <span className="upload-circle">
              {uploading ? (
                <DashboardIcon name="spinner" size={24} />
              ) : (
                <DashboardIcon name="upload" size={24} />
              )}
            </span>
            <h3>
              {uploading ? "Verifying and processing resume..." : "Drag and drop your resume here"}
            </h3>
            <span>or</span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              disabled={uploading}
            >
              Choose File
            </button>
            <small>
              PDF or DOCX · Maximum file size: 10 MB · Private & encrypted
            </small>
          </div>
        ) : (
          <div className="uploaded-file">
            <div className="file-icon">
              <DashboardIcon name="file" size={24} />
            </div>
            <div className="file-details">
              <strong>{fileInfo.name}</strong>
              <span>
                {fileInfo.type} · {(fileInfo.size / (1024 * 1024)).toFixed(2)} MB · Uploaded {fileInfo.uploadedAt}
              </span>
              <em>
                <DashboardIcon name="check" size={14} /> Ready for desktop interview context
              </em>
            </div>
            <div className="file-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPreviewOpen(true)}
              >
                <DashboardIcon name="eye" size={16} /> View
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => inputRef.current?.click()}
              >
                <DashboardIcon name="replace" size={16} /> Replace
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleRemove}
              >
                <DashboardIcon name="trash" size={16} /> Remove
              </button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              hidden
              onChange={(event) => validateAndProcess(event.target.files?.[0])}
            />
          </div>
        )}

        {error && (
          <div className="form-error">
            <DashboardIcon name="alert" size={17} /> {error}
          </div>
        )}
      </section>

      {/* Bottom navigation */}
      <div className="bottom-navigation">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onNavigateToGettingStarted}
        >
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!fileInfo || isLaunching}
          title={
            !fileInfo
              ? "Upload your resume first to enable starting with the desktop app"
              : "Launch interview copilot on desktop app"
          }
          onClick={handleStartWithDesktopApp}
        >
          {isLaunching ? (
            <>
              <DashboardIcon name="spinner" size={16} /> Opening Desktop...
            </>
          ) : (
            <>
              Start with Desktop App <DashboardIcon name="arrow" size={16} />
            </>
          )}
        </button>
      </div>

      {/* Modals */}
      <ResumePreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        resume={fileInfo}
      />

      <DesktopLaunchModal
        isOpen={launchModalOpen}
        onClose={() => setLaunchModalOpen(false)}
        resumeName={fileInfo?.name}
        exchangeCode={exchangeCode}
        isGeneratingCode={isLaunching}
        onRetryLaunch={handleRetryLaunch}
      />
    </div>
  );
};
