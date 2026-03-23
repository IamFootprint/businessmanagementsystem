import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Store, ShieldCheck, ClipboardList, UserCheck } from "lucide-react";

const steps = [
  {
    icon: UserCheck,
    title: "Verify your identity",
    description: "Confirm your phone number with a one-time code.",
  },
  {
    icon: ClipboardList,
    title: "Complete shop profile",
    description: "Fill in your shop details, operating hours, and service catalogue.",
  },
  {
    icon: ShieldCheck,
    title: "Platform review",
    description: "Our team reviews your submission and activates your account.",
  },
  {
    icon: Store,
    title: "Go live",
    description: "Get full admin access to manage bookings, mechanics, and invoicing.",
  },
];

export default function PartnerLandingPage() {
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
            Register your bike workshop
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-1 mb-6">
            Join CycleDesk as a shop partner and manage your service business from one platform.
          </p>

          <Link href="/partner/signup" className="block">
            <Button className="w-full" size="lg">
              Get started
            </Button>
          </Link>

          <Separator className="my-6" />

          <h2 className="text-sm font-semibold text-foreground mb-4">
            How it works
          </h2>
          <ol className="space-y-4">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <step.icon className="w-4 h-4 text-primary" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Already registered?{" "}
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
