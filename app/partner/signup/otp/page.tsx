"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import OtpSuccessState from "@/app/components/OtpSuccessState";

export default function PartnerSignupOtpPage() {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ name: string | null; redirect: string } | null>(null);
  const submittingRef = useRef(false);

  const verify = useCallback(
    async (code: string) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const phone =
          typeof window !== "undefined"
            ? window.sessionStorage.getItem("cd_partner_phone") || ""
            : "";
        if (!phone) {
          setError("Phone number not found. Please go back and try again.");
          return;
        }
        const res = await fetch("/api/auth/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone,
            otp: code.replace(/\D/g, ""),
            intent: "SHOP_SIGNUP"
          })
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (payload?.error?.code === "ACCOUNT_EXISTS") {
            router.push(
              `/login?message=account-exists&phone=${encodeURIComponent(phone)}`
            );
            return;
          }
          setError(payload?.error?.message || "Invalid code. Please try again.");
          return;
        }
        const whoamiRes = await fetch("/api/auth/whoami", {
          cache: "no-store",
          credentials: "include"
        });
        const whoami = await whoamiRes.json().catch(() => ({}));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("cd-auth-changed"));
        }
        const target =
          payload?.redirect ||
          (whoami?.profile?.onboardingStatus === "SHOP_PENDING_APPROVAL"
            ? "/partner/pending"
            : "/partner/onboarding");
        setSuccessData({
          name: whoami?.profile?.name || payload?.profile?.name || null,
          redirect: target,
        });
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
        submittingRef.current = false;
      }
    },
    []
  );

  const handleSkip = useCallback(() => {
    if (successData) router.push(successData.redirect);
  }, [successData, router]);

  function handleOtpChange(val: string) {
    setOtp(val);
    if (val.replace(/\D/g, "").length === 6) {
      void verify(val);
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    void verify(otp);
  }

  if (successData) {
    return (
      <div style={{ display: "flex", minHeight: "100dvh", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <div className="bg-card" style={{ width: "100%", maxWidth: "24rem", padding: "1.5rem", borderRadius: "0.75rem", border: "1px solid var(--border)" }}>
          <OtpSuccessState name={successData.name} destination={successData.redirect} intent="partner" onSkip={handleSkip} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <Link
            href="/partner/signup"
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
            Verify your code
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-1 mb-6">
            Enter the 6-digit code sent to your phone.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={handleOtpChange}
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {error ? (
              <p className="text-sm text-destructive text-center">{error}</p>
            ) : null}
            <Button
              className="w-full"
              size="lg"
              disabled={loading || otp.length < 6}
            >
              {loading ? "Verifying..." : "Verify & continue"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
