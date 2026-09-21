import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { AuthModal } from "./components/AuthModal";
import { Dashboard } from "./components/Dashboard";
import { CheckoutSuccess } from "./components/CheckoutSuccess";
import { CheckoutCancel } from "./components/CheckoutCancel";
import { PLANS } from "../config/plans";
import {
  Zap,
  Download,
  Play,
  ChevronDown,
  Check,
  Shield,
  Keyboard,
  Clock,
  Mic,
  Brain,
  Code2,
  Users,
  Star,
  ArrowRight,
  Monitor,
  Moon,
  Sun,
  Menu,
  X,
  Lock,
  Eye,
  Cpu,
  FileText,
  Headphones,
  MessageSquare,
  LayoutDashboard,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

// ─── Brand tokens ──────────────────────────────────────────────────────────
const GOLD = "#F5C518";
const DARK = "#20252B";
const TEXT = "#171A1F";
const TEXT_SEC = "#59616D";
const BG = "#FAFAF8";
const BORDER = "#E5E7EB";

// ─── Nav links ─────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "Home", href: "#hero" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Demos", href: "#demos" },
  { label: "Pricing", href: "#pricing" },
  { label: "Compare", href: "#compare" },
];

// ─── FAQ data ───────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "What is CrackFlow?",
    a: "CrackFlow is a native desktop AI copilot that listens to your interview conversation in real time and provides concise, context-aware answers — without your interviewer ever knowing it's there.",
  },
  {
    q: "How does CrackFlow work?",
    a: "CrackFlow captures audio from your system, transcribes the conversation, understands the question using AI, and delivers a structured response in your private overlay — all in seconds.",
  },
  {
    q: "Does CrackFlow support coding interviews?",
    a: "Yes. CrackFlow Code mode handles DSA problems, debugging, time/space complexity analysis, and system design questions on platforms like LeetCode, HackerRank, and CodeSignal.",
  },
  {
    q: "Can CrackFlow understand my resume and job description?",
    a: "Yes. CrackFlow Context lets you load your resume, project descriptions, and the job description so responses are grounded in your personal experience.",
  },
  {
    q: "Does CrackFlow work with Zoom and Google Meet?",
    a: "CrackFlow works alongside any video meeting platform that runs on your desktop, including Zoom, Google Meet, Microsoft Teams, and Webex.",
  },
  {
    q: "Does CrackFlow support HackerRank and LeetCode?",
    a: "Yes. CrackFlow can assist during coding assessments on HackerRank, LeetCode, CodeSignal, and CoderPad.",
  },
  {
    q: "How fast does CrackFlow respond?",
    a: "CrackFlow is designed for low-latency assistance during live interviews. Response times depend on your network and question complexity.",
  },
  {
    q: "How does CrackFlow handle interview context?",
    a: "You can preload context documents before your interview. CrackFlow uses this context alongside real-time transcription to generate relevant answers.",
  },
  {
    q: "Is CrackFlow a browser extension?",
    a: "No. CrackFlow is a native desktop application, which allows it to capture system audio and maintain a private overlay separate from your browser or meeting app.",
  },
  {
    q: "Does CrackFlow support different response styles?",
    a: "Yes. You can switch between concise bullet-point responses, detailed explanations, and code-first responses depending on what the question requires.",
  },
  {
    q: "Can I use CrackFlow with a second device?",
    a: "Yes. You can run CrackFlow on a secondary device while your primary device runs the interview — a common setup for added discretion.",
  },
  {
    q: "Does CrackFlow offer mock interviews?",
    a: "Yes. CrackFlow Mock lets you practice with structured AI-driven mock sessions and receive feedback on your answers.",
  },
  {
    q: "Does CrackFlow work on Windows and macOS?",
    a: "CrackFlow currently supports Windows. macOS support is in active development.",
  },
  {
    q: "How is CrackFlow different from other AI interview assistants?",
    a: "CrackFlow is built as a native desktop app with keyboard-first controls, context loading, and a private overlay — designed for the actual interview experience, not just practice.",
  },
  {
    q: "Do CrackFlow credits expire?",
    a: "Credit expiry details are available on the Pricing page. Please check before purchasing.",
  },
  {
    q: "Does CrackFlow require a credit card?",
    a: "A free trial is available. Credit card requirements depend on the plan you select.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Yes. You can cancel your subscription at any time from your account dashboard. See our Terms for details.",
  },
  {
    q: "Where can I get support?",
    a: "You can reach the CrackFlow support team via the Contact page or by emailing support@crackflow.in.",
  },
];

// ─── Floating Navbar ────────────────────────────────────────────────────────
interface NavbarProps {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  onOpenAuth: (tab: "login" | "signup") => void;
  onOpenDashboard: () => void;
  onGoHome: () => void;
  view: "landing" | "dashboard";
}

function Navbar({
  darkMode,
  setDarkMode,
  onOpenAuth,
  onOpenDashboard,
  onGoHome,
  view,
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState("#hero");
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (href: string) => {
    if (view === "dashboard") {
      onGoHome();
      setTimeout(() => {
        const el = document.querySelector(href);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      setActive(href);
      setMobileOpen(false);
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav
      className="fixed top-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-[1380px]"
      style={{ transform: "translateX(-50%)" }}
      aria-label="Main navigation"
    >
      <div
        className="flex items-center justify-between px-5 md:px-8 h-[72px] transition-shadow duration-300"
        style={{
          background: "rgba(255,255,255,0.97)",
          border: `1px solid ${BORDER}`,
          borderRadius: 36,
          boxShadow: scrolled
            ? "0 8px 40px rgba(0,0,0,0.10)"
            : "0 2px 16px rgba(0,0,0,0.06)",
          fontFamily: "Manrope, sans-serif",
        }}
      >
        {/* Logo */}
        <button
          onClick={onGoHome}
          className="flex items-center gap-2 shrink-0 bg-transparent border-0 cursor-pointer"
          aria-label="CrackFlow home"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: GOLD }}
          >
            <Zap size={17} color={DARK} strokeWidth={2.5} />
          </div>
          <span className="font-extrabold text-lg tracking-tight" style={{ color: TEXT }}>
            CrackFlow
          </span>
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="relative px-3 py-1.5 text-[14px] font-medium transition-colors rounded-full"
              style={{
                color: active === l.href && view === "landing" ? TEXT : TEXT_SEC,
                background: active === l.href && view === "landing" ? `${GOLD}22` : "transparent",
              }}
            >
              {l.label}
              {active === l.href && view === "landing" && (
                <span
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                  style={{ background: GOLD }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="hidden md:flex w-9 h-9 items-center justify-center rounded-full transition-colors"
            style={{ background: "#F4F4F0" }}
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={15} color={TEXT_SEC} /> : <Moon size={15} color={TEXT_SEC} />}
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenDashboard}
                className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs border transition-all duration-200"
                style={{
                  background: view === "dashboard" ? `${GOLD}22` : "#fff",
                  borderColor: view === "dashboard" ? GOLD : BORDER,
                  color: TEXT,
                }}
              >
                <LayoutDashboard size={14} color={GOLD} />
                Dashboard
              </button>
              <button
                onClick={logout}
                className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 rounded-full font-semibold text-xs text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <LogOut size={13} />
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth("login")}
                className="px-4 py-2 text-xs font-semibold rounded-full transition-colors hover:bg-gray-100"
                style={{ color: TEXT }}
              >
                Log In
              </button>
              <button
                onClick={() => onOpenAuth("signup")}
                className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 hover:brightness-110 active:scale-95"
                style={{ background: GOLD, color: TEXT }}
              >
                Get Started
              </button>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: "#F4F4F0" }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Open menu"
          >
            {mobileOpen ? <X size={17} color={TEXT} /> : <Menu size={17} color={TEXT} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="mt-2 rounded-3xl p-5 flex flex-col gap-2"
          style={{ background: "rgba(255,255,255,0.98)", border: `1px solid ${BORDER}`, boxShadow: "0 8px 40px rgba(0,0,0,0.10)", fontFamily: "Manrope, sans-serif" }}
        >
          {NAV_LINKS.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ color: active === l.href ? TEXT : TEXT_SEC, background: active === l.href ? `${GOLD}22` : "transparent" }}
            >
              {l.label}
            </button>
          ))}
          <div className="border-t mt-1 pt-3 space-y-2" style={{ borderColor: BORDER }}>
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenDashboard();
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-semibold text-sm border"
                  style={{ borderColor: BORDER, color: TEXT, background: "#fff" }}
                >
                  <LayoutDashboard size={16} color={GOLD} />
                  Go to Dashboard
                </button>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full font-semibold text-xs text-red-600 bg-red-50"
                >
                  <LogOut size={14} />
                  Sign Out ({user?.email?.split("@")[0]})
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenAuth("login");
                  }}
                  className="w-full py-2.5 rounded-full font-semibold text-sm border text-center"
                  style={{ borderColor: BORDER, color: TEXT }}
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenAuth("signup");
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-semibold text-sm"
                  style={{ background: GOLD, color: TEXT }}
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────
interface HeroProps {
  onGetStartedClick: () => void;
}

function Hero({ onGetStartedClick }: HeroProps) {
  return (
    <section
      id="hero"
      className="pt-36 pb-20 px-5 md:px-10 max-w-[1380px] mx-auto"
      style={{ fontFamily: "Manrope, sans-serif" }}
    >
      <div className="grid md:grid-cols-2 gap-12 items-center">
        {/* Left */}
        <div className="flex flex-col gap-7">
          <span
            className="inline-flex items-center gap-2 w-fit px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
            style={{ background: `${GOLD}22`, color: "#9B7C0A", border: `1px solid ${GOLD}66` }}
          >
            <Zap size={11} />
            AI Interview Copilot
          </span>

          <h1
            className="text-[3.25rem] md:text-[4rem] font-extrabold leading-[1.1] tracking-tight"
            style={{ color: TEXT }}
          >
            Your AI Copilot for{" "}
            <span style={{ color: GOLD }}>Real-Time</span>{" "}
            Interviews
          </h1>

          <p className="text-lg leading-relaxed" style={{ color: TEXT_SEC, maxWidth: 480 }}>
            Listen. Understand. Assist. Get concise answers while you focus on the conversation.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={onGetStartedClick}
              className="flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm transition-all duration-200 hover:brightness-110 active:scale-95 shadow-sm border-0 cursor-pointer"
              style={{ background: GOLD, color: TEXT }}
            >
              Get Started Now
            </button>
            <a
              href="#demos"
              className="flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm border transition-all duration-200 hover:bg-gray-50"
              style={{ color: TEXT, borderColor: BORDER, background: "#fff" }}
              onClick={(e) => {
                e.preventDefault();
                document.querySelector("#demos")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <Play size={14} />
              Watch Demo
            </a>
          </div>

          {/* Trust bullets */}
          <div className="flex flex-wrap gap-5">
            {[
              { icon: <Shield size={14} />, label: "Secure & Private" },
              { icon: <Mic size={14} />, label: "Real-Time Assist" },
              { icon: <Keyboard size={14} />, label: "Keyboard Shortcuts" },
            ].map(({ icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 text-sm font-medium"
                style={{ color: TEXT_SEC }}
              >
                <span style={{ color: GOLD }}>{icon}</span>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Right — product mockup */}
        <div className="relative flex items-center justify-center">
          {/* Ambient glow */}
          <div
            className="absolute inset-0 rounded-3xl blur-3xl opacity-20"
            style={{ background: `radial-gradient(ellipse at center, ${GOLD} 0%, transparent 70%)` }}
          />

          <div
            className="relative w-full max-w-[560px] rounded-2xl overflow-hidden"
            style={{
              background: "#1A1D23",
              border: "1px solid #2E333C",
              boxShadow: "0 24px 80px rgba(0,0,0,0.32), 0 4px 24px rgba(245,197,24,0.08)",
            }}
          >
            {/* Window bar */}
            <div
              className="flex items-center gap-2 px-4 py-3 border-b"
              style={{ borderColor: "#2E333C", background: "#141720" }}
            >
              <span className="w-3 h-3 rounded-full" style={{ background: "#FF5F57" }} />
              <span className="w-3 h-3 rounded-full" style={{ background: "#FFBD2E" }} />
              <span className="w-3 h-3 rounded-full" style={{ background: "#28CA41" }} />
              <span className="ml-auto text-xs font-medium" style={{ color: "#4A5260" }}>
                Google Meet — Interview Session
              </span>
            </div>

            {/* Interview area */}
            <div className="p-4 space-y-3">
              {/* Interviewer tile */}
              <div className="rounded-xl overflow-hidden" style={{ background: "#242830" }}>
                <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "#2E333C" }}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "#3A4050", color: "#C8CEDD" }}
                  >
                    RS
                  </div>
                  <span className="text-sm font-medium" style={{ color: "#C8CEDD" }}>
                    Rahul S. — Interviewer
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs" style={{ color: "#4A5260" }}>Live</span>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm leading-relaxed" style={{ color: "#D1D5DB" }}>
                    "Can you explain how HashMap works internally in Java, and how it handles collisions?"
                  </p>
                </div>
              </div>

              {/* CrackFlow AI panel */}
              <div
                className="rounded-xl border"
                style={{ background: "#0F1115", borderColor: `${GOLD}44` }}
              >
                <div
                  className="flex items-center gap-2 px-4 py-2.5 border-b"
                  style={{ borderColor: `${GOLD}22` }}
                >
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center"
                    style={{ background: GOLD }}
                  >
                    <Zap size={10} color={DARK} strokeWidth={3} />
                  </div>
                  <span className="text-xs font-bold tracking-wide" style={{ color: GOLD }}>
                    CrackFlow — AI Response
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="w-1 h-3 rounded-full bg-yellow-400 animate-pulse" style={{ animationDelay: "0ms" }} />
                    <span className="w-1 h-2 rounded-full bg-yellow-400 animate-pulse" style={{ animationDelay: "150ms" }} />
                    <span className="w-1 h-4 rounded-full bg-yellow-400 animate-pulse" style={{ animationDelay: "300ms" }} />
                    <span className="w-1 h-2 rounded-full bg-yellow-400 animate-pulse" style={{ animationDelay: "450ms" }} />
                    <span className="text-xs ml-1" style={{ color: "#4A5260" }}>Listening</span>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-1.5">
                  {[
                    "Stores key-value pairs in an array of buckets (Node<K,V>[])",
                    "hashCode() → index = hash & (capacity - 1)",
                    "Collision → linked list; Java 8+ uses balanced tree at 8+ entries",
                    "Average get() / put() complexity: O(1); worst case O(log n)",
                  ].map((line, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span
                        className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: GOLD }}
                      />
                      <p className="text-xs leading-relaxed" style={{ color: "#C8CEDD" }}>
                        {line}
                      </p>
                    </div>
                  ))}
                </div>
                <div
                  className="flex items-center justify-between px-4 py-2 border-t"
                  style={{ borderColor: `${GOLD}22` }}
                >
                  <span className="text-[11px]" style={{ color: "#4A5260" }}>
                    Ctrl+Enter to trigger · Ctrl+B to show/hide
                  </span>
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: GOLD }}
                  >
                    ↳ Expand
                  </span>
                </div>
              </div>

              {/* Meeting controls */}
              <div
                className="flex items-center justify-center gap-3 py-2"
                style={{ color: "#4A5260" }}
              >
                {["Mic", "Cam", "Share", "End"].map((ctrl) => (
                  <button
                    key={ctrl}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: ctrl === "End" ? "#3D1515" : "#242830", color: ctrl === "End" ? "#FF5F57" : "#8892A0" }}
                  >
                    {ctrl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Platform logos ─────────────────────────────────────────────────────────
function Platforms() {
  const platforms = [
    { name: "Zoom", letter: "Z", bg: "#2D8CFF", fg: "#fff" },
    { name: "Google Meet", letter: "M", bg: "#00AC47", fg: "#fff" },
    { name: "Microsoft Teams", letter: "T", bg: "#5059C9", fg: "#fff" },
    { name: "HackerRank", letter: "H", bg: "#2EC866", fg: "#fff" },
    { name: "LeetCode", letter: "L", bg: "#FFA116", fg: "#fff" },
    { name: "CodeSignal", letter: "CS", bg: "#1A1A2E", fg: "#fff" },
  ];

  return (
    <section
      className="py-10 px-5 md:px-10 max-w-[1380px] mx-auto"
      style={{ fontFamily: "Manrope, sans-serif" }}
    >
      <div
        className="flex flex-col md:flex-row items-center gap-6 px-8 py-6 rounded-2xl"
        style={{ background: "#fff", border: `1px solid ${BORDER}` }}
      >
        <p className="text-sm font-semibold shrink-0" style={{ color: TEXT_SEC }}>
          Works seamlessly with
        </p>
        <div className="flex flex-wrap justify-center md:justify-start items-center gap-4">
          {platforms.map((p) => (
            <span
              key={p.name}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold"
              style={{ border: `1px solid ${BORDER}`, background: "#FAFAF8" }}
            >
              <span
                className="w-5 h-5 rounded text-[10px] font-black flex items-center justify-center"
                style={{ background: p.bg, color: p.fg }}
              >
                {p.letter}
              </span>
              <span style={{ color: TEXT }}>{p.name}</span>
            </span>
          ))}
          <span className="text-sm font-medium" style={{ color: TEXT_SEC }}>+ more</span>
        </div>
      </div>
    </section>
  );
}

// ─── Problem → Solution ─────────────────────────────────────────────────────
function ProblemSolution() {
  const cards = [
    {
      icon: <Headphones size={20} />,
      problem: "Missed the question?",
      solution: "CrackFlow listens to the conversation in real time.",
    },
    {
      icon: <Brain size={20} />,
      problem: "Need context?",
      solution: "CrackFlow understands the question before generating an answer.",
    },
    {
      icon: <Clock size={20} />,
      problem: "Need an answer quickly?",
      solution: "Get concise, structured responses without breaking your flow.",
    },
  ];

  return (
    <section
      className="py-20 px-5 md:px-10 max-w-[1380px] mx-auto"
      style={{ fontFamily: "Manrope, sans-serif" }}
    >
      <div className="text-center mb-12">
        <h2
          className="text-[2.2rem] md:text-[2.75rem] font-extrabold leading-tight"
          style={{ color: TEXT }}
        >
          Interviews move fast.{" "}
          <span className="block">Your preparation shouldn't slow you down.</span>
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {cards.map(({ icon, problem, solution }) => (
          <div
            key={problem}
            className="flex flex-col gap-4 p-7 rounded-2xl transition-transform duration-200 hover:-translate-y-1"
            style={{ background: "#fff", border: `1px solid ${BORDER}`, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${GOLD}22`, color: GOLD }}
            >
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-base mb-1" style={{ color: TEXT }}>
                {problem}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: TEXT_SEC }}>
                {solution}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── How It Works ───────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: "01", title: "Listen", desc: "Captures the interview conversation in real time using system audio." },
    { n: "02", title: "Understand", desc: "Processes the question and identifies intent before generating a response." },
    { n: "03", title: "Assist", desc: "Generates a concise, structured answer tailored to the question type." },
    { n: "04", title: "You Stay in Control", desc: "Trigger assistance on demand with keyboard shortcuts — no mouse required." },
    { n: "05", title: "Private Overlay", desc: "The assistant panel is fully separate from the meeting interface." },
  ];

  return (
    <section
      id="how-it-works"
      className="py-20 px-5 md:px-10 max-w-[1380px] mx-auto"
      style={{ fontFamily: "Manrope, sans-serif" }}
    >
      <div className="text-center mb-14">
        <h2 className="text-[2.2rem] md:text-[2.75rem] font-extrabold mb-3" style={{ color: TEXT }}>
          How CrackFlow Works
        </h2>
        <p className="text-base" style={{ color: TEXT_SEC }}>
          Private AI assistance for real-time interviews.
        </p>
      </div>

      {/* Architecture diagram */}
      <div
        className="rounded-2xl p-6 md:p-10 mb-12"
        style={{ background: "#fff", border: `1px solid ${BORDER}`, boxShadow: "0 2px 16px rgba(0,0,0,0.05)" }}
      >
        <div className="grid grid-cols-3 gap-4 md:gap-8 text-center">
          {/* Your side */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-14 h-14 md:w-20 md:h-20 rounded-2xl flex items-center justify-center"
              style={{ background: `${GOLD}18`, border: `2px solid ${GOLD}44` }}
            >
              <Monitor size={28} color={GOLD} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: GOLD }}>
                Your Side
              </p>
              <p className="text-sm font-semibold" style={{ color: TEXT }}>Candidate PC</p>
              <div
                className="mt-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: DARK, color: GOLD }}
              >
                + CrackFlow Overlay
              </div>
            </div>
          </div>

          {/* Platform */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center"
              style={{ background: "#F4F4F0", border: `2px solid ${BORDER}` }}
            >
              <MessageSquare size={24} color={TEXT_SEC} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: TEXT_SEC }}>
                Platform
              </p>
              <p className="text-sm font-semibold mb-1" style={{ color: TEXT }}>Online Meeting</p>
              <div className="flex flex-col gap-1">
                {["Zoom", "Google Meet", "Teams"].map((p) => (
                  <span
                    key={p}
                    className="text-xs px-2 py-0.5 rounded-md font-medium"
                    style={{ background: "#F4F4F0", color: TEXT_SEC }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Their side */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-14 h-14 md:w-20 md:h-20 rounded-2xl flex items-center justify-center"
              style={{ background: "#F4F4F0", border: `2px solid ${BORDER}` }}
            >
              <Monitor size={28} color={TEXT_SEC} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: TEXT_SEC }}>
                Their Side
              </p>
              <p className="text-sm font-semibold" style={{ color: TEXT }}>Interviewer PC</p>
              <p className="text-xs mt-2 px-3 py-1.5 rounded-xl font-medium" style={{ background: "#F4F4F0", color: TEXT_SEC }}>
                Normal meeting view
              </p>
            </div>
          </div>
        </div>

        {/* Arrow connectors */}
        <div className="flex items-center justify-center mt-6 gap-2">
          <div className="h-px flex-1" style={{ background: `${GOLD}44` }} />
          <div
            className="px-4 py-1.5 rounded-full text-xs font-bold"
            style={{ background: `${GOLD}18`, color: "#9B7C0A" }}
          >
            Secure audio capture — invisible to meeting participants
          </div>
          <div className="h-px flex-1" style={{ background: `${GOLD}44` }} />
        </div>
      </div>

      {/* Steps */}
      <div className="grid md:grid-cols-5 gap-4">
        {steps.map((s) => (
          <div
            key={s.n}
            className="flex flex-col gap-3 p-5 rounded-2xl transition-transform duration-200 hover:-translate-y-1"
            style={{ background: "#fff", border: `1px solid ${BORDER}` }}
          >
            <span className="text-2xl font-extrabold" style={{ color: `${GOLD}66` }}>
              {s.n}
            </span>
            <h3 className="font-bold text-base" style={{ color: TEXT }}>
              {s.title}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: TEXT_SEC }}>
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Core Features ──────────────────────────────────────────────────────────
function Features() {
  const features = [
    {
      icon: <Mic size={18} />,
      name: "CrackFlow Live",
      desc: "Real-time AI assistance during interviews. Transcribes conversation and delivers structured answers on demand.",
    },
    {
      icon: <Code2 size={18} />,
      name: "CrackFlow Code",
      desc: "Coding, debugging, complexity analysis, and system-design assistance for technical rounds.",
    },
    {
      icon: <FileText size={18} />,
      name: "CrackFlow Context",
      desc: "Use your resume, projects, and job description as context to ground every response in your experience.",
    },
    {
      icon: <Users size={18} />,
      name: "CrackFlow Mock",
      desc: "Practice interviews with AI-driven sessions and structured feedback to sharpen your answers.",
    },
    {
      icon: <Keyboard size={18} />,
      name: "CrackFlow Control",
      desc: "Keyboard-first interaction — trigger, navigate, and dismiss the assistant without ever touching your mouse.",
    },
  ];

  return (
    <section
      id="features"
      className="py-20 px-5 md:px-10 max-w-[1380px] mx-auto"
      style={{ fontFamily: "Manrope, sans-serif" }}
    >
      <div className="text-center mb-14">
        <h2
          className="text-[2.2rem] md:text-[2.75rem] font-extrabold mb-3"
          style={{ color: TEXT }}
        >
          Powerful Features.{" "}
          <span style={{ color: GOLD }}>Built for Interviews.</span>
        </h2>
        <p className="text-base max-w-xl mx-auto" style={{ color: TEXT_SEC }}>
          Everything you need to stay focused during technical and behavioral interviews.
        </p>
      </div>

      {/* 3 + 2 grid */}
      <div className="grid md:grid-cols-3 gap-5 mb-5">
        {features.slice(0, 3).map((f) => (
          <FeatureCard key={f.name} {...f} />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        {features.slice(3).map((f) => (
          <FeatureCard key={f.name} {...f} />
        ))}
      </div>
    </section>
  );
}

function FeatureCard({ icon, name, desc }: { icon: React.ReactNode; name: string; desc: string }) {
  return (
    <div
      className="group flex flex-col gap-5 p-7 rounded-2xl transition-all duration-200 hover:-translate-y-1 cursor-default"
      style={{ background: "#fff", border: `1px solid ${BORDER}`, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${GOLD}22`, color: GOLD }}
        >
          {icon}
        </div>
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: `${GOLD}18`, color: GOLD }}
          aria-label={`Play ${name} demo`}
        >
          <Play size={12} fill={GOLD} />
        </button>
      </div>

      {/* Dark thumbnail */}
      <div
        className="rounded-xl h-28 flex items-center justify-center"
        style={{ background: DARK }}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: GOLD }}>
            <Zap size={10} color={DARK} strokeWidth={3} />
          </div>
          <span className="text-xs font-bold" style={{ color: GOLD }}>CrackFlow</span>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-base mb-1" style={{ color: TEXT }}>
          {name}
        </h3>
        <p className="text-sm leading-relaxed mb-3" style={{ color: TEXT_SEC }}>
          {desc}
        </p>
        <button
          className="text-sm font-semibold flex items-center gap-1 transition-colors hover:gap-2"
          style={{ color: GOLD }}
        >
          See how it works <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── WOW moment (dark section) ──────────────────────────────────────────────
function WowMoment() {
  return (
    <section
      className="py-24 px-5 md:px-10 relative overflow-hidden"
      style={{ background: DARK, fontFamily: "Manrope, sans-serif" }}
    >
      {/* Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 100%, ${GOLD}22 0%, transparent 70%)`,
        }}
      />

      <div className="relative max-w-[1380px] mx-auto">
        <div className="text-center mb-14">
          <h2
            className="text-[2.5rem] md:text-[3.5rem] font-extrabold leading-tight mb-4"
            style={{ color: "#FAFAF8" }}
          >
            From question to answer.
            <br />
            <span style={{ color: GOLD }}>In seconds.</span>
          </h2>
        </div>

        {/* Interaction demo */}
        <div className="max-w-2xl mx-auto">
          {/* Interviewer bubble */}
          <div className="flex items-start gap-3 mb-6">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "#3A4050", color: "#C8CEDD" }}
            >
              IV
            </div>
            <div
              className="px-5 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed"
              style={{ background: "#2A2F3A", color: "#D1D5DB", maxWidth: "80%" }}
            >
              "How does HashMap work internally in Java?"
            </div>
          </div>

          {/* Processing indicator */}
          <div className="flex items-center gap-3 mb-5 ml-12">
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-1 rounded-full animate-pulse"
                  style={{
                    background: GOLD,
                    height: `${8 + Math.sin(i) * 6}px`,
                    animationDelay: `${i * 100}ms`,
                  }}
                />
              ))}
            </div>
            <span className="text-xs font-medium" style={{ color: `${GOLD}99` }}>
              CrackFlow processing…
            </span>
          </div>

          {/* CrackFlow response */}
          <div
            className="ml-4 rounded-2xl border overflow-hidden"
            style={{ borderColor: `${GOLD}44`, background: "#0F1115" }}
          >
            <div
              className="flex items-center gap-2 px-5 py-3 border-b"
              style={{ borderColor: `${GOLD}22` }}
            >
              <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: GOLD }}>
                <Zap size={10} color={DARK} strokeWidth={3} />
              </div>
              <span className="text-xs font-bold" style={{ color: GOLD }}>CrackFlow AI Response</span>
            </div>
            <div className="px-5 py-4 space-y-2">
              {[
                "Stores key-value pairs in an array of buckets (Node<K,V>[])",
                "hashCode() determines the bucket index via (n-1) & hash",
                "Collisions resolved with linked list; becomes tree at 8+ entries (Java 8+)",
                "Average get() / put() complexity: O(1) · Worst case: O(log n)",
              ].map((line, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: GOLD }} />
                  <p className="text-sm leading-relaxed" style={{ color: "#C8CEDD" }}>{line}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Platform Demos ─────────────────────────────────────────────────────────
function Demos() {
  const [tab, setTab] = useState(0);

  const tabs = [
    {
      label: "Video Interviews",
      items: ["Zoom", "Google Meet", "Microsoft Teams", "Webex"],
    },
    {
      label: "Coding Platforms",
      items: ["HackerRank", "LeetCode", "CodeSignal", "CoderPad"],
    },
    {
      label: "Real-Time Assistance",
      items: ["Behavioral Q&A", "System Design", "DSA Problems", "HR Rounds"],
    },
  ];

  return (
    <section
      id="demos"
      className="py-20 px-5 md:px-10 max-w-[1380px] mx-auto"
      style={{ fontFamily: "Manrope, sans-serif" }}
    >
      <div className="text-center mb-12">
        <h2 className="text-[2.2rem] md:text-[2.75rem] font-extrabold mb-3" style={{ color: TEXT }}>
          See CrackFlow in Action
        </h2>
      </div>

      {/* Tab bar */}
      <div className="flex justify-center mb-8">
        <div
          className="flex gap-1 p-1 rounded-full"
          style={{ background: "#F0F0EC", border: `1px solid ${BORDER}` }}
        >
          {tabs.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setTab(i)}
              className="px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200"
              style={{
                background: tab === i ? GOLD : "transparent",
                color: tab === i ? TEXT : TEXT_SEC,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Demo cards */}
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
        {tabs[tab].items.map((item) => (
          <div
            key={item}
            className="group relative rounded-2xl overflow-hidden cursor-pointer transition-transform duration-200 hover:-translate-y-1"
            style={{ background: DARK, border: `1px solid #2E333C`, aspectRatio: "16/9" }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 duration-200"
                style={{ background: "rgba(255,255,255,0.12)", border: "2px solid rgba(255,255,255,0.2)" }}
              >
                <Play size={18} color="#fff" fill="#fff" />
              </div>
              <span className="text-sm font-semibold" style={{ color: "#C8CEDD" }}>
                {item}
              </span>
            </div>
            <div
              className="absolute bottom-3 right-3 px-2 py-1 rounded-md text-[10px] font-bold"
              style={{ background: `${GOLD}22`, color: GOLD }}
            >
              Demo
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Privacy / Security ─────────────────────────────────────────────────────
function Privacy() {
  const features = [
    { icon: <Eye size={16} />, label: "Screen-share privacy", desc: "The overlay is excluded from screen sharing." },
    { icon: <Monitor size={16} />, label: "Click-through interaction", desc: "Stays out of your way between uses." },
    { icon: <Keyboard size={16} />, label: "Keyboard-first controls", desc: "No visible mouse interaction with the assistant." },
    { icon: <Cpu size={16} />, label: "Native desktop architecture", desc: "Runs outside the browser for deeper system access." },
    { icon: <Lock size={16} />, label: "Private context handling", desc: "Your documents are processed locally where possible." },
  ];

  const platforms = ["Zoom", "Google Meet", "Microsoft Teams", "Webex", "HackerRank", "CodeSignal", "CoderPad"];

  return (
    <section
      className="py-20 px-5 md:px-10 max-w-[1380px] mx-auto"
      style={{ fontFamily: "Manrope, sans-serif" }}
    >
      <div
        className="grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden"
        style={{ border: `1px solid ${BORDER}`, boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}
      >
        {/* Left */}
        <div className="p-8 md:p-12" style={{ background: "#fff" }}>
          <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold mb-4 leading-tight" style={{ color: TEXT }}>
            Built for Privacy.{" "}
            <span className="block" style={{ color: GOLD }}>Designed to stay out of your way.</span>
          </h2>
          <p className="text-base leading-relaxed mb-8" style={{ color: TEXT_SEC }}>
            CrackFlow runs as a native desktop application and maintains a private overlay that is separate from your
            meeting interface. Your interviewer sees only the meeting — nothing else.
          </p>

          <div className="space-y-4">
            {features.map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${GOLD}22`, color: GOLD }}
                >
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>{f.label}</p>
                  <p className="text-xs" style={{ color: TEXT_SEC }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — verification */}
        <div
          className="p-8 md:p-12"
          style={{ background: "#FAFAF8", borderLeft: `1px solid ${BORDER}` }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: TEXT_SEC }}>
            Platform Verification
          </p>
          <div className="space-y-3">
            {platforms.map((p) => (
              <div
                key={p}
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: "#fff", border: `1px solid ${BORDER}` }}
              >
                <span className="text-sm font-medium" style={{ color: TEXT }}>{p}</span>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: "#D1FAE5", color: "#065F46" }}
                  >
                    Verified
                  </span>
                  <span className="text-[11px]" style={{ color: TEXT_SEC }}>Jul 2026</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs mt-4" style={{ color: TEXT_SEC }}>
            Last checked: July 15, 2026. Verification status reflects manual testing at that date.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Social Proof ───────────────────────────────────────────────────────────
function Testimonials() {
  const testimonials = [
    {
      initials: "AM",
      name: "Arjun M.",
      role: "Software Engineer — placed at a product startup",
      text: "CrackFlow helped me stay calm during a live coding round. I knew the answer but was blanking under pressure — having a structured hint visible made all the difference.",
    },
    {
      initials: "PS",
      name: "Priya S.",
      role: "Backend Developer — cleared 3 rounds in one week",
      text: "The keyboard shortcut workflow is exactly what I needed. I could trigger the assistant without any visible gesture. It felt like having a very smart friend in my ear.",
    },
    {
      initials: "RK",
      name: "Rohan K.",
      role: "Full-stack developer — active job seeker",
      text: "The context loading feature is underrated. I loaded my resume and the JD and every behavioral answer it gave me was actually grounded in my real experience.",
    },
  ];

  return (
    <section
      className="py-20 px-5 md:px-10 max-w-[1380px] mx-auto"
      style={{ fontFamily: "Manrope, sans-serif" }}
    >
      <div className="text-center mb-12">
        <h2 className="text-[2.2rem] md:text-[2.75rem] font-extrabold mb-3" style={{ color: TEXT }}>
          Built for candidates who take{" "}
          <br />
          <span style={{ color: GOLD }}>interviews seriously.</span>
        </h2>
        <p className="text-sm" style={{ color: TEXT_SEC }}>
          * Reviews shared by beta users. Individual results may vary.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {testimonials.map((t) => (
          <div
            key={t.initials}
            className="flex flex-col gap-4 p-7 rounded-2xl"
            style={{ background: "#fff", border: `1px solid ${BORDER}`, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
          >
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={13} fill={GOLD} color={GOLD} />
              ))}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: TEXT_SEC }}>
              "{t.text}"
            </p>
            <div className="flex items-center gap-3 mt-auto">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: `${GOLD}22`, color: "#9B7C0A" }}
              >
                {t.initials}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: TEXT }}>{t.name}</p>
                <p className="text-xs" style={{ color: TEXT_SEC }}>{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Pricing Teaser ─────────────────────────────────────────────────────────
interface PricingTeaserProps {
  onSelectPlan: (planId: "starter" | "pro" | "lifetime") => void;
  loadingPlanId: string | null;
  demoNotice: string | null;
}

function PricingTeaser({ onSelectPlan, loadingPlanId, demoNotice }: PricingTeaserProps) {
  const { isAuthenticated, userProfile } = useAuth();
  const currentPlanTier = userProfile?.planTier || "none";

  return (
    <section
      id="pricing"
      className="py-20 px-5 md:px-10 max-w-[1380px] mx-auto"
      style={{ fontFamily: "Manrope, sans-serif" }}
    >
      <div className="text-center mb-14">
        <h2 className="text-[2.2rem] md:text-[2.75rem] font-extrabold mb-3" style={{ color: TEXT }}>
          Simple pricing.{" "}
          <span style={{ color: GOLD }}>No surprises.</span>
        </h2>
        <div className="flex justify-center gap-6 mt-4">
          {["No hidden fees", "Clear usage limits", "Transparent billing"].map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-sm" style={{ color: TEXT_SEC }}>
              <Check size={13} color={GOLD} strokeWidth={2.5} />
              {t}
            </span>
          ))}
        </div>
      </div>

      {demoNotice && (
        <div className="max-w-2xl mx-auto mb-8 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-700 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span className="font-bold">{demoNotice}</span>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-5">
        {PLANS.map((p) => {
          const isCurrent = isAuthenticated && currentPlanTier === p.id;
          return (
            <div
              key={p.id}
              className="flex flex-col gap-5 p-7 rounded-2xl"
              style={{
                background: p.popular ? `${GOLD}0F` : "#fff",
                border: `2px solid ${p.popular ? GOLD : BORDER}`,
                boxShadow: p.popular ? `0 4px 32px ${GOLD}22` : "0 2px 12px rgba(0,0,0,0.04)",
              }}
            >
              {p.popular && (
                <span
                  className="w-fit text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: GOLD, color: TEXT }}
                >
                  Most Popular
                </span>
              )}
              <div>
                <h3 className="font-bold text-lg" style={{ color: TEXT }}>{p.name}</h3>
                <p className="text-sm" style={{ color: TEXT_SEC }}>{p.description}</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold" style={{ color: TEXT }}>
                  {p.currencySymbol}{p.price}
                </span>
                <span className="text-sm" style={{ color: TEXT_SEC }}>{p.billingPeriodLabel}</span>
              </div>
              <ul className="space-y-2">
                {p.features.map((f) => (
                  <li key={f.text} className="flex items-center gap-2 text-sm" style={{ color: TEXT_SEC }}>
                    <Check size={13} color={GOLD} strokeWidth={2.5} />
                    {f.text}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onSelectPlan(p.id)}
                disabled={isCurrent || loadingPlanId === p.id}
                className="mt-auto text-center py-3 rounded-full font-bold text-sm transition-all duration-200 hover:brightness-110 cursor-pointer border-0 flex items-center justify-center gap-2"
                style={{
                  background: isCurrent ? "#E5E7EB" : p.popular ? GOLD : "#F4F4F0",
                  color: isCurrent ? "#9CA3AF" : TEXT,
                }}
              >
                {loadingPlanId === p.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : !isAuthenticated ? (
                  p.buttonText
                ) : isCurrent ? (
                  "Current Plan"
                ) : (
                  `Upgrade to ${p.name}`
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Compare ────────────────────────────────────────────────────────────────
function Compare() {
  const competitors = [
    { name: "Parakeet AI", live: "Yes", code: "Limited", context: "No", mock: "No", price: "USD" },
    { name: "Interview Sidekick", live: "Yes", code: "Yes", context: "Limited", mock: "Yes", price: "USD" },
    { name: "LockedIn AI", live: "Yes", code: "No", context: "No", mock: "No", price: "USD" },
    { name: "Chiku AI", live: "Yes", code: "Limited", context: "No", mock: "No", price: "USD" },
  ];

  const crackflow = { live: "Yes", code: "Yes", context: "Yes", mock: "Yes", price: "INR" };

  return (
    <section
      id="compare"
      className="py-20 px-5 md:px-10 max-w-[1380px] mx-auto"
      style={{ fontFamily: "Manrope, sans-serif" }}
    >
      <div className="text-center mb-12">
        <h2 className="text-[2.2rem] md:text-[2.75rem] font-extrabold mb-3" style={{ color: TEXT }}>
          See how CrackFlow compares.
        </h2>
        <p className="text-base" style={{ color: TEXT_SEC }}>
          Compare features, context support, platform coverage, and pricing.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl" style={{ border: `1px solid ${BORDER}` }}>
        <table className="w-full min-w-[640px] text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F4F4F0", borderBottom: `1px solid ${BORDER}` }}>
              <th className="text-left px-5 py-3.5 font-semibold" style={{ color: TEXT_SEC }}>Feature</th>
              <th className="px-5 py-3.5 text-center font-bold" style={{ color: TEXT, background: `${GOLD}18` }}>
                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-4 h-4 rounded flex items-center justify-center" style={{ background: GOLD }}>
                    <Zap size={9} color={DARK} strokeWidth={3} />
                  </div>
                  CrackFlow
                </div>
              </th>
              {competitors.map((c) => (
                <th key={c.name} className="px-5 py-3.5 text-center font-medium" style={{ color: TEXT_SEC }}>{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { key: "live", label: "Real-Time Live Assist" },
              { key: "code", label: "Coding Mode" },
              { key: "context", label: "Context Loading" },
              { key: "mock", label: "Mock Interviews" },
              { key: "price", label: "Pricing Currency" },
            ].map(({ key, label }, ri) => (
              <tr
                key={key}
                style={{
                  borderBottom: `1px solid ${BORDER}`,
                  background: ri % 2 === 0 ? "#fff" : "#FAFAF8",
                }}
              >
                <td className="px-5 py-3.5 font-medium" style={{ color: TEXT }}>{label}</td>
                <td className="px-5 py-3.5 text-center font-semibold" style={{ background: `${GOLD}0C`, color: TEXT }}>
                  {(crackflow as Record<string, string>)[key]}
                </td>
                {competitors.map((c) => (
                  <td key={c.name} className="px-5 py-3.5 text-center" style={{ color: TEXT_SEC }}>
                    {(c as Record<string, string>)[key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-center mt-4" style={{ color: TEXT_SEC }}>
        Competitor information based on publicly available feature lists. Subject to change. CrackFlow does not make claims about competitor quality.
      </p>

      <div className="text-center mt-8">
        <a
          href="#pricing"
          className="inline-flex items-center gap-2 px-7 py-3 rounded-full font-semibold text-sm border transition-colors hover:bg-gray-50"
          style={{ color: TEXT, borderColor: BORDER, background: "#fff" }}
        >
          Compare all tools <ArrowRight size={14} />
        </a>
      </div>
    </section>
  );
}

// ─── FAQ ────────────────────────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section
      className="py-20 px-5 md:px-10 max-w-[860px] mx-auto"
      style={{ fontFamily: "Manrope, sans-serif" }}
    >
      <div className="text-center mb-12">
        <h2 className="text-[2.2rem] md:text-[2.75rem] font-extrabold" style={{ color: TEXT }}>
          Frequently Asked Questions
        </h2>
      </div>

      <div className="space-y-2">
        {FAQS.map((faq, i) => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${open === i ? GOLD + "66" : BORDER}`, background: "#fff" }}
          >
            <button
              className="w-full text-left flex items-center justify-between px-6 py-4 gap-4"
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
            >
              <span className="text-sm font-semibold" style={{ color: TEXT }}>
                {faq.q}
              </span>
              <ChevronDown
                size={16}
                color={TEXT_SEC}
                className="shrink-0 transition-transform duration-300"
                style={{ transform: open === i ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
            {open === i && (
              <div className="px-6 pb-5">
                <p className="text-sm leading-relaxed" style={{ color: TEXT_SEC }}>
                  {faq.a}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Final CTA ──────────────────────────────────────────────────────────────
interface FinalCTAProps {
  onGetStartedClick: () => void;
}

function FinalCTA({ onGetStartedClick }: FinalCTAProps) {
  return (
    <section
      className="py-28 px-5 md:px-10 relative overflow-hidden"
      style={{ background: DARK, fontFamily: "Manrope, sans-serif" }}
    >
      {/* Corner glows */}
      <div
        className="absolute bottom-0 left-0 w-72 h-72 rounded-full blur-[80px] pointer-events-none"
        style={{ background: `${GOLD}1A`, transform: "translate(-50%, 50%)" }}
      />
      <div
        className="absolute bottom-0 right-0 w-72 h-72 rounded-full blur-[80px] pointer-events-none"
        style={{ background: `${GOLD}1A`, transform: "translate(50%, 50%)" }}
      />

      <div className="relative max-w-[800px] mx-auto text-center">
        <h2
          className="text-[2.5rem] md:text-[3.5rem] font-extrabold leading-tight mb-5"
          style={{ color: "#FAFAF8" }}
        >
          Your Interview.
          <br />
          Your Focus.
          <br />
          <span style={{ color: GOLD }}>Your AI Copilot.</span>
        </h2>
        <p className="text-base mb-10" style={{ color: "#8892A0" }}>
          Get real-time assistance without breaking your interview flow.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onGetStartedClick}
            className="flex items-center gap-2 px-8 py-4 rounded-full font-bold text-sm transition-all duration-200 hover:brightness-110 active:scale-95 cursor-pointer border-0"
            style={{ background: GOLD, color: TEXT }}
          >
            Get Started Now
          </button>
        </div>

        <p className="mt-6 text-xs" style={{ color: "#4A5260" }}>
          No credit card required to get started.
        </p>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────
function Footer() {
  const cols = [
    {
      heading: "Product",
      links: ["Features", "Live Copilot", "Mock Interviews", "Coding Mode", "Behavioral Mode", "Pricing"],
    },
    {
      heading: "Resources",
      links: ["Blog", "Interview Questions", "Guides", "Compare", "FAQ"],
    },
    {
      heading: "Company",
      links: ["About", "Contact", "Support"],
    },
    {
      heading: "Legal",
      links: ["Privacy", "Terms", "Refund", "Cookies"],
    },
  ];

  return (
    <footer
      className="py-16 px-5 md:px-10 border-t"
      style={{ borderColor: BORDER, fontFamily: "Manrope, sans-serif", background: "#fff" }}
    >
      <div className="max-w-[1380px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-14">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: GOLD }}
              >
                <Zap size={14} color={DARK} strokeWidth={2.5} />
              </div>
              <span className="font-extrabold text-base" style={{ color: TEXT }}>CrackFlow</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: TEXT_SEC }}>
              AI interview copilot for real-time assistance.
            </p>
          </div>

          {cols.map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: TEXT_SEC }}>
                {col.heading}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-sm transition-colors hover:opacity-70"
                      style={{ color: TEXT_SEC }}
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t"
          style={{ borderColor: BORDER }}
        >
          <p className="text-xs" style={{ color: TEXT_SEC }}>
            © 2026 CrackFlow. All rights reserved.
          </p>
          <p className="text-xs" style={{ color: TEXT_SEC }}>
            Made for candidates who take interviews seriously.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Root Application ────────────────────────────────────────────────────────
export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [view, setView] = useState<"landing" | "dashboard">("landing");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "signup" | "forgot">("login");
  const [pendingPlanId, setPendingPlanId] = useState<"starter" | "pro" | "lifetime" | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  const { isAuthenticated, selectPlan } = useAuth();

  const [checkoutStatus, setCheckoutStatus] = useState<"success" | "cancel" | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success") return "success";
    if (checkout === "cancel") return "cancel";
    return null;
  });

  const clearCheckoutParams = () => {
    setCheckoutStatus(null);
    if (typeof window !== "undefined" && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ""));
    }
  };

  const handleOpenAuth = (tab: "login" | "signup" | "forgot" = "login") => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const handleSelectPlan = async (planId: "starter" | "pro" | "lifetime") => {
    if (!isAuthenticated) {
      setPendingPlanId(planId);
      handleOpenAuth("signup");
    } else {
      setLoadingPlanId(planId);
      setDemoNotice(null);
      try {
        const res = await selectPlan(planId);
        if (!res.success) {
          setDemoNotice(res.error || "Failed to start checkout session.");
        }
      } catch (err: any) {
        setDemoNotice(`Failed to start checkout: ${err?.message || "Unknown error"}`);
      } finally {
        setLoadingPlanId(null);
      }
    }
  };

  const handleAuthSuccess = () => {
    if (pendingPlanId) {
      const planToSelect = pendingPlanId;
      setPendingPlanId(null);
      handleSelectPlan(planToSelect);
    } else {
      setView("dashboard");
    }
  };

  return (
    <div
      style={{
        fontFamily: "Manrope, sans-serif",
        background: BG,
        minHeight: "100vh",
        scrollBehavior: "smooth",
      }}
    >
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenAuth={handleOpenAuth}
        onOpenDashboard={() => {
          clearCheckoutParams();
          setView("dashboard");
        }}
        onGoHome={() => {
          clearCheckoutParams();
          setView("landing");
        }}
        view={view}
      />

      {checkoutStatus === "success" ? (
        <CheckoutSuccess
          onGoToDashboard={() => {
            clearCheckoutParams();
            setView("dashboard");
          }}
          onDownloadApp={() => {
            clearCheckoutParams();
            setView("dashboard");
          }}
        />
      ) : checkoutStatus === "cancel" ? (
        <CheckoutCancel
          onBackToPricing={() => {
            clearCheckoutParams();
            setView("landing");
            setTimeout(() => {
              document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" });
            }, 100);
          }}
          onGoToDashboard={() => {
            clearCheckoutParams();
            setView("dashboard");
          }}
        />
      ) : view === "dashboard" && isAuthenticated ? (
        <Dashboard
          onReturnToHome={() => setView("landing")}
          onOpenPricing={() => {
            setView("landing");
            setTimeout(() => {
              document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" });
            }, 100);
          }}
        />
      ) : (
        <main>
          <Hero onGetStartedClick={() => (isAuthenticated ? setView("dashboard") : handleOpenAuth("signup"))} />
          <Platforms />
          <ProblemSolution />
          <HowItWorks />
          <Features />
          <WowMoment />
          <Demos />
          <Privacy />
          <Testimonials />
          <PricingTeaser
            onSelectPlan={handleSelectPlan}
            loadingPlanId={loadingPlanId}
            demoNotice={demoNotice}
          />
          <Compare />
          <FAQ />
          <FinalCTA onGetStartedClick={() => (isAuthenticated ? setView("dashboard") : handleOpenAuth("signup"))} />
        </main>
      )}

      <Footer />

      {/* Auth Modal Overlay */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setPendingPlanId(null);
        }}
        initialTab={authModalTab}
        pendingPlanId={pendingPlanId}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
