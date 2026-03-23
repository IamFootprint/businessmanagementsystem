"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/app/components/PhoneInput";
import { validateE164 } from "@/lib/auth/phone";
type OtpRequestClientProps = {
  returnTo: string;
};

export default function OtpRequestClient({ returnTo }: OtpRequestClientProps) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validateE164(phone)) {
      setError("Enter a valid phone number with country code.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        setError("We could not process that number. Try again.");
      } else {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("cd_login_phone", phone);
        }
        const encodedReturn = encodeURIComponent(returnTo);
        router.push(`/auth/otp/verify?returnTo=${encodedReturn}`);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6">
        <h1 className="font-display font-bold text-foreground text-lg mb-1">Sign in with OTP</h1>
        <p className="text-sm text-muted-foreground mb-4">Enter your phone number to receive a one-time code.</p>
        <form onSubmit={onSubmit}>
          <PhoneInput
            label="Phone number"
            value={phone}
            onChange={setPhone}
            helperText="We will text your one-time code to this number."
            error={error}
          />
          {error ? <p className="text-sm text-destructive mt-2">{error}</p> : null}
          <div className="mt-4">
            <Button disabled={loading}>{loading ? "Sending..." : "Send code"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
