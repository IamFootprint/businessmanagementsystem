"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { getRoleHomePath } from "@/src/lib/auth/roleRouting";
import Link from "next/link";
import OtpSuccessState from "@/app/components/OtpSuccessState";

function LoginOtpPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("returnTo") || "";
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ name: string | null; redirect: string } | null>(null);
  const submittingRef = useRef(false);

  const verify = useCallback(async (code: string) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setLoading(true);
    try {
      const phone =
        typeof window !== "undefined" ? window.sessionStorage.getItem("cd_login_phone") || "" : "";
      if (!phone) {
        setError("Your session expired. Please go back and enter your phone number again.");
        return;
      }
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: code.replace(/\D/g, ""), intent: "LOGIN" })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error?.message || "That code didn't work. Check the code and try again.");
        return;
      }
      const whoamiRes = await fetch("/api/auth/whoami", { cache: "no-store", credentials: "include" });
      const whoami = await whoamiRes.json().catch(() => ({}));
      const role = whoami?.profile?.role || payload?.profile?.role;
      const target = payload?.redirect || getRoleHomePath(role, {
        phone: whoami?.profile?.phone || payload?.profile?.phone,
        name: whoami?.profile?.name || payload?.profile?.name,
        shopId: whoami?.profile?.shopId || payload?.profile?.shopId,
        profileStatus: whoami?.profile?.status || payload?.profile?.status,
        onboardingStatus: whoami?.profile?.onboardingStatus || payload?.profile?.onboardingStatus,
        shopStatus: whoami?.profile?.shopStatus || payload?.profile?.shopStatus
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cd-auth-changed"));
      }
      const finalTarget = (returnTo && returnTo.startsWith(target)) ? returnTo : target;
      setSuccessData({
        name: whoami?.profile?.name || payload?.profile?.name || null,
        redirect: finalTarget,
      });
    } catch {
      setError("Connection failed. Check your internet and try again.");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }, [returnTo]);

  const handleSkip = useCallback(() => {
    if (successData) router.push(successData.redirect);
  }, [successData, router]);

  function handleOtpChange(val: string) {
    setOtp(val);
    if (val.replace(/\D/g, "").length === 6) {
      verify(val);
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    verify(otp);
  }

  if (successData) {
    return (
      <div style={{ display: "flex", minHeight: "100dvh", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <div className="bg-card" style={{ width: "100%", maxWidth: "24rem", padding: "1.5rem", borderRadius: "0.75rem", border: "1px solid var(--border)" }}>
          <OtpSuccessState name={successData.name} destination={successData.redirect} intent="login" onSkip={handleSkip} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-xl border border-border p-6 shadow-sm">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>

        <img src="/cycledesk-logo.png" alt="CycleDesk" className="h-8 mb-6 mx-auto block" />
        <h1 className="text-2xl font-display font-bold text-foreground text-center">
          Verify your number
        </h1>
        <p className="text-sm text-muted-foreground text-center mt-1 mb-6">
          Enter the 6-digit code sent to your phone.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={handleOtpChange} autoFocus>
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
          {error ? <p className="text-sm text-destructive text-center">{error}</p> : null}
          <Button className="w-full" size="lg" disabled={loading || otp.length < 6}>
            {loading ? "Verifying..." : "Verify & Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
            <Skeleton className="h-8 w-32 mx-auto" />
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-10 w-60 mx-auto" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      }
    >
      <LoginOtpPageContent />
    </Suspense>
  );
}
