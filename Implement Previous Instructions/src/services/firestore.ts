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

  try {
    await setDoc(userRef, initialProfile);
    return initialProfile;
  } catch (err) {
    // If concurrent creation won the race, fetch and return the created document
    const snap = await getDoc(userRef).catch(() => null);
    if (snap && snap.exists()) {
      return snap.data() as UserProfileData;
    }
    throw err;
  }
}

const inFlightEnsures = new Map<string, Promise<UserProfileData>>();

/**
 * Ensures user profile exists in Firestore. If missing, creates it safely.
 * Includes in-flight deduplication to prevent concurrent login race conditions.
 */
export async function ensureUserProfile(user: User): Promise<UserProfileData> {
  const existing = inFlightEnsures.get(user.uid);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        return snap.data() as UserProfileData;
      }

      return await createUserProfile(user);
    } finally {
      inFlightEnsures.delete(user.uid);
    }
  })();

  inFlightEnsures.set(user.uid, promise);
  return promise;
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
