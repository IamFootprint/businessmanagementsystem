"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { apiFetch, isApiClientError } from "@/lib/client/api";
import { clearClientSessionState } from "@/lib/security/clientSession";
import { DEFAULT_SESSION_POLICY, type SessionPolicy } from "@/lib/security/sessionPolicyShared";

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click"
];

const ACTIVITY_DEBOUNCE_MS = 250;
const TEST_SESSION_POLICY: SessionPolicy = {
  inactivityTimeoutMinutes: 1 / 6,
  inactivityCountdownSeconds: 5
} as SessionPolicy;

type UseInactivityLogoutResult = {
  countdownOpen: boolean;
  countdownSecondsLeft: number;
  staySignedIn: () => void;
  logoutNow: () => Promise<void>;
  policy: SessionPolicy;
};

export function useInactivityLogout(): UseInactivityLogoutResult {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [policy, setPolicy] = useState<SessionPolicy>(DEFAULT_SESSION_POLICY);
  const [countdownOpen, setCountdownOpen] = useState(false);
  const [countdownSecondsLeft, setCountdownSecondsLeft] = useState(DEFAULT_SESSION_POLICY.inactivityCountdownSeconds);
  const inactivityTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const logoutTimerRef = useRef<number | null>(null);
  const lastActivityRef = useRef(0);
  const policyRef = useRef<SessionPolicy>(DEFAULT_SESSION_POLICY);
  const loggingOutRef = useRef(false);

  const searchParamsKey = searchParams.toString();
  const isTestOverride = useMemo(() => {
    if (process.env.NODE_ENV === "production") return false;
    return process.env.NEXT_PUBLIC_INACTIVITY_TEST_MODE === "true" || searchParams.get("inactivityTest") === "1";
  }, [searchParams]);

  const clearTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (logoutTimerRef.current) {
      window.clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  const performLogout = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    clearTimers();
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "INACTIVITY_TIMEOUT" })
      });
    } catch {
      // Logout should still clear client state and redirect even if the request fails.
    } finally {
      clearClientSessionState();
      window.location.replace("/login?reason=timeout");
    }
  }, [clearTimers]);

  const startCountdown = useCallback(() => {
    clearTimers();
    const nextPolicy = policyRef.current;
    const countdownMs = nextPolicy.inactivityCountdownSeconds * 1000;
    const deadline = Date.now() + countdownMs;
    setCountdownOpen(true);
    setCountdownSecondsLeft(nextPolicy.inactivityCountdownSeconds);

    countdownIntervalRef.current = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setCountdownSecondsLeft(next);
    }, 250);

    logoutTimerRef.current = window.setTimeout(() => {
      void performLogout();
    }, countdownMs);
  }, [clearTimers, performLogout]);

  const resetTimer = useCallback(() => {
    clearTimers();
    const activePolicy = policyRef.current;
    setCountdownOpen(false);
    setCountdownSecondsLeft(activePolicy.inactivityCountdownSeconds);
    inactivityTimerRef.current = window.setTimeout(
      startCountdown,
      activePolicy.inactivityTimeoutMinutes * 60 * 1000
    );
  }, [clearTimers, startCountdown]);

  const registerActivity = useCallback(
    (force = false) => {
      if (loggingOutRef.current) return;
      const now = Date.now();
      if (!force && now - lastActivityRef.current < ACTIVITY_DEBOUNCE_MS) return;
      lastActivityRef.current = now;
      resetTimer();
    },
    [resetTimer]
  );

  const staySignedIn = useCallback(() => {
    registerActivity(true);
  }, [registerActivity]);

  useEffect(() => {
    let active = true;

    async function loadPolicy() {
      try {
        const data = await apiFetch<SessionPolicy>("/api/auth/session-policy");
        if (!active) return;
        const next = isTestOverride ? TEST_SESSION_POLICY : data;
        policyRef.current = next;
        setPolicy(next);
      } catch (error) {
        if (!active) return;
        if (isApiClientError(error) && error.status === 401) {
          return;
        }
        const next = isTestOverride ? TEST_SESSION_POLICY : DEFAULT_SESSION_POLICY;
        policyRef.current = next;
        setPolicy(next);
      }
    }

    void loadPolicy();

    const handlePolicyUpdated = () => {
      void loadPolicy();
    };

    window.addEventListener("cd-session-policy-updated", handlePolicyUpdated);
    return () => {
      active = false;
      window.removeEventListener("cd-session-policy-updated", handlePolicyUpdated);
    };
  }, [isTestOverride]);

  useEffect(() => {
    policyRef.current = isTestOverride ? TEST_SESSION_POLICY : policy;
    resetTimer();
    return () => clearTimers();
  }, [clearTimers, isTestOverride, policy, resetTimer]);

  useEffect(() => {
    const handler = () => registerActivity();
    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handler, { passive: true });
    }
    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handler);
      }
    };
  }, [registerActivity]);

  useEffect(() => {
    registerActivity(true);
  }, [pathname, registerActivity, searchParamsKey]);

  return {
    countdownOpen,
    countdownSecondsLeft,
    staySignedIn,
    logoutNow: performLogout,
    policy
  };
}
