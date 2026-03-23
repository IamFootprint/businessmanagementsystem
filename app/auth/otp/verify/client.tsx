"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/otp-input";
import { getRoleHomePath } from "@/src/lib/auth/roleRouting";
type OtpVerifyClientProps = {
  returnTo: string;
};

export default function OtpVerifyClient({ returnTo }: OtpVerifyClientProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const phone =
        typeof window !== "undefined" ? window.sessionStorage.getItem("cd_login_phone") || "" : "";
      if (!phone) {
        setError("Invalid OTP");
        return;
      }
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: code.replace(/\D/g, "") }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setError(payload?.error?.message || "Invalid OTP");
      } else {
        const payload = await res.json().catch(() => ({}));
        const whoamiRes = await fetch("/api/auth/whoami", { cache: "no-store", credentials: "include" });
        const whoami = await whoamiRes.json().catch(() => ({}));
        const role = whoami?.profile?.role || payload?.profile?.role;
        const target = getRoleHomePath(role, {
          phone: whoami?.profile?.phone || payload?.profile?.phone,
          name: whoami?.profile?.name || payload?.profile?.name,
          shopId: whoami?.profile?.shopId || payload?.profile?.shopId,
          profileStatus: whoami?.profile?.status || payload?.profile?.status,
          onboardingStatus: whoami?.profile?.onboardingStatus || payload?.profile?.onboardingStatus,
          shopStatus: whoami?.profile?.shopStatus || payload?.profile?.shopStatus
        });
        setVerified(true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("cd-auth-changed"));
        }
        setTimeout(() => {
          if (returnTo && returnTo.startsWith(target)) {
            router.push(returnTo);
          } else {
            router.push(target);
          }
        }, 800);
      }
    } catch {
      setError("Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6">
        <h1 className="font-display font-bold text-foreground text-lg mb-1">Enter your code</h1>
        <p className="text-sm text-muted-foreground mb-4">We sent a 6-digit code to your phone.</p>
        <form onSubmit={onSubmit}>
          <OtpInput value={code} onChange={setCode} length={6} autoFocus disabled={verified} />
          {error ? <p className="text-sm text-destructive mt-2">{error}</p> : null}
          {verified ? <p className="text-sm text-green-600 mt-2 font-medium">Code verified — signing you in...</p> : null}
          <div className="mt-4">
            <Button
              disabled={loading || code.length < 6 || verified}
              className={verified ? "bg-green-600 hover:bg-green-600 text-white" : ""}
            >
              {verified ? "Verified \u2713" : loading ? "Verifying..." : "Verify"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
