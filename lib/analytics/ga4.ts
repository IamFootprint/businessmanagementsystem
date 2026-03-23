"use client";

type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID?.trim() || "";

const PII_PARAM_KEYS = ["name", "email", "phone", "message", "full_name", "first_name", "last_name"];

function hasGa4() {
  return Boolean(GA4_ID) && typeof window !== "undefined" && typeof window.gtag === "function";
}

function sanitizeParams(params?: EventParams) {
  if (!params) return {};
  const sanitized: EventParams = {};
  for (const [key, value] of Object.entries(params)) {
    const lower = key.toLowerCase();
    if (PII_PARAM_KEYS.some((piiKey) => lower.includes(piiKey))) continue;
    sanitized[key] = value;
  }
  return sanitized;
}

export function pageview(url: string) {
  if (!hasGa4()) return;
  window.gtag!("config", GA4_ID, {
    page_path: url
  });
}

export function event(name: string, params?: EventParams) {
  if (!hasGa4()) return;
  window.gtag!("event", name, sanitizeParams(params));
}

