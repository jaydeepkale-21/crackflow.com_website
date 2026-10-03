import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  updatePassword,
  linkWithCredential,
  linkWithPopup,
  GoogleAuthProvider,
  EmailAuthProvider,
  AuthCredential,
  User,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { ensureUserProfile, UserProfileData } from "./firestore";

export type { UserProfileData };

export interface SignUpResult {
  user: User;
  verificationSent: boolean;
}

export interface GoogleAuthResult {
  user: User;
}

/**
 * Format Firebase Auth errors into clear, user-friendly error messages.
 */
export function formatAuthError(error: any): string {
  const code = error?.code || "";
  const message = error?.message || "";

  if (code === "auth/email-already-in-use") {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
    return "Invalid email or password. Please check your credentials.";
  }
  if (code === "auth/weak-password") {
    return "Password is too weak. Please use at least 6 characters.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many requests. Please wait a moment and try again later.";
  }
  if (code === "auth/popup-closed-by-user") {
    return "Sign in popup was closed before completing Google authentication.";
  }
  if (code === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }
  if (code === "auth/account-exists-with-different-credential") {
    return "An account with this email already exists with a password. Please sign in with your password to connect your Google account.";
  }
  if (code === "auth/credential-already-in-use" || code === "auth/provider-already-linked") {
    return "This credential is already linked to another user account.";
  }
  if (code === "auth/requires-recent-login") {
    return "This action requires recent authentication. Please sign in again.";
  }

  return message || "An unexpected authentication error occurred. Please try again.";
}

/**
 * Get currently logged-in Firebase user.
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Get Firebase ID Token for current user.
 */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  return currentUser.getIdToken(forceRefresh);
}

/**
 * Sign up with email, password, and display name.
 * Automatically sends Firebase email verification.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<SignUpResult> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  if (displayName) {
    try {
      await updateProfile(user, { displayName });
    } catch (profErr) {
      console.warn("[CrackFlow Auth] Could not update profile displayName:", profErr);
    }
  }

  let verificationSent = false;
  try {
    await sendEmailVerification(user);
    verificationSent = true;
  } catch (err: any) {
    console.warn("[CrackFlow Auth] Could not send initial verification email:", err?.message || err);
  }

  // Ensure user profile in Firestore (keyed by user.uid)
  await ensureUserProfile(user);
  return { user, verificationSent };
}

/**
 * Sign in with email and password.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(userCredential.user);
  return userCredential.user;
}

/**
 * Sign in using Google Auth Popup.
 * Handles credential conflicts gracefully by extracting pending credentials.
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  try {
    const userCredential = await signInWithPopup(auth, googleProvider);
    await ensureUserProfile(userCredential.user);
    return { user: userCredential.user };
  } catch (error: any) {
    if (error?.code === "auth/account-exists-with-different-credential") {
      const pendingCredential = GoogleAuthProvider.credentialFromError(error);
      const email = error.customData?.email || error.email;
      const linkError: any = new Error("ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL");
      linkError.code = "auth/account-exists-with-different-credential";
      linkError.pendingCredential = pendingCredential;
      linkError.email = email;
      throw linkError;
    }
    throw error;
  }
}

/**
 * Links a pending Google credential to an existing email+password account
 * after the user successfully enters their password.
 */
export async function linkPendingCredential(
  email: string,
  password: string,
  pendingCredential: AuthCredential
): Promise<User> {
  // 1. Sign in with the existing password
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  // 2. Link the pending Google credential to the authenticated user
  const linkedCredential = await linkWithCredential(userCredential.user, pendingCredential);
  // 3. Ensure profile in Firestore remains intact under the same UID
  await ensureUserProfile(linkedCredential.user);
  return linkedCredential.user;
}

/**
 * Links Google to the currently signed-in user via popup.
 */
export async function linkGoogleAccount(): Promise<User> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("You must be signed in to link a Google account.");
  }
  const result = await linkWithPopup(user, googleProvider);
  await ensureUserProfile(result.user);
  return result.user;
}

/**
 * Adds a password login method to an existing Google user account.
 */
export async function addPasswordToAccount(password: string): Promise<User> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("No authenticated user with a valid email.");
  }
  const credential = EmailAuthProvider.credential(user.email, password);
  try {
    const result = await linkWithCredential(user, credential);
    return result.user;
  } catch (err: any) {
    if (err?.code === "auth/provider-already-linked" || err?.code === "auth/credential-already-in-use") {
      await updatePassword(user, password);
      return user;
    }
    throw err;
  }
}

/**
 * Sends a verification email to the current authenticated user.
 */
export async function sendVerificationEmail(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No authenticated user found.");
  }
  await sendEmailVerification(user);
  return true;
}

/**
 * Reloads the current Firebase user and checks if their email has been verified.
 */
export async function reloadAndCheckVerification(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  await user.reload();
  return Boolean(auth.currentUser?.emailVerified);
}

/**
 * Sign out current Firebase user.
 */
export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Send password reset email.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

