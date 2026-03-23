"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import PhoneInput from "@/app/components/PhoneInput";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PartnerSignupPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, intent: "SHOP_SIGNUP" })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error?.message || "Something went wrong. Please try again.");
        return;
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("cd_partner_phone", phone);
      }
      router.push("/partner/signup/otp");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <Link
            href="/partner"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>

          <img
            src="/cycledesk-logo.png"
            alt="CycleDesk"
            className="h-8 mb-6 mx-auto block"
          />
          <h1 className="text-2xl font-display font-bold text-foreground text-center">
            Verify your phone
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-1 mb-6">
            We&apos;ll send a one-time code to confirm your number.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <PhoneInput label="Phone number" value={phone} onChange={setPhone} />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" size="lg" disabled={loading}>
              {loading ? "Sending..." : "Send verification code"}
            </Button>
          </form>
        </div>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary hover:underline font-medium"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
