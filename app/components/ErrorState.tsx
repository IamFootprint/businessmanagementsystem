"use client";

import { Button } from "@/components/ui/button";

export default function ErrorState({
  title,
  message,
  hint,
  retryLabel = "Try again",
  onRetry,
  busy = false,
  showSupport = true
}: {
  title: string;
  message: string;
  hint?: string;
  retryLabel?: string;
  onRetry?: () => void;
  busy?: boolean;
  showSupport?: boolean;
}) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 mt-3">
      <h3 className="font-semibold text-foreground text-sm mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{message}</p>
      {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
      <div className="flex items-center gap-2 mt-3">
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry} disabled={busy}>
            {busy ? "Retrying..." : retryLabel}
          </Button>
        ) : null}
      </div>
      {showSupport ? (
        <p className="text-[11px] text-muted-foreground/70 mt-3">
          Still not working?{" "}
          <a href="mailto:support@cycledesk.co.za" className="text-primary hover:underline">
            Contact support
          </a>{" "}
          and we&apos;ll help you out.
        </p>
      ) : null}
    </div>
  );
}
