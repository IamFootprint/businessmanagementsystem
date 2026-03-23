import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/revamp/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/revamp/components/ui/input-otp";
import logo from "@/revamp/assets/cycledesk-logo.png";
import { getRoleHomePath } from "@/src/lib/auth/roleRouting";
import { PhoneField } from "@/revamp/components/PhoneField";
import { normalizePhone, validateE164 } from "@/lib/auth/phone";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "";
  const prefixedPhone = searchParams.get("phone") || "";
  const notice = searchParams.get("message");
  const reason = searchParams.get("reason");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const checkingSessionRef = useRef(false);
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (prefixedPhone) setPhone(normalizePhone(prefixedPhone));
  }, [prefixedPhone]);

  useEffect(() => {
    async function checkSession() {
      if (checkingSessionRef.current) return;
      checkingSessionRef.current = true;
      try {
        const whoamiRes = await fetch("/api/auth/whoami", { cache: "no-store", credentials: "include" });
        if (!whoamiRes.ok) return;
        const whoami = await whoamiRes.json().catch(() => ({}));
        const profile = whoami?.profile;
        if (!profile) return;
        const target = getRoleHomePath(profile.role, {
          phone: profile.phone,
          name: profile.name,
          shopId: profile.shopId,
          profileStatus: profile.status,
          onboardingStatus: profile.onboardingStatus,
          shopStatus: profile.shopStatus
        });
        navigate(target, { replace: true });
      } finally {
        checkingSessionRef.current = false;
      }
    }
    void checkSession();
  }, [navigate]);

  const handleSendOtp = async () => {
    if (!validateE164(phone)) return;
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, intent: "LOGIN" })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error?.message || "Unable to request verification code.");
        return;
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("cd_login_phone", phone);
      }
      setInfo(payload?.message || "Verification code sent.");
      setOtp("");
      setStep("otp");
    } catch {
      setError("Unable to request verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = useCallback(async (codeInput?: string) => {
    const code = (codeInput || otp).replace(/\D/g, "");
    if (code.length < 6 || verifyingRef.current) return;
    verifyingRef.current = true;
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const phoneFromSession =
        typeof window !== "undefined" ? window.sessionStorage.getItem("cd_login_phone") || phone : phone;

      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneFromSession,
          otp: code,
          intent: "LOGIN"
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error?.message || "Invalid OTP");
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

      if (returnTo && returnTo.startsWith(target)) {
        navigate(returnTo, { replace: true });
      } else {
        navigate(target, { replace: true });
      }
    } catch {
      setError("Invalid OTP");
    } finally {
      setLoading(false);
      verifyingRef.current = false;
    }
  }, [navigate, otp, phone, returnTo]);

  const phoneValid = validateE164(phone);
  const cleanedOtp = otp.replace(/\D/g, "");
  const otpReady = cleanedOtp.length === 6;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="panel-padded">
          {step === "otp" && (
            <button
              onClick={() => setStep("phone")}
              className="mb-4 p-1 -ml-1 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
          )}
          
          <div className="flex items-center gap-3 mb-6">
            <img src={logo.src} alt="CycleDesk" className="h-8" />
          </div>

          {step === "phone" ? (
            <>
              <h1 className="text-2xl font-display font-bold text-foreground mb-2">Welcome to CycleDesk</h1>
              <p className="text-sm text-muted-foreground mb-6">Enter your phone number to get started.</p>
              {reason === "timeout" ? (
                <p className="text-xs text-muted-foreground mb-3">You were logged out due to inactivity.</p>
              ) : null}
              {notice === "account-exists" ? (
                <p className="text-xs text-muted-foreground mb-3">Account exists, please log in.</p>
              ) : null}
              <div className="space-y-4">
                <PhoneField
                  label="Phone Number"
                  value={phone}
                  onChange={setPhone}
                  helperText="Use your country code. Example: +27..."
                  disabled={loading}
                />
                <Button className="w-full" size="lg" onClick={handleSendOtp} disabled={!phoneValid || loading}>
                  {loading ? "Sending..." : "Send Verification Code"}
                </Button>
                {error ? <p className="text-xs text-red-600">{error}</p> : null}
                {info ? <p className="text-xs text-muted-foreground">{info}</p> : null}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-display font-bold text-foreground mb-2">Verify your number</h1>
              <p className="text-sm text-muted-foreground mb-6">
                We sent a 6-digit code to <span className="font-semibold text-foreground">{phone}</span>
              </p>
              <div className="flex justify-center mb-6">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  onComplete={(value) => {
                    if (step === "otp") {
                      void handleVerifyOtp(value);
                    }
                  }}
                >
                  <InputOTPGroup>
                    {[0,1,2,3,4,5].map(i => (
                      <InputOTPSlot key={i} index={i} className="w-11 h-12 text-lg" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <button
                className="text-sm text-primary font-semibold text-center w-full mb-4"
                onClick={handleSendOtp}
                type="button"
              >
                Resend code
              </button>
              <Button className="w-full" size="lg" onClick={() => void handleVerifyOtp(cleanedOtp)} disabled={!otpReady || loading}>
                {loading ? "Verifying..." : "Verify & Continue"}
              </Button>
              {error ? <p className="text-xs text-red-600 mt-3">{error}</p> : null}
              {info ? <p className="text-xs text-muted-foreground mt-3">{info}</p> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
