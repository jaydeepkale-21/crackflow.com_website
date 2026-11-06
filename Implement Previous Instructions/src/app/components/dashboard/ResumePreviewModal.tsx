import React from "react";
import { DashboardIcon } from "./DashboardIcons";
import { StoredResumeInfo } from "../../../services/resumeStorage";

interface ResumePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resume: StoredResumeInfo | null;
}

export const ResumePreviewModal: React.FC<ResumePreviewModalProps> = ({
  isOpen,
  onClose,
  resume,
}) => {
  if (!isOpen || !resume) return null;

  const handleOpenNewTab = () => {
    if (!resume.dataUrl) return;
    const win = window.open();
    if (win) {
      win.document.write(
        `<iframe src="${resume.dataUrl}" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`
      );
    }
  };

  const handleDownload = () => {
    if (!resume.dataUrl) return;
    const a = document.createElement("a");
    a.href = resume.dataUrl;
    a.download = resume.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isPdf = resume.type.toUpperCase() === "PDF" && Boolean(resume.dataUrl);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Resume Preview Dialog"
      onMouseDown={onClose}
    >
      <div
        className="dialog"
        style={{ maxWidth: "680px", width: "100%" }}
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
          <DashboardIcon name="file" size={26} />
        </span>

        <h2>Resume Preview</h2>
        <p>
          <strong>{resume.name}</strong> · {resume.type} · {(resume.size / (1024 * 1024)).toFixed(2)} MB · Uploaded {resume.uploadedAt}
        </p>

        {isPdf ? (
          <div style={{ marginTop: "14px" }}>
            <iframe
              src={`${resume.dataUrl}#toolbar=0`}
              title="Resume Preview"
              style={{
                width: "100%",
                height: "380px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "#fcfcfa",
              }}
            />
          </div>
        ) : (
          <div
            style={{
              marginTop: "16px",
              padding: "24px",
              background: "var(--yellow-soft)",
              borderRadius: "14px",
              border: "1px solid #ebd58b",
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: "8px", color: "#6f5900" }}>
              <DashboardIcon name="check" size={32} />
            </div>
            <strong style={{ fontSize: "14px", color: "var(--text)" }}>
              {resume.name} is stored & ready
            </strong>
            <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "6px" }}>
              This resume file is stored on your device and will be loaded automatically into the
              CrackFlow Desktop Copilot to ground behavioral & technical interview answers in your real experience.
            </p>
          </div>
        )}

        <div className="dialog-actions" style={{ marginTop: "20px" }}>
          {resume.dataUrl && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleOpenNewTab}
              >
                <DashboardIcon name="external" size={15} /> Open in New Tab
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDownload}
              >
                <DashboardIcon name="download" size={15} /> Download
              </button>
            </>
          )}
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
