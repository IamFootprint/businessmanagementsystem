"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PhoneInput from "@/app/components/PhoneInput";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

function LoginPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("returnTo") || "";
  const prefixedPhone = params.get("phone") || "";
  const notice = params.get("message");
  const reason = params.get("reason");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prefixedPhone) {
      setPhone(prefixedPhone);
    }
  }, [prefixedPhone]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error?.message || "We couldn't send a verification code. Please check your number and try again.");
        return;
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("cd_login_phone", phone);
      }
      const next = returnTo ? `/login/otp?returnTo=${encodeURIComponent(returnTo)}` : "/login/otp";
      router.push(next);
    } catch {
      setError("Connection failed. Check your internet and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-xl border border-border p-6 shadow-sm">
        <img src="/cycledesk-logo.png" alt="CycleDesk" className="h-8 mb-6 mx-auto block" />
        <h1 className="text-2xl font-display font-bold text-foreground text-center">Welcome back</h1>
        <p className="text-sm text-muted-foreground text-center mt-1 mb-6">
          Enter your phone number to sign in.
        </p>

        {reason === "timeout" ? (
          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg mb-4">
            You were logged out due to inactivity.
          </p>
        ) : null}
        {notice === "account-exists" ? (
          <p className="text-sm text-accent-foreground bg-accent/10 p-3 rounded-lg mb-4">
            Account exists, please log in.
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <PhoneInput label="Phone number" value={phone} onChange={setPhone} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" size="lg" disabled={loading}>
            {loading ? "Sending..." : "Continue"}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-6">
          New here?{" "}
          <Link href="/start" className="text-primary hover:underline font-medium">
            Choose a signup path
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
            <Skeleton className="h-8 w-32 mx-auto" />
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
