"use client";

import { useEffect, useState } from "react";
import { clearClientSessionState } from "@/lib/security/clientSession";

export default function LogoutPage() {
  const [message, setMessage] = useState("Signing you out...");
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    let redirected = false;
    const forceRedirect = () => {
      if (redirected) return;
      redirected = true;
      window.location.replace("/login");
    };

    async function logout() {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 2500);
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          signal: controller.signal
        });
      } catch {
        setMessage("Sign-out request took too long. Redirecting...");
      } finally {
        window.clearTimeout(timeout);
      }

      clearClientSessionState();

      forceRedirect();
    }

    const fallback = window.setTimeout(() => {
      if (!redirected) {
        setShowManual(true);
        setMessage("Redirect is taking longer than expected.");
      }
    }, 3500);

    logout();
    return () => window.clearTimeout(fallback);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center">
        <h1 className="font-display font-bold text-foreground text-lg mb-2">Logging out</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        {showManual ? (
          <a className="inline-block mt-4 text-sm font-medium text-primary hover:underline" href="/login">
            Continue to login
          </a>
        ) : null}
      </div>
    </div>
  );
}
