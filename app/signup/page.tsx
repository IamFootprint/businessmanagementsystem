"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import PhoneInput from "@/app/components/PhoneInput";
import Link from "next/link";

export default function ClientSignupPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, intent: "CLIENT_SIGNUP" })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error?.message || "Invalid OTP");
        return;
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("cd_signup_phone", phone);
      }
      router.push("/signup/otp");
    } catch {
      setError("Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-xl border border-border p-6 shadow-sm">
        <img src="/cycledesk-logo.png" alt="CycleDesk" className="h-8 mb-6 mx-auto block" />
        <h1 className="text-2xl font-display font-bold text-foreground text-center">Create your account</h1>
        <p className="text-sm text-muted-foreground text-center mt-1 mb-6">
          Enter your phone number to begin registration.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <PhoneInput label="Phone number" value={phone} onChange={setPhone} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" size="lg" disabled={loading}>
            {loading ? "Sending..." : "Request OTP"}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Already registered?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Login instead
          </Link>
        </p>
      </div>
    </div>
  );
}
