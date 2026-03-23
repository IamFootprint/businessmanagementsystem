"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
type InactivityTimeoutModalProps = {
  open: boolean;
  secondsLeft: number;
  onStaySignedIn: () => void;
  onLogoutNow: () => void;
};

function getFocusable(container: HTMLElement | null) {
  if (!container) return [] as HTMLElement[];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute("disabled"));
}

export default function InactivityTimeoutModal({
  open,
  secondsLeft,
  onStaySignedIn,
  onLogoutNow
}: InactivityTimeoutModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const focusable = getFocusable(dialogRef.current);
    focusable[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onStaySignedIn();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable(dialogRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onStaySignedIn, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="presentation">
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-timeout-title"
        aria-describedby="session-timeout-description"
      >
        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">Security</span>
        <h2 id="session-timeout-title" className="font-display font-bold text-foreground text-lg mb-2">Session expiring</h2>
        <p id="session-timeout-description" className="text-sm text-muted-foreground">
          You&apos;ll be logged out in <strong>{secondsLeft}s</strong> due to inactivity.
        </p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button onClick={onStaySignedIn}>
            Stay signed in
          </Button>
          <Button variant="outline" onClick={onLogoutNow}>
            Log out now
          </Button>
        </div>
      </div>
    </div>
  );
}
