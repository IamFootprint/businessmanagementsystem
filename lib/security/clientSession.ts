"use client";

const SESSION_STORAGE_KEYS = [
  "cd_login_phone",
  "cd_signup_phone",
  "cd_partner_phone"
] as const;

export function clearClientSessionState() {
  try {
    for (const key of SESSION_STORAGE_KEYS) {
      window.sessionStorage.removeItem(key);
    }
  } catch {}

  try {
    window.localStorage.removeItem("bookingDraft");
  } catch {}

  window.dispatchEvent(new Event("cd-auth-changed"));
}
