/**
 * Resume Storage Service for CrackFlow
 * Manages persistent storage of resume files (IndexedDB + localStorage fallback)
 * Enables viewing, downloading, deleting, and session state persistence.
 */

export interface StoredResumeInfo {
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  dataUrl?: string;
}

const STORAGE_KEY = "crackflow_user_resume";
const DB_NAME = "crackflow_db";
const STORE_NAME = "resumes";
const RESUME_ID = "active_user_resume";

// In-memory fallback if IndexedDB is blocked or in mock environments
let memoryFallback: StoredResumeInfo | null = null;

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return resolve(null);
    }
    try {
      const request = window.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Saves a file to persistent storage (IndexedDB + localStorage metadata).
 */
export async function saveStoredResume(file: File): Promise<StoredResumeInfo> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const info: StoredResumeInfo = {
    name: file.name,
    size: file.size,
    type: extension?.toUpperCase() || "PDF",
    uploadedAt: new Date().toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  };

  // Convert to Base64 data URL for viewing/previewing
  let dataUrl = "";
  try {
    dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  } catch {
    // If FileReader fails, continue with metadata
  }

  if (dataUrl) {
    info.dataUrl = dataUrl;
  }

  // 1. Save metadata to localStorage (so it's synchronously available on mount)
  try {
    const meta = {
      name: info.name,
      size: info.size,
      type: info.type,
      uploadedAt: info.uploadedAt,
      // Store dataUrl if reasonably sized (< 2 MB)
      ...(dataUrl && dataUrl.length < 2 * 1024 * 1024 ? { dataUrl } : {}),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
  } catch (err) {
    console.warn("[ResumeStorage] Could not write resume meta to localStorage:", err);
  }

  // 2. Save full payload to IndexedDB
  try {
    const db = await openDB();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.put({ ...info, fileBlob: file }, RESUME_ID);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  } catch (err) {
    console.warn("[ResumeStorage] Could not save resume to IndexedDB:", err);
  }

  memoryFallback = info;
  return info;
}

/**
 * Retrieves the stored resume, checking IndexedDB and localStorage.
 */
export async function getStoredResume(): Promise<StoredResumeInfo | null> {
  // 1. Check IndexedDB first for full dataUrl
  try {
    const db = await openDB();
    if (db) {
      const dbEntry = await new Promise<any>((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(RESUME_ID);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      if (dbEntry && dbEntry.name) {
        return {
          name: dbEntry.name,
          size: dbEntry.size,
          type: dbEntry.type,
          uploadedAt: dbEntry.uploadedAt,
          dataUrl: dbEntry.dataUrl,
        };
      }
    }
  } catch {}

  // 2. Fallback to localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}

  // 3. Fallback to memory
  if (memoryFallback) {
    return memoryFallback;
  }

  return null;
}

/**
 * Deletes the stored resume from IndexedDB, localStorage, and memory.
 */
export async function deleteStoredResume(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}

  try {
    const db = await openDB();
    if (db) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.delete(RESUME_ID);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  } catch {}

  memoryFallback = null;
}
