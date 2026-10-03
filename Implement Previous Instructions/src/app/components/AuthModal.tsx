import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { formatAuthError } from "../../services/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  Loader2,
  ShieldCheck,
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Link2,
  ArrowLeft,
} from "lucide-react";
import type { AuthCredential } from "firebase/auth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "login" | "signup" | "forgot";
  pendingPlanId?: string | null;
  onSuccess?: () => void;
}

type ModalTab = "login" | "signup" | "forgot" | "verify-email" | "link-account";

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = "login",
  pendingPlanId = null,
  onSuccess,
}) => {
  const [tab, setTab] = useState<ModalTab>(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email verification & linking states
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<AuthCredential | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    login,
    signup,
    loginWithGoogle,
    resetPassword,
    linkPendingCredential,
    sendVerificationEmail,
    reloadAndCheckVerification,
  } = useAuth();

  useEffect(() => {
    setTab(initialTab);
    setError(null);
    setMessage(null);
    setPendingGoogleCredential(null);
  }, [initialTab, isOpen]);

  // Clean up cooldown timer
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  const startResendCooldown = (seconds = 60) => {
    setResendCooldown(seconds);
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setError(null);
    setMessage(null);
    setPendingGoogleCredential(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      handleClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      if (err?.code === "auth/account-exists-with-different-credential") {
        setPendingGoogleCredential(err.pendingCredential);
        if (err.email) setEmail(err.email);
        setPassword("");
        setTab("link-account");
        setMessage(
          "An account with this email already exists with a password. Please enter your password to connect your Google account."
        );
      } else {
        setError(formatAuthError(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter your password to link your Google account.");
      return;
    }
    if (!pendingGoogleCredential) {
      setError("Missing Google authorization. Please try signing in with Google again.");
      return;
    }

    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      await linkPendingCredential(email, password, pendingGoogleCredential);
      setMessage("Google account successfully connected!");
      setTimeout(() => {
        handleClose();
        if (onSuccess) onSuccess();
      }, 800);
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    setMessage(null);
    try {
      await sendVerificationEmail();
      setMessage("Verification email has been resent! Please check your inbox and spam folder.");
      startResendCooldown(60);
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    setIsCheckingVerification(true);
    setError(null);
    setMessage(null);
    try {
      const isVerified = await reloadAndCheckVerification();
      if (isVerified) {
        setMessage("Email verified successfully! Welcome to CrackFlow.");
        setTimeout(() => {
          handleClose();
          if (onSuccess) onSuccess();
        }, 800);
      } else {
        setError("Your email is not verified yet. Please check your inbox, click the verification link, and try again.");
      }
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      if (tab === "login") {
        if (!email || !password) {
          throw new Error("Please enter both email and password.");
        }
        await login(email, password);
        handleClose();
        if (onSuccess) onSuccess();
      } else if (tab === "signup") {
        if (!email || !password) {
          throw new Error("Please fill in all required fields.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        const res = await signup(email, password, displayName);
        // Switch to email verification tab
        setTab("verify-email");
        if (res.verificationSent) {
          setMessage(`A verification link has been sent to ${email}.`);
          startResendCooldown(60);
        } else {
          setMessage("Account created. Please verify your email address.");
        }
      } else if (tab === "forgot") {
        if (!email) {
          throw new Error("Please enter your email address.");
        }
        await resetPassword(email);
        setMessage("If an account exists for this email, a password reset link has been sent to your inbox.");
      }
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-[#0F1117] border-white/10 text-white p-6 rounded-2xl shadow-2xl backdrop-blur-xl">
        <DialogHeader className="text-center sm:text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-2">
            {tab === "verify-email" ? (
              <Mail className="w-6 h-6 text-amber-400" />
            ) : tab === "link-account" ? (
              <Link2 className="w-6 h-6 text-amber-400" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            )}
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight text-white">
            {tab === "login"
              ? "Welcome back to CrackFlow"
              : tab === "signup"
              ? "Create your CrackFlow Account"
              : tab === "verify-email"
              ? "Verify your Email Address"
              : tab === "link-account"
              ? "Connect Google Account"
              : "Reset Password"}
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-sm mt-1">
            {tab === "verify-email"
              ? `We sent a verification link to ${email || "your email"}. Verify your address to secure your account.`
              : tab === "link-account"
              ? "This email is registered with a password. Enter your password to link your Google account."
              : pendingPlanId
              ? `Sign in or register to select the ${pendingPlanId.toUpperCase()} plan.`
              : tab === "login"
              ? "Enter your credentials to access your CrackFlow account."
              : tab === "signup"
              ? "Get instant access to your account & plan selection."
              : "Enter your account email to receive a password reset link."}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Selector (only for login / signup) */}
        {tab !== "forgot" && tab !== "verify-email" && tab !== "link-account" && (
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 my-2">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setError(null);
                setMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === "login"
                  ? "bg-amber-500 text-black shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("signup");
                setError(null);
                setMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === "signup"
                  ? "bg-amber-500 text-black shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        {/* VIEW 1: EMAIL VERIFICATION */}
        {tab === "verify-email" && (
          <div className="space-y-4 mt-2">
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-center">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Click the confirmation link sent to <strong className="text-amber-400">{email}</strong> to verify your account.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleCheckVerification}
                disabled={isCheckingVerification}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isCheckingVerification ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                I've Verified My Email
              </button>

              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendCooldown > 0 || isResending}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                {isResending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : "Resend Verification Email"}
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-gray-400">
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setError(null);
                  setMessage(null);
                }}
                className="hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" /> Back to Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  if (onSuccess) onSuccess();
                }}
                className="text-amber-400 hover:underline cursor-pointer"
              >
                Continue anyway →
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: LINK GOOGLE ACCOUNT */}
        {tab === "link-account" && (
          <form onSubmit={handleLinkAccountSubmit} className="space-y-4 mt-2">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Account Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-400 opacity-80 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Existing Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>
              <p className="text-[11px] text-gray-500 pt-0.5">
                Connecting Google ensures you can sign in with either your password or Google.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setError(null);
                  setMessage(null);
                  setPendingGoogleCredential(null);
                }}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-xs rounded-xl transition-all shadow-md shadow-amber-500/10 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Link2 className="w-3.5 h-3.5" />
                )}
                Connect Google
              </button>
            </div>
          </form>
        )}

        {/* VIEW 3: STANDARD LOGIN / SIGNUP / FORGOT FORM */}
        {tab !== "verify-email" && tab !== "link-account" && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {tab === "signup" && (
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>
            </div>

            {tab !== "forgot" && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-gray-400 font-medium">Password</label>
                  {tab === "login" && (
                    <button
                      type="button"
                      onClick={() => {
                        setTab("forgot");
                        setError(null);
                        setMessage(null);
                      }}
                      className="text-xs text-amber-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : tab === "login" ? (
                "Sign In"
              ) : tab === "signup" ? (
                "Create Account"
              ) : (
                "Send Reset Link"
              )}
            </button>

            <p className="text-[11px] text-gray-400 text-center pt-2 leading-relaxed">
              By proceeding, you agree to CrackFlow's{" "}
              <a href="/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                Terms & Conditions
              </a>{" "}
              and acknowledge our{" "}
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                Privacy Policy
              </a>{" "}
              and{" "}
              <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                Refund Policy
              </a>
              .
            </p>
          </form>
        )}

        {tab === "forgot" && (
          <div className="text-center mt-2">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setError(null);
                setMessage(null);
              }}
              className="text-xs text-gray-400 hover:text-white cursor-pointer"
            >
              ← Back to Sign In
            </button>
          </div>
        )}

        {/* Divider & Social Sign-In */}
        {tab !== "forgot" && tab !== "verify-email" && tab !== "link-account" && (
          <div className="space-y-3 pt-2">
            <div className="relative flex items-center justify-center">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#0F1117] px-3 text-[10px] text-gray-500 uppercase tracking-widest font-semibold absolute">
                Or continue with
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.6-1.5-.6-3.5 0-5z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                />
              </svg>
              Google Account
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
