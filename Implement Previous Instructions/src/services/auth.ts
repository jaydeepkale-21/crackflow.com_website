import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  User,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { ensureUserProfile, UserProfileData } from "./firestore";

export type { UserProfileData };

/**
 * Format Firebase Auth errors into clear, user-friendly error messages.
 */
export function formatAuthError(error: any): string {
  const code = error?.code || "";
  const message = error?.message || "";

  if (code === "auth/email-already-in-use") {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
    return "Invalid email or password. Please check your credentials.";
  }
  if (code === "auth/weak-password") {
    return "Password is too weak. Please use at least 6 characters.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many failed attempts. Please wait a moment and try again later.";
  }
  if (code === "auth/popup-closed-by-user") {
    return "Sign in popup was closed before completing Google authentication.";
  }
  if (code === "auth/invalid-email") {
    return "Please enter a valid email address.";
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
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  if (displayName) {
    await updateProfile(user, { displayName });
  }

  await ensureUserProfile(user);
  return user;
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
 */
export async function signInWithGoogle(): Promise<User> {
  const userCredential = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(userCredential.user);
  return userCredential.user;
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
