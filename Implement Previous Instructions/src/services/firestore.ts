import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "./firebase";

export interface UserProfileData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  planTier: "none" | "starter" | "pro" | "lifetime";
  subscriptionStatus: "none" | "active" | "canceled" | "past_due" | "expired";
  paymentProvider: "dummy" | "stripe" | "razorpay" | "none";
  customerId: string | null;
  subscriptionId: string | null;
  lifetime: boolean;
  currentPeriodStart?: any;
  currentPeriodEnd?: any;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Creates initial user profile document in Firestore (`users/{uid}`).
 */
export async function createUserProfile(user: User): Promise<UserProfileData> {
  const userRef = doc(db, "users", user.uid);
  const initialProfile: UserProfileData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split("@")[0] || "User",
    photoURL: user.photoURL || null,
    planTier: "none",
    subscriptionStatus: "none",
    paymentProvider: "dummy",
    customerId: null,
    subscriptionId: null,
    lifetime: false,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(userRef, initialProfile);
  return initialProfile;
}

/**
 * Ensures user profile exists in Firestore. If missing, creates it safely.
 */
export async function ensureUserProfile(user: User): Promise<UserProfileData> {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    return snap.data() as UserProfileData;
  }

  return createUserProfile(user);
}

/**
 * Fetches user profile document from Firestore (`users/{uid}`).
 */
export async function getUserProfile(uid: string): Promise<UserProfileData | null> {
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfileData;
    }
    return null;
  } catch (error) {
    console.warn("[CrackFlow Firestore] Failed to fetch user profile:", error);
    return null;
  }
}

/**
 * Updates specific fields in user profile document.
 */
export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfileData>
): Promise<void> {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
