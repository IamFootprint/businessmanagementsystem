"use client";

import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <section className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h1 className="font-display font-bold text-foreground text-lg mb-2">
          This page ran into a problem
        </h1>
        <p className="text-sm text-muted-foreground mb-1">
          The page could not load correctly. This is usually temporary.
        </p>
        <p className="text-xs text-muted-foreground mb-5">
          Try the button below. If it keeps happening, clear your browser cache or contact support at{" "}
          <a href="mailto:support@cycledesk.co.za" className="text-primary hover:underline">
            support@cycledesk.co.za
          </a>
        </p>
        {error.digest && (
          <p className="text-[10px] text-muted-foreground/50 mb-4 font-mono">
            Ref: {error.digest}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <button
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            onClick={reset}
            type="button"
          >
            Reload this page
          </button>
          <a
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
            href="/"
          >
            Go to home page
          </a>
        </div>
      </section>
    </main>
  );
}
