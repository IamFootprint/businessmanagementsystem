"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PartnerOnboardingPage() {
  const router = useRouter();

  const [shopName, setShopName] = useState("");
  const [city, setCity] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function guard() {
      try {
        const res = await fetch("/api/auth/whoami");
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.authenticated) {
          router.replace("/partner/signup");
          return;
        }
        if (payload?.profile?.onboardingStatus === "COMPLETE" || payload?.profile?.onboardingStatus === "SHOP_ACTIVE") {
          router.replace("/admin");
          return;
        }
      } catch {
        router.replace("/partner/signup");
      }
    }
    void guard();
  }, [router]);

  const canSubmit = shopName.trim().length >= 2 && city.trim().length >= 2 && whatsappNumber.trim().length >= 10;

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/partner/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopName, city, whatsappNumber }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error?.message || "Unable to submit. Please try again.");
        return;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cd-auth-changed"));
      }
      window.location.href = payload?.redirect || "/admin";
    } catch {
      setError("Unable to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm">
          <img
            src="/cycledesk-logo.png"
            alt="CycleDesk"
            className="h-8 mb-6 mx-auto block"
          />
          <h1 className="text-2xl font-display font-bold text-foreground text-center">
            Set up your shop
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-1 mb-6">
            Just three details and you are live.
          </p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="shopName">Shop name</Label>
              <Input
                id="shopName"
                placeholder="e.g. Joburg Bike Works"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="e.g. Johannesburg"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp">WhatsApp number</Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="+27 82 000 0000"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}

            <Button
              className="w-full"
              size="lg"
              disabled={!canSubmit || loading}
              onClick={submit}
            >
              {loading ? "Creating shop..." : "Create my shop"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
