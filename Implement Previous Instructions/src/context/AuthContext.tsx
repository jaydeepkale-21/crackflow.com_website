import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import {
  UserProfileData,
  ensureUserProfile,
  getUserProfile,
} from "../services/firestore";
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOutUser,
  sendPasswordReset,
} from "../services/auth";
import { getMe, createCheckout, verifyRazorpayPayment, UserMeData } from "../services/api";

export interface PlanSelectResult {
  success: boolean;
  message: string;
  checkoutUrl?: string;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfileData | null;
  backendUser: UserMeData | null;
  hasActiveAccess: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  login: typeof signInWithEmail;
  signup: typeof signUpWithEmail;
  loginWithGoogle: typeof signInWithGoogle;
  logout: typeof signOutUser;
  resetPassword: typeof sendPasswordReset;
  refreshProfile: () => Promise<void>;
  refreshBackend: () => Promise<void>;
  selectPlan: (planId: "starter" | "pro" | "lifetime") => Promise<PlanSelectResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [backendUser, setBackendUser] = useState<UserMeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshBackend = async () => {
    if (!auth.currentUser) {
      setBackendUser(null);
      return;
    }
    try {
      const res = await getMe();
      if (res.success && res.data) {
        setBackendUser(res.data);
      }
    } catch (err) {
      console.warn("[CrackFlow AuthContext] Error refreshing backend user:", err);
    }
  };

  const refreshProfile = async () => {
    if (!user) {
      setUserProfile(null);
      setBackendUser(null);
      return;
    }
    const profile = await getUserProfile(user.uid);
    if (profile) {
      setUserProfile(profile);
    } else {
      const newProfile = await ensureUserProfile(user);
      setUserProfile(newProfile);
    }
    await refreshBackend();
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const profile = await ensureUserProfile(currentUser);
          setUserProfile(profile);
        } catch (err) {
          console.error("[CrackFlow AuthContext] Error fetching user profile:", err);
        }

        try {
          const res = await getMe();
          if (res.success && res.data) {
            setBackendUser(res.data);
          }
        } catch (backendErr) {
          console.warn("[CrackFlow AuthContext] Backend /v1/me initial fetch:", backendErr);
        }

        try {
          const token = await currentUser.getIdToken();
          localStorage.setItem("crackflow_id_token", token);
        } catch (tokErr) {
          console.warn("[CrackFlow AuthContext] Token sync error:", tokErr);
        }
      } else {
        setUserProfile(null);
        setBackendUser(null);
        localStorage.removeItem("crackflow_id_token");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const selectPlan = async (planId: "starter" | "pro" | "lifetime"): Promise<PlanSelectResult> => {
    if (!user) {
      throw new Error("User must be authenticated to select a plan.");
    }

    const res = await createCheckout(planId);
    if (!res.success || !res.data) {
      const errMsg = res.error || "Failed to initialize checkout session. Please try again.";
      return {
        success: false,
        error: errMsg,
        message: errMsg,
      };
    }

    // 1. Razorpay Flow (Direct Modal)
    if ("provider" in res.data && res.data.provider === "razorpay") {
      const rzpData = res.data;
      return new Promise<PlanSelectResult>((resolve) => {
        const RazorpayClass = (window as any).Razorpay;
        if (!RazorpayClass) {
          const err = "Razorpay checkout SDK failed to load. Please refresh the page.";
          resolve({ success: false, error: err, message: err });
          return;
        }

        const options = {
          key: rzpData.keyId,
          amount: rzpData.amount,
          currency: rzpData.currency,
          name: "CrackFlow",
          description: rzpData.description,
          order_id: rzpData.orderId,
          prefill: {
            name: user.displayName || rzpData.user?.name || "",
            email: user.email || rzpData.user?.email || "",
          },
          theme: {
            color: "#6366f1",
          },
          handler: async (response: any) => {
            try {
              const verifyRes = await verifyRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId,
              });

              if (verifyRes.success) {
                await refreshProfile();
                window.location.href = "/?checkout=success";
                resolve({
                  success: true,
                  message: "Payment verified successfully!",
                });
              } else {
                const err = verifyRes.error || "Payment verification failed.";
                resolve({ success: false, error: err, message: err });
              }
            } catch (err: any) {
              resolve({
                success: false,
                error: err?.message || "Error verifying payment",
                message: err?.message || "Error verifying payment",
              });
            }
          },
          modal: {
            ondismiss: () => {
              resolve({
                success: false,
                error: "Checkout was cancelled by user.",
                message: "Payment cancelled.",
              });
            },
          },
        };

        const rzp = new RazorpayClass(options);
        rzp.open();
      });
    }

    // 2. Stripe Flow Fallback (Hosted Redirect)
    if ("checkoutUrl" in res.data && res.data.checkoutUrl) {
      window.location.href = res.data.checkoutUrl;
      return {
        success: true,
        checkoutUrl: res.data.checkoutUrl,
        message: "Redirecting to secure Checkout...",
      };
    }

    return {
      success: false,
      error: "Unexpected checkout response format.",
      message: "Unexpected checkout response format.",
    };
  };

  const hasActiveAccess = backendUser
    ? backendUser.hasActiveAccess
    : (userProfile?.subscriptionStatus === "active" || userProfile?.lifetime === true) &&
      ["starter", "pro", "lifetime"].includes(userProfile?.planTier || "");

  const value: AuthContextType = {
    user,
    userProfile,
    backendUser,
    hasActiveAccess,
    loading,
    isAuthenticated: !!user,
    login: signInWithEmail,
    signup: signUpWithEmail,
    loginWithGoogle: signInWithGoogle,
    logout: signOutUser,
    resetPassword: sendPasswordReset,
    refreshProfile,
    refreshBackend,
    selectPlan,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
