import React, { useState } from "react";
import { DashboardIcon, DashboardIconName } from "./DashboardIcons";
import { useAuth } from "../../../context/AuthContext";
import { updateUserProfile } from "../../../services/firestore";
import { updateProfile } from "firebase/auth";

export type ActiveModal = "video" | "edit-profile" | "sign-out" | null;

interface ModalsProps {
  modal: ActiveModal;
  videoKey?: string;
  onClose: () => void;
  onShowToast: (message: string) => void;
}

export const DashboardModals: React.FC<ModalsProps> = ({
  modal,
  videoKey,
  onClose,
  onShowToast,
}) => {
  const { user, userProfile, refreshProfile, logout } = useAuth();
  const [displayNameInput, setDisplayNameInput] = useState<string>(
    userProfile?.displayName || user?.displayName || ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!modal) return null;

  // Video metadata mapping
  const videoDetails: Record<string, { title: string; desc: string; duration: string }> = {
    "setup-guide": {
      title: "Install and set up CrackFlow",
      desc: "Complete walkthrough: download the installer, grant microphone permissions, configure default audio, and test the floating toolbar overlay.",
      duration: "3:45",
    },
    "complete-setup": {
      title: "Complete Setup Guide",
      desc: "Full overview covering installation, Google login sync, meeting app permissions (Google Meet, Zoom, Teams), and starting your first interview.",
      duration: "4:12",
    },
    "voice-assistant": {
      title: "Voice Assistant & Transcription",
      desc: "How real-time Deepgram speech-to-text captures the interviewer's speech with low latency and presents it in your private copilot window.",
      duration: "2:40",
    },
    "ai-answers": {
      title: "AI Answers in Real Time",
      desc: "How Gemini AI crafts concise, direct, bulleted answers to behavioral and technical questions as you converse.",
      duration: "3:15",
    },
    "screenshot-analysis": {
      title: "Screenshot Analysis",
      desc: "How to use the screenshot solve shortcut (Ctrl+Shift+S) to capture coding questions, DSA problems, and algorithm charts.",
      duration: "2:55",
    },
    "floating-toolbar": {
      title: "Floating Toolbar & Shortcuts",
      desc: "Hotkeys and controls to reposition the toolbar, toggle transparency, clear responses, or trigger immediate answer generation.",
      duration: "2:10",
    },
    "resume-context": {
      title: "Resume-Based Context",
      desc: "How your uploaded resume grounds interview responses in your authentic career history, skills, and past projects.",
      duration: "3:05",
    },
    "privacy-security": {
      title: "Privacy & Security",
      desc: "How our desktop architecture prevents window capture during screen shares and protects audio privacy.",
      duration: "2:20",
    },
  };

  const activeVideo = videoDetails[videoKey || "setup-guide"] || videoDetails["setup-guide"];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!displayNameInput.trim()) {
      setError("Please enter a valid display name.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (user) {
        try {
          await updateProfile(user, { displayName: displayNameInput.trim() });
        } catch {
          // If auth update fails (e.g. mock objects or restricted token), continue to firestore
        }
        await updateUserProfile(user.uid, { displayName: displayNameInput.trim() });
        await refreshProfile();
      }
      onShowToast("Profile name updated successfully");
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update profile name.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      onClose();
      onShowToast("Signed out successfully");
    } catch (err: any) {
      setError(err?.message || "Error signing out.");
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
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

        {modal === "video" && (
          <div>
            <span className="dialog-icon">
              <DashboardIcon name="play" size={24} />
            </span>
            <h2>{activeVideo.title}</h2>
            <p className="mt-2 text-xs text-gray-500 leading-relaxed">
              {activeVideo.desc}
            </p>
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs text-amber-800">
              <span className="flex items-center gap-1.5 font-semibold">
                <DashboardIcon name="clock" size={14} /> Duration
              </span>
              <strong className="font-mono">{activeVideo.duration}</strong>
            </div>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
              >
                Close Walkthrough
              </button>
            </div>
          </div>
        )}

        {modal === "edit-profile" && (
          <div>
            <span className="dialog-icon">
              <DashboardIcon name="user" size={24} />
            </span>
            <h2>Edit Profile</h2>
            <p className="mt-1 text-xs text-gray-500">
              Update your display name visible across your CrackFlow account.
            </p>

            {error && (
              <div className="mt-3 p-2.5 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-1.5">
                <DashboardIcon name="alert" size={15} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="dialog-form">
              <label>
                <span>Full Name</span>
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={100}
                  required
                />
              </label>

              <label>
                <span>Registered Email</span>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                />
              </label>

              <div className="dialog-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <DashboardIcon name="spinner" size={16} /> Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {modal === "sign-out" && (
          <div>
            <span className="dialog-icon dialog-icon-danger">
              <DashboardIcon name="external" size={24} />
            </span>
            <h2>Sign out of CrackFlow?</h2>
            <p className="mt-2 text-xs text-gray-500">
              You will be signed out of your dashboard session. You can sign in
              again anytime with your registered credentials.
            </p>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

