import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/config", () => ({
  isStaticOtpEnabled: vi.fn(() => true),
  getMaxAttemptsPerHour: vi.fn(() => 10),
  getMaxAttemptsPerIpPerHour: vi.fn(() => 30)
}));

vi.mock("@/lib/auth/rate-limit", () => ({
  rateLimit: vi.fn(() => ({ allowed: true, remaining: 9, resetAt: Date.now() + 3600000 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
  RATE_LIMIT_WINDOW_MS: 3600000
}));

vi.mock("@/lib/auth/phone", () => ({
  normalizePhone: vi.fn((input: string) => input),
  shouldRequireE164: vi.fn(() => true),
  validateE164: vi.fn(() => true),
  isAllowedPhone: vi.fn(() => true)
}));

vi.mock("@/lib/auth/devOtp", () => ({
  matchesDeterministicDevOtp: vi.fn(() => false)
}));

vi.mock("@/src/lib/store", () => ({
  ProfilesRepo: {
    getByPhone: vi.fn(() => Promise.resolve(null)),
    upsertByPhone: vi.fn()
  },
  ShopRepo: {
    getById: vi.fn(() => Promise.resolve(null))
  },
  createSession: vi.fn(),
  getDefaultShopId: vi.fn(() => Promise.resolve("shop_1")),
  getProfileForSession: vi.fn(() => Promise.resolve(null))
}));

vi.mock("@/src/lib/auth/roles", () => ({
  resolveWorkshopRole: vi.fn(() => "CLIENT")
}));

vi.mock("@/src/lib/auth/roleRouting", () => ({
  getRoleHomePath: vi.fn(() => "/app")
}));

const { logAuditEventMock } = vi.hoisted(() => ({
  logAuditEventMock: vi.fn(() => Promise.resolve())
}));
vi.mock("@/lib/audit/service", () => ({
  logAuditEvent: logAuditEventMock
}));

import { POST } from "@/app/api/auth/otp/verify/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("auth login failure audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes auth.login.failure when OTP verification fails", async () => {
    const response = await POST(makeRequest({
      phone: "+27110000002",
      otp: "000000",
      intent: "LOGIN"
    }));

    expect(response.status).toBe(401);
    expect(logAuditEventMock).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "auth.login.failure",
      outcome: "failure"
    }), expect.any(Request));
  });
});
