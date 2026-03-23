"use client";

import { useEffect, useRef } from "react";
import "./otp-success.css";

interface OtpSuccessStateProps {
  name: string | null;
  destination: string;
  intent: "login" | "signup" | "partner";
  onSkip: () => void;
}

const REDIRECT_DELAY = 1500;

const MESSAGES: Record<string, string> = {
  login: "Welcome back",
  signup: "Account created",
  partner: "Registration verified",
};

const DESTINATIONS: Record<string, string> = {
  "/admin": "Admin Dashboard",
  "/mech/today": "Today's Jobs",
  "/app": "Your Dashboard",
  "/partner/onboarding": "Shop Setup",
  "/partner/pending": "Approval Status",
  "/signup/complete": "Complete Profile",
};

function friendlyDestination(path: string): string {
  for (const [prefix, label] of Object.entries(DESTINATIONS)) {
    if (path.startsWith(prefix)) return label;
  }
  return "your dashboard";
}

export default function OtpSuccessState({ name, destination, intent, onSkip }: OtpSuccessStateProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(onSkip, REDIRECT_DELAY);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [onSkip]);

  const message = MESSAGES[intent] || "Verified";
  const displayName = name || "";
  const dest = friendlyDestination(destination);

  return (
    <button type="button" className="otp-success-container" onClick={onSkip} aria-label="Skip to dashboard">
      <div className="otp-success-check" aria-hidden="true">
        <svg viewBox="0 0 52 52" className="otp-success-svg">
          <circle className="otp-success-circle" cx="26" cy="26" r="25" fill="none" />
          <path className="otp-success-path" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
        </svg>
      </div>
      <p className="otp-success-title">{message}{displayName ? `, ${displayName}` : ""}</p>
      <p className="otp-success-subtitle">Redirecting to {dest}…</p>
      <div className="otp-success-progress"><div className="otp-success-progress-bar" /></div>
    </button>
  );
}
