import React from "react";
import { DashboardIcon, DashboardIconName } from "./DashboardIcons";

interface TutorialsPageProps {
  onOpenVideo: (tutorialKey: string) => void;
}

interface FeatureVideoDef {
  id: string;
  icon: DashboardIconName;
  title: string;
  description: string;
  duration: string;
  available: boolean;
}

export const TutorialsPage: React.FC<TutorialsPageProps> = ({ onOpenVideo }) => {
  const featureVideos: FeatureVideoDef[] = [
    {
      id: "voice-assistant",
      icon: "mic",
      title: "Voice Assistant & Transcription",
      description: "Learn how interview speech is converted into text in real time.",
      duration: "2:40",
      available: true,
    },
    {
      id: "ai-answers",
      icon: "spark",
      title: "AI Answers in Real Time",
      description: "See how contextual responses are generated during live meetings.",
      duration: "3:15",
      available: true,
    },
    {
      id: "screenshot-analysis",
      icon: "camera",
      title: "Screenshot Analysis",
      description: "Capture and analyze coding questions, algorithms, and prompt diagrams.",
      duration: "2:55",
      available: true,
    },
    {
      id: "floating-toolbar",
      icon: "menu",
      title: "Floating Toolbar & Shortcuts",
      description: "Move faster with global keyboard hotkeys and discreet overlay controls.",
      duration: "2:10",
      available: true,
    },
    {
      id: "resume-context",
      icon: "file",
      title: "Resume-Based Context",
      description: "Ground AI responses in your personal background, projects, and work history.",
      duration: "3:05",
      available: true,
    },
    {
      id: "privacy-security",
      icon: "lock",
      title: "Privacy & Security",
      description: "Understand our local audio routing, stealth overlay, and data handling standards.",
      duration: "2:20",
      available: true,
    },
  ];

  return (
    <div className="page-stack">
      {/* 1. Large Featured Setup Guide */}
      <section>
        <div className="tutorial-hero-copy">
          <span className="eyebrow">START HERE</span>
          <h2>Complete Setup Guide</h2>
          <p>Learn how to install, configure and start using CrackFlow.</p>
        </div>
        <div className="featured-video-shell">
          <button
            type="button"
            className="video-thumbnail video-featured"
            onClick={() => onOpenVideo("complete-setup")}
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
            <span className="placeholder-label">FULL SETUP GUIDE</span>
            <span className="duration">4:12</span>
            <span className="sr-only">Play Complete Setup Guide</span>
          </button>
          <div className="video-caption">
            <div>
              <h3>Complete Setup Guide</h3>
              <p>
                Installation, sign in, microphone permissions, audio verification,
                and using the floating toolbar during live interviews.
              </p>
            </div>
            <span>Official Guide</span>
          </div>
        </div>
      </section>

      {/* 2. Explore CrackFlow Features */}
      <section>
        <div className="section-heading">
          <div>
            <span className="eyebrow">LEARN BY FEATURE</span>
            <h2>Explore CrackFlow Features</h2>
          </div>
          <p>
            Watch short videos to understand key features of the application.
          </p>
        </div>
        <div className="video-grid">
          {featureVideos.map((video) => (
            <article
              className={`video-card ${!video.available ? "video-unavailable" : ""}`}
              key={video.id}
            >
              <button
                type="button"
                className="video-thumbnail"
                onClick={() => onOpenVideo(video.id)}
              >
                <div className="video-brand">
                  <img
                    src="/assets/brand/crackflow-logo.webp"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/crackflow-logo.webp";
                    }}
                    alt=""
                  />
                </div>
                <div className="video-laptop">
                  <span className="video-app-bar" />
                  <span className="video-app-card" />
                  <span className="video-app-card small" />
                </div>
                <span className="play-button">
                  <DashboardIcon name="play" size={22} />
                </span>
                <span className="placeholder-label">{video.title.toUpperCase()}</span>
                <span className="duration">{video.duration}</span>
                <span className="sr-only">Play {video.title}</span>
              </button>
              <div className="video-card-copy">
                <span className="feature-icon">
                  <DashboardIcon name={video.icon} />
                </span>
                <div>
                  <h3>{video.title}</h3>
                  <p>{video.description}</p>
                </div>
              </div>
              <span className="video-status">
                HD Walkthrough · {video.duration}
              </span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

