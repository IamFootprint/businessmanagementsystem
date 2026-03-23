"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { apiFetch, isApiClientError } from "@/lib/client/api";
import { useNotify } from "@/app/components/ToastProvider";
import type { SessionPolicy } from "@/lib/security/sessionPolicyShared";
import { DEFAULT_SESSION_POLICY } from "@/lib/security/sessionPolicyShared";
export default function PlatformSecurityPage() {
  const notify = useNotify();
  const [policy, setPolicy] = useState<SessionPolicy>(DEFAULT_SESSION_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<SessionPolicy>("/api/platform/settings/security");
        if (!active) return;
        setPolicy(data);
      } catch (error) {
        if (!active) return;
        notify.error(
          "Could not load security settings",
          isApiClientError(error) ? error.message : "Please try again.",
          isApiClientError(error) ? error.hint : undefined
        );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [notify]);

  async function save() {
    setSaving(true);
    setErrors({});
    try {
      const data = await apiFetch<SessionPolicy>("/api/platform/settings/security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policy)
      });
      setPolicy(data);
      notify.success("Security settings saved", "Inactivity timeout changes will apply to active sessions.");
      window.dispatchEvent(new Event("cd-session-policy-updated"));
    } catch (error) {
      if (isApiClientError(error) && error.fields) {
        setErrors(error.fields);
      }
      notify.error(
        "Could not save security settings",
        isApiClientError(error) ? error.message : "Please try again.",
        isApiClientError(error) ? error.hint : "Use valid timeout values and try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h1>Session security</h1>
          <p className="text-sm text-muted-foreground">
            Configure inactivity auto-logout for all authenticated workspaces. Public pages are not affected.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LabeledInput
            label="Inactivity timeout (minutes)"
            type="number"
            min={1}
            max={120}
            inputMode="numeric"
            value={String(policy.inactivityTimeoutMinutes)}
            error={errors.inactivityTimeoutMinutes || null}
            helperText="Allowed range: 1 to 120 minutes."
            onChange={(event) =>
              setPolicy((current) => ({
                ...current,
                inactivityTimeoutMinutes: Number(event.target.value || DEFAULT_SESSION_POLICY.inactivityTimeoutMinutes)
              }))
            }
          />
          <LabeledInput
            label="Countdown warning (seconds)"
            type="number"
            min={10}
            max={300}
            inputMode="numeric"
            value={String(policy.inactivityCountdownSeconds)}
            error={errors.inactivityCountdownSeconds || null}
            helperText="Allowed range: 10 to 300 seconds."
            onChange={(event) =>
              setPolicy((current) => ({
                ...current,
                inactivityCountdownSeconds: Number(event.target.value || DEFAULT_SESSION_POLICY.inactivityCountdownSeconds)
              }))
            }
          />
        </div>

        <div className="rounded-lg border border-border p-4 mt-4">
          <strong>Current behavior</strong>
          <p className="text-sm text-muted-foreground">
            Warn after <strong>{policy.inactivityTimeoutMinutes}</strong> minute(s) of inactivity, then log out after
            a <strong>{policy.inactivityCountdownSeconds}</strong> second countdown.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.location.reload()} disabled={loading || saving}>
            Reset
          </Button>
          <Button onClick={() => void save()} disabled={loading || saving}>
            {saving ? "Saving..." : loading ? "Loading..." : "Save security settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
