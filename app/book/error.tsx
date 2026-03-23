"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function BookingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[book] Unhandled error:", error);
  }, [error]);

  return (
    <Container>
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-card rounded-xl border border-border p-6 max-w-md w-full text-center">
          <h1 className="font-display font-bold text-foreground text-lg mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground mb-1">
            The booking page ran into a problem. This is usually temporary.
          </p>
          {error.digest ? (
            <p className="text-xs text-muted-foreground/70 mb-4">
              Ref: {error.digest}
            </p>
          ) : null}
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={reset}>
              Try again
            </Button>
            <a href="/book/start">
              <Button>Restart booking</Button>
            </a>
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-4">
            Still not working?{" "}
            <a
              href="mailto:support@cycledesk.co.za"
              className="text-primary hover:underline"
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </Container>
  );
}
