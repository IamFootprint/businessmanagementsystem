"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import PublicHeroBanner from "@/app/components/PublicHeroBanner";
const inputClass = "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function RegisterPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get("phone") || "";
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name: name.trim() }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error?.message || "Registration failed. Please try again.");
        return;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cd-auth-changed"));
      }
      router.push(payload?.redirect || "/app");
    } catch {
      setError("Unable to register. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!phone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <PublicHeroBanner
            eyebrow="New Account"
            title="Create your CycleDesk account"
            description="Start with your phone number to continue."
          />
          <div className="rounded-xl border border-border bg-card p-6 mt-4">
            <h1 className="font-display font-bold text-foreground text-lg mb-2">Registration</h1>
            <p className="text-sm text-foreground mb-4">No phone number provided. Please start from the login page.</p>
            <a href="/login"><Button>Go to Login</Button></a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <PublicHeroBanner
          eyebrow="New Account"
          title="Create your CycleDesk account"
          description="Just your name and you're in."
        />
        <div className="rounded-xl border border-border bg-card p-6 mt-4">
          <h1 className="font-display font-bold text-foreground text-lg mb-2">Register</h1>
          <p className="text-sm text-foreground mb-4">Phone: <strong>{phone}</strong></p>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Smith"
                autoFocus
                className={inputClass}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button disabled={loading}>{loading ? "Creating account..." : "Create Account"}</Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Already have an account? <a href="/login" className="text-primary hover:underline font-medium">Login instead</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background p-4"><div className="rounded-xl border border-border bg-card p-6"><p className="text-sm text-muted-foreground">Loading...</p></div></div>}>
      <RegisterPageContent />
    </Suspense>
  );
}
