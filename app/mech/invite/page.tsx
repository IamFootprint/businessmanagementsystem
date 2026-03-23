"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";

export default function InviteCustomerPage() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setInviteUrl(null);
    setCopied(false);
    setSubmitting(true);

    try {
      const res = await fetch("/api/mech/invite-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), name: name.trim() })
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Failed to create invite.");
        return;
      }
      const data = json.data ?? json;
      setInviteUrl(data.inviteUrl);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input text
      const input = document.getElementById("invite-url-input") as HTMLInputElement | null;
      if (input) {
        input.select();
        input.setSelectionRange(0, 99999);
      }
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 480 }}>
      <h1 className="page-title">Invite Customer</h1>
      <p className="page-description" style={{ marginBottom: "1.5rem" }}>
        Send a registration link to a bike owner so they can create their account.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <LabeledInput
          label="Customer Phone"
          type="tel"
          placeholder="+27..."
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <LabeledInput
          label="Customer Name"
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {error && (
          <p className="form-error" role="alert" style={{ color: "var(--color-error, #dc2626)" }}>
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting || !phone.trim() || !name.trim()}>
          {submitting ? "Generating..." : "Generate Invite Link"}
        </Button>
      </form>

      {inviteUrl && (
        <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <label htmlFor="invite-url-input" style={{ fontWeight: 600, fontSize: "0.875rem" }}>
            Invite Link
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              id="invite-url-input"
              type="text"
              readOnly
              value={inviteUrl}
              className="input"
              style={{ flex: 1 }}
              onFocus={(e) => e.target.select()}
            />
            <Button type="button" variant="outline" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy link"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
