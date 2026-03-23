/**
 * Safe sessionStorage wrapper for cross-origin iframe contexts.
 *
 * When the booking widget is embedded in a third-party iframe,
 * browsers may block sessionStorage access (third-party cookie
 * restrictions in Safari, Chrome partitioned storage, etc.).
 *
 * This module falls back to an in-memory Map so the booking flow
 * continues to work even when sessionStorage throws SecurityError.
 */

const memoryFallback = new Map<string, string>();
let storageAvailable: boolean | null = null;

function isSessionStorageAvailable(): boolean {
  if (storageAvailable !== null) return storageAvailable;
  try {
    const testKey = "__cd_storage_test__";
    sessionStorage.setItem(testKey, "1");
    sessionStorage.removeItem(testKey);
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  return storageAvailable;
}

export function safeGetItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  if (isSessionStorageAvailable()) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      // fall through to memory
    }
  }
  return memoryFallback.get(key) ?? null;
}

export function safeSetItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  if (isSessionStorageAvailable()) {
    try {
      sessionStorage.setItem(key, value);
      return;
    } catch {
      // fall through to memory
    }
  }
  memoryFallback.set(key, value);
}

export function safeRemoveItem(key: string): void {
  if (typeof window === "undefined") return;
  if (isSessionStorageAvailable()) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
  memoryFallback.delete(key);
}
