"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type FormType = "demo" | "early-access" | "custom";

function ContactFormInner() {
  const searchParams = useSearchParams();
  const initialForm = (searchParams.get("form") as FormType | null) ?? "demo";

  const [formType, setFormType] = useState<FormType>(initialForm);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [business, setBusiness] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const FORM_OPTIONS: { value: FormType; label: string; description: string }[] = [
    {
      value: "demo",
      label: "Book a walkthrough",
      description: "See CycleDesk in action with a personalised walkthrough",
    },
    {
      value: "early-access",
      label: "Start free trial",
      description: "Sign up and start using CycleDesk today",
    },
    {
      value: "custom",
      label: "Custom / Enterprise",
      description: "Discuss custom requirements for larger or multi-location operations",
    },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (honeypot) return; // bot trap

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company: business || undefined,
          formType,
          message,
          utmSource: "marketing",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Something went wrong. Please try again.");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "4rem 2rem",
          background: "rgba(94, 231, 223, 0.05)",
          border: "1px solid rgba(94, 231, 223, 0.2)",
          borderRadius: "1.25rem",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>&#x2705;</div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "white", marginBottom: "0.75rem" }}>
          Message received!
        </h2>
        <p style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.7, maxWidth: "28rem", margin: "0 auto" }}>
          Thanks for reaching out. We&apos;ll get back to you within 1 business day. Keep an eye on your inbox.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: "absolute", opacity: 0, pointerEvents: "none", height: 0 }}
        autoComplete="off"
      />

      {/* Form type selection */}
      <div style={{ marginBottom: "1.75rem" }}>
        <label
          style={{
            display: "block",
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "rgba(255,255,255,0.5)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "0.75rem",
          }}
        >
          I&apos;m interested in
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {FORM_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.875rem",
                padding: "1rem",
                borderRadius: "0.75rem",
                border: formType === opt.value
                  ? "1px solid rgba(94, 231, 223, 0.4)"
                  : "1px solid rgba(255,255,255,0.08)",
                background: formType === opt.value
                  ? "rgba(94, 231, 223, 0.06)"
                  : "rgba(255,255,255,0.02)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <input
                type="radio"
                name="formType"
                value={opt.value}
                checked={formType === opt.value}
                onChange={() => setFormType(opt.value)}
                style={{ marginTop: "3px", accentColor: "var(--marketing-glow)" }}
              />
              <div>
                <span style={{ display: "block", fontWeight: 600, fontSize: "0.9rem", color: "white" }}>
                  {opt.label}
                </span>
                <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                  {opt.description}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div>
          <label
            htmlFor="contact-name"
            style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "rgba(255,255,255,0.7)", marginBottom: "0.5rem" }}
          >
            Full name <span style={{ color: "#ff6b6b" }}>*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="marketing-input"
          />
        </div>

        <div>
          <label
            htmlFor="contact-email"
            style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "rgba(255,255,255,0.7)", marginBottom: "0.5rem" }}
          >
            Email address <span style={{ color: "#ff6b6b" }}>*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="marketing-input"
          />
        </div>

        <div>
          <label
            htmlFor="contact-business"
            style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "rgba(255,255,255,0.7)", marginBottom: "0.5rem" }}
          >
            Business name
          </label>
          <input
            id="contact-business"
            type="text"
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            placeholder="Your workshop or trading name"
            className="marketing-input"
          />
        </div>

        <div>
          <label
            htmlFor="contact-message"
            style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "rgba(255,255,255,0.7)", marginBottom: "0.5rem" }}
          >
            Message
          </label>
          <textarea
            id="contact-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Tell us about your business, team size, or anything specific you'd like to discuss..."
            className="marketing-textarea"
          />
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: "1.25rem",
            padding: "0.875rem 1rem",
            borderRadius: "0.5rem",
            background: "rgba(255, 107, 107, 0.1)",
            border: "1px solid rgba(255, 107, 107, 0.3)",
            color: "#ff6b6b",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop: "1.75rem",
          width: "100%",
          height: "52px",
          borderRadius: "0.5rem",
          fontWeight: 600,
          fontSize: "0.95rem",
          color: "white",
          background: loading
            ? "rgba(74, 63, 107, 0.5)"
            : "linear-gradient(135deg, var(--marketing-primary), var(--marketing-secondary))",
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: loading ? "none" : "0 0 20px -5px var(--marketing-glow)",
          transition: "all 0.2s",
        }}
      >
        {loading ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}

export default function ContactForm() {
  return (
    <Suspense fallback={<div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: "2rem" }}>Loading form...</div>}>
      <ContactFormInner />
    </Suspense>
  );
}
