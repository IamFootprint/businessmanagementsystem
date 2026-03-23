"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import PublicHeroBanner from "@/app/components/PublicHeroBanner";
function InviteAcceptPageContent() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    async function acceptInvite() {
      if (!token) {
        setStatus("error");
        setMessage("Missing invite token.");
        return;
      }
      setStatus("loading");
      try {
        const res = await fetch("/api/invites/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token })
        });
        if (!res.ok) {
          const data = await res.json();
          setStatus("error");
          setMessage(data?.error?.message || "Invite could not be accepted.");
          return;
        }
        setStatus("success");
        setMessage("Account activated. Continue to login.");
      } catch {
        setStatus("error");
        setMessage("Invite could not be accepted.");
      }
    }
    acceptInvite();
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <PublicHeroBanner
          eyebrow="Mechanic Onboarding"
          title="Activate your invite"
          description="Complete activation to access your mechanic dashboard."
        />
        <div className="rounded-xl border border-border bg-card p-6 mt-4">
          <h1 className="font-display font-bold text-foreground text-lg mb-2">Mechanic invite</h1>
          {status === "loading" ? <p className="text-sm text-muted-foreground">Activating invite...</p> : null}
          {status !== "loading" ? <p className="text-sm text-foreground">{message || "Checking invite..."}</p> : null}
          {status === "success" ? (
            <Button className="mt-3" onClick={() => (window.location.href = "/login")}>Continue to login</Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background p-4"><div className="rounded-xl border border-border bg-card p-6"><p className="text-sm text-muted-foreground">Loading...</p></div></div>}>
      <InviteAcceptPageContent />
    </Suspense>
  );
}
