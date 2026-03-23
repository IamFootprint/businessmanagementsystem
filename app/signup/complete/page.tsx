"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function ClientSignupCompletePage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [suburb, setSuburb] = useState("");
  const [city, setCity] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function guard() {
      try {
        const res = await fetch("/api/auth/whoami");
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.authenticated) {
          router.replace("/signup");
          return;
        }
        if (payload?.profile?.role !== "CLIENT") {
          router.replace("/start");
          return;
        }
        if (payload?.profile?.onboardingStatus === "NONE") {
          router.replace("/app");
        }
      } catch {
        router.replace("/signup");
      }
    }
    void guard();
  }, [router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          suburb,
          city,
          whatsappOptIn,
          marketingOptIn,
          termsAccepted
        })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error?.message || "Unable to complete profile.");
        return;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cd-auth-changed"));
      }
      router.push("/app");
    } catch {
      setError("Unable to complete profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card rounded-xl border border-border p-6 shadow-sm">
        <img src="/cycledesk-logo.png" alt="CycleDesk" className="h-8 mb-6 mx-auto block" />
        <h1 className="text-2xl font-display font-bold text-foreground text-center">
          Complete your profile
        </h1>
        <p className="text-sm text-muted-foreground text-center mt-1 mb-6">
          One final step before you can book and manage services.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="suburb">Suburb (optional)</Label>
              <Input
                id="suburb"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City (optional)</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="whatsapp"
                checked={whatsappOptIn}
                onCheckedChange={(v) => setWhatsappOptIn(!!v)}
              />
              <Label htmlFor="whatsapp" className="text-sm font-normal">
                I consent to CycleDesk WhatsApp notifications.
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="marketing"
                checked={marketingOptIn}
                onCheckedChange={(v) => setMarketingOptIn(!!v)}
              />
              <Label htmlFor="marketing" className="text-sm font-normal">
                I consent to marketing updates.
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(v) => setTermsAccepted(!!v)}
                required
              />
              <Label htmlFor="terms" className="text-sm font-normal">
                I accept CycleDesk terms and privacy policy.
              </Label>
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" size="lg" disabled={loading}>
            {loading ? "Saving..." : "Complete profile"}
          </Button>
        </form>
      </div>
    </div>
  );
}
