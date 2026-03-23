import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import PublicHeroBanner from "@/app/components/PublicHeroBanner";
export default function StartPage() {
  return (
    <>
      <PublicHeroBanner
        eyebrow="CycleDesk access"
        title="Choose your path"
        description="Use the route that matches your role. This page is only for access selection."
      />
      <Container>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <article className="rounded-xl border border-border bg-card p-5">
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">Bike Owner</span>
            <h2 className="font-display font-bold text-foreground text-lg mb-1">I&apos;m a bike owner</h2>
            <p className="text-sm text-muted-foreground mb-4">Register as a client, add your bike, and manage service bookings.</p>
            <a href="/signup">
              <Button>Start client signup</Button>
            </a>
          </article>

          <article className="rounded-xl border border-border bg-card p-5">
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">Shop Partner</span>
            <h2 className="font-display font-bold text-foreground text-lg mb-1">I run a bike service shop</h2>
            <p className="text-sm text-muted-foreground mb-4">Create your shop profile, submit onboarding, and wait for approval.</p>
            <a href="/partner">
              <Button>Start shop registration</Button>
            </a>
          </article>

          <article className="rounded-xl border border-border bg-card p-5">
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">Invite Only</span>
            <h2 className="font-display font-bold text-foreground text-lg mb-1">I&apos;m a mechanic</h2>
            <p className="text-sm text-muted-foreground mb-4">Mechanic access stays invite-only. Accept your invite, then login with your phone.</p>
            <a href="/login">
              <Button variant="outline">Mechanic login</Button>
            </a>
          </article>

          <article className="rounded-xl border border-border bg-card p-5">
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">Existing user</span>
            <h2 className="font-display font-bold text-foreground text-lg mb-1">I already have access</h2>
            <p className="text-sm text-muted-foreground mb-4">Go straight to login if your account is already active.</p>
            <a href="/login">
              <Button variant="outline">Login</Button>
            </a>
          </article>
        </div>
      </Container>
    </>
  );
}
