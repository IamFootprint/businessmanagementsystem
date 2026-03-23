import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth/config", () => ({
  isStaticOtpEnabled: vi.fn(() => true),
  getMaxAttemptsPerHour: vi.fn(() => 10),
  getMaxAttemptsPerIpPerHour: vi.fn(() => 30),
  getMaxRequestsPerHour: vi.fn(() => 5),
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

vi.mock("@/lib/auth/devOtp", () => ({
  matchesDeterministicDevOtp: vi.fn((_phone: string, otp: string) => otp === "246824"),
}));

const mockProfile = {
  id: "prof_admin",
  phone: "+27110000001",
  name: "Admin User",
  role: "ADMIN",
  status: "ACTIVE",
  shopId: "shop_1",
  onboardingStatus: "NONE",
  createdAtIso: "2025-01-01T00:00:00Z",
};

vi.mock("@/src/lib/store", () => ({
  ProfilesRepo: {
    getByPhone: vi.fn(() => Promise.resolve(mockProfile)),
    upsertByPhone: vi.fn((data: Record<string, unknown>) =>
      Promise.resolve({ ...mockProfile, ...data, id: `prof_${Date.now()}` })
    ),
  },
  ShopRepo: {
    getById: vi.fn(() => Promise.resolve({ id: "shop_1", shopStatus: "ACTIVE" })),
  },
  createSession: vi.fn(() => Promise.resolve({ id: "sess_123" })),
  getDefaultShopId: vi.fn(() => Promise.resolve("shop_1")),
  getProfileForSession: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/src/lib/auth/roles", () => ({
  resolveWorkshopRole: vi.fn(({ role, shopId }: { role: string; shopId?: string }) => {
    if (role === "ADMIN" && !shopId) return "PLATFORM_OWNER";
    if (role === "ADMIN" || role === "SHOP_OWNER") return "SHOP_OWNER";
    if (role === "MECHANIC") return "MECHANIC";
    return "CLIENT";
  }),
}));

vi.mock("@/src/lib/auth/roleRouting", () => ({
  getRoleHomePath: vi.fn(() => "/admin"),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import { POST } from "@/app/api/auth/otp/verify/route";
import { isStaticOtpEnabled } from "@/lib/auth/config";
import { rateLimit } from "@/lib/auth/rate-limit";
import { matchesDeterministicDevOtp } from "@/lib/auth/devOtp";
import { ProfilesRepo } from "@/src/lib/store";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/auth/otp/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isStaticOtpEnabled).mockReturnValue(true);
    vi.mocked(rateLimit).mockReturnValue({ allowed: true, remaining: 9, resetAt: Date.now() + 3600000 });
    vi.mocked(matchesDeterministicDevOtp).mockImplementation((_phone, otp) => otp === "246824");
    vi.mocked(ProfilesRepo.getByPhone).mockResolvedValue(mockProfile as never);
  });

  it("returns 200 with session cookie for correct OTP (LOGIN intent)", async () => {
    const res = await POST(makeRequest({ phone: "+27110000001", otp: "246824", intent: "LOGIN" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.redirect).toBeDefined();
    expect(body.profile).toBeDefined();
    expect(body.profile.phone).toBe("+27110000001");
    // Session cookie should be set
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("cd_session");
  });

  it("returns 401 for wrong OTP", async () => {
    const res = await POST(makeRequest({ phone: "+27110000001", otp: "000000" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INVALID_OTP");
  });

  it("returns 401 for missing fields (invalid payload)", async () => {
    const res = await POST(makeRequest({}));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INVALID_OTP");
  });

  it("returns 404 when static OTP is disabled", async () => {
    vi.mocked(isStaticOtpEnabled).mockReturnValue(false);

    const res = await POST(makeRequest({ phone: "+27110000001", otp: "246824" }));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 429 when IP rate limit is exceeded", async () => {
    vi.mocked(rateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 3600000 });

    const res = await POST(makeRequest({ phone: "+27110000001", otp: "246824" }));

    expect(res.status).toBe(429);
  });

  it("returns 401 when user not found (LOGIN intent)", async () => {
    vi.mocked(ProfilesRepo.getByPhone).mockResolvedValue(null as never);

    const res = await POST(makeRequest({ phone: "+27110000001", otp: "246824", intent: "LOGIN" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("USER_NOT_FOUND");
  });

  it("returns 401 for invalid phone format", async () => {
    const res = await POST(makeRequest({ phone: "bad", otp: "246824" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.ok).toBe(false);
  });

  it("handles CLIENT_SIGNUP intent for new user", async () => {
    vi.mocked(ProfilesRepo.getByPhone).mockResolvedValue(null as never);

    const res = await POST(makeRequest({ phone: "+27110000005", otp: "246824", intent: "CLIENT_SIGNUP" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.profile).toBeDefined();
  });
});
