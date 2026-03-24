import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth/config", () => ({
  isStaticOtpEnabled: vi.fn(() => true),
  getMaxRequestsPerHour: vi.fn(() => 5),
  getMaxAttemptsPerIpPerHour: vi.fn(() => 30),
  getMaxAttemptsPerHour: vi.fn(() => 10),
}));

vi.mock("@/lib/auth/rate-limit", () => ({
  rateLimit: vi.fn(() => ({ allowed: true, remaining: 9, resetAt: Date.now() + 3600000 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
  RATE_LIMIT_WINDOW_MS: 3600000,
}));

vi.mock("@/lib/auth/phone", () => ({
  normalizePhone: vi.fn((input: string) => input.replace(/\s+/g, "").replace(/-/g, "")),
  shouldRequireE164: vi.fn(() => true),
  validateE164: vi.fn((phone: string) => /^\+[1-9]\d{7,14}$/.test(phone)),
  isAllowedPhone: vi.fn((phone: string) => phone.startsWith("+27")),
}));

vi.mock("@/src/lib/auth/supabase", () => ({
  isSupabaseConfigured: vi.fn(() => false),
  supabaseAdmin: {
    auth: {
      signInWithOtp: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    },
  },
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import { POST } from "@/app/api/auth/otp/request/route";
import { isStaticOtpEnabled } from "@/lib/auth/config";
import { rateLimit } from "@/lib/auth/rate-limit";
import { isAllowedPhone, validateE164 } from "@/lib/auth/phone";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/otp/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/auth/otp/request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isStaticOtpEnabled).mockReturnValue(true);
    vi.mocked(rateLimit).mockReturnValue({ allowed: true, remaining: 9, resetAt: Date.now() + 3600000 });
    vi.mocked(isAllowedPhone).mockReturnValue(true);
    vi.mocked(validateE164).mockReturnValue(true);
  });

  it("returns 200 with requested:true for a valid phone number", async () => {
    const res = await POST(makeRequest({ phone: "+27110000001" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.requested).toBe(true);
    expect(body.data.message).toContain("eligible");
  });

  it("returns 200 when static OTP is disabled (Supabase path, not configured)", async () => {
    vi.mocked(isStaticOtpEnabled).mockReturnValue(false);

    const res = await POST(makeRequest({ phone: "+27110000001" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.requested).toBe(true);
  });

  it("returns 429 when IP rate limit is exceeded", async () => {
    vi.mocked(rateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 3600000 });

    const res = await POST(makeRequest({ phone: "+27110000001" }));
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("returns 200 with generic message for empty phone (invalid payload)", async () => {
    const res = await POST(makeRequest({ phone: "" }));
    const body = await res.json();

    // The route returns a generic ok response to avoid user enumeration
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.requested).toBe(true);
  });

  it("returns 200 with generic message for missing phone field", async () => {
    const res = await POST(makeRequest({}));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.requested).toBe(true);
  });

  it("returns 200 with generic message when E164 validation fails", async () => {
    vi.mocked(validateE164).mockReturnValue(false);

    const res = await POST(makeRequest({ phone: "not-a-number" }));
    const body = await res.json();

    // Route returns generic ok to prevent enumeration
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.requested).toBe(true);
  });

  it("returns 200 with generic message when phone is not in allowed list", async () => {
    vi.mocked(isAllowedPhone).mockReturnValue(false);

    const res = await POST(makeRequest({ phone: "+44110000001" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.requested).toBe(true);
  });

  it("returns 200 with generic message when per-phone rate limit is exceeded", async () => {
    // First call (IP check) passes, second call (phone check) fails
    vi.mocked(rateLimit)
      .mockReturnValueOnce({ allowed: true, remaining: 9, resetAt: Date.now() + 3600000 })
      .mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 3600000 });

    const res = await POST(makeRequest({ phone: "+27110000001" }));
    const body = await res.json();

    // Per-phone rate limit returns generic ok to prevent enumeration
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.requested).toBe(true);
  });

  it("accepts optional intent field in request body", async () => {
    const res = await POST(makeRequest({ phone: "+27110000001", intent: "LOGIN" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.requested).toBe(true);
  });

  it("handles malformed JSON body gracefully", async () => {
    const req = new Request("http://localhost/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const res = await POST(req);
    const body = await res.json();

    // Malformed JSON falls through to schema validation failure, returns generic ok
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.requested).toBe(true);
  });
});
