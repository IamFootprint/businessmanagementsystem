import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Clock, ArrowLeft } from "lucide-react";

export default function PartnerPendingPage() {
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

          <div className="flex justify-center mb-4">
            <span className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center">
              <Clock className="w-6 h-6 text-accent-foreground" />
            </span>
          </div>

          <h1 className="text-2xl font-display font-bold text-foreground text-center">
            Pending approval
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-1 mb-6">
            Your shop registration has been submitted. Our team will review it and activate your account.
          </p>

          <div className="rounded-lg bg-muted/50 border border-border p-4 mb-6">
            <p className="text-xs text-muted-foreground">
              You&apos;ll receive access once your shop is approved. This usually takes 1–2 business days.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/login" className="block">
              <Button className="w-full" size="lg">
                Go to login
              </Button>
            </Link>
            <Link href="/partner/onboarding" className="block">
              <Button variant="outline" className="w-full" size="lg">
                Review my details
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
