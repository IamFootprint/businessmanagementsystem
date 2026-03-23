import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockAdmin = {
  ok: true,
  role: "SHOP_OWNER" as const,
  phone: "+27110000001",
  profileId: "prof_admin",
  shopId: "shop_1",
  response: undefined,
};

vi.mock("@/lib/admin/guard", () => ({
  requireAdmin: vi.fn(() => Promise.resolve(mockAdmin)),
}));

vi.mock("@/lib/admin/audit", () => ({
  logAudit: vi.fn(() => Promise.resolve()),
}));

const mockProfiles: Record<string, unknown>[] = [];

vi.mock("@/src/lib/store", () => ({
  ProfilesRepo: {
    list: vi.fn(() => Promise.resolve(mockProfiles)),
    getByPhone: vi.fn(() => Promise.resolve(null)),
    getById: vi.fn((id: string) => {
      const found = mockProfiles.find((p: Record<string, unknown>) => p.id === id);
      return Promise.resolve(found || null);
    }),
    upsertByPhone: vi.fn((data: Record<string, unknown>) => {
      const profile = {
        id: `prof_${Date.now()}`,
        phone: data.phone,
        name: data.name,
        role: data.role,
        status: data.status || "ACTIVE",
        shopId: data.shopId || "shop_1",
        onboardingStatus: "NONE",
        createdAtIso: new Date().toISOString(),
      };
      mockProfiles.push(profile);
      return Promise.resolve(profile);
    }),
    update: vi.fn((id: string, data: Record<string, unknown>) => {
      const found = mockProfiles.find((p: Record<string, unknown>) => p.id === id);
      if (!found) return Promise.resolve(null);
      Object.assign(found, data);
      return Promise.resolve(found);
    }),
  },
  getDefaultShopId: vi.fn(() => Promise.resolve("shop_1")),
}));

vi.mock("@/lib/auth/phone", () => ({
  normalizePhone: vi.fn((input: string) => input.replace(/\s+/g, "").replace(/-/g, "")),
}));

vi.mock("@/src/lib/auth/roles", () => ({
  resolveWorkshopRole: vi.fn(({ role, shopId }: { role: string; shopId?: string }) => {
    if (role === "ADMIN" && !shopId) return "PLATFORM_OWNER";
    if (role === "ADMIN" || role === "SHOP_OWNER") return "SHOP_OWNER";
    if (role === "MECHANIC") return "MECHANIC";
    return "CLIENT";
  }),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import { GET, POST, PUT } from "@/app/api/admin/users/route";
import { requireAdmin } from "@/lib/admin/guard";
import { ProfilesRepo } from "@/src/lib/store";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(method: string, body?: unknown) {
  const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  return new Request("http://localhost/api/admin/users", opts);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfiles.length = 0;
    vi.mocked(requireAdmin).mockResolvedValue(mockAdmin as never);
  });

  it("requires admin session", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ ok: false, error: { code: "UNAUTHORIZED" } }), { status: 401 }),
    } as never);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns user list for authenticated admin", async () => {
    mockProfiles.push({
      id: "prof_1",
      phone: "+27110000003",
      name: "Test Mech",
      role: "MECHANIC",
      status: "ACTIVE",
      shopId: "shop_1",
      createdAtIso: "2025-01-01T00:00:00Z",
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.users).toHaveLength(1);
    expect(body.data.users[0].phone).toBe("+27110000003");
  });
});

describe("POST /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfiles.length = 0;
    vi.mocked(requireAdmin).mockResolvedValue(mockAdmin as never);
    vi.mocked(ProfilesRepo.getByPhone).mockResolvedValue(null as never);
  });

  it("creates a new user with valid payload", async () => {
    const res = await POST(
      makeRequest("POST", {
        phone: "+27110000010",
        firstName: "New",
        lastName: "User",
        role: "MECHANIC",
      })
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.user).toBeDefined();
    expect(body.data.user.phone).toBe("+27110000010");
  });

  it("returns 409 when phone already exists", async () => {
    vi.mocked(ProfilesRepo.getByPhone).mockResolvedValue({
      id: "existing",
      phone: "+27110000010",
    } as never);

    const res = await POST(
      makeRequest("POST", {
        phone: "+27110000010",
        firstName: "Dup",
        lastName: "User",
        role: "MECHANIC",
      })
    );
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("USER_ALREADY_EXISTS");
  });

  it("returns 400 for invalid payload (missing fields)", async () => {
    const res = await POST(makeRequest("POST", { phone: "+27110000010" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INVALID_USER_PAYLOAD");
  });

  it("returns 403 when shop owner tries to create a platform owner", async () => {
    const res = await POST(
      makeRequest("POST", {
        phone: "+27110000020",
        firstName: "Platform",
        lastName: "Admin",
        role: "PLATFORM_OWNER",
      })
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});

describe("PUT /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfiles.length = 0;
    vi.mocked(requireAdmin).mockResolvedValue(mockAdmin as never);
    vi.mocked(ProfilesRepo.getByPhone).mockResolvedValue(null as never);
  });

  it("returns 403 when admin tries to modify themselves", async () => {
    mockProfiles.push({
      id: "prof_admin",
      phone: "+27110000001",
      name: "Admin User",
      role: "ADMIN",
      status: "ACTIVE",
      shopId: "shop_1",
      createdAtIso: "2025-01-01T00:00:00Z",
    });

    const res = await PUT(
      makeRequest("PUT", {
        id: "prof_admin",
        phone: "+27110000001",
        firstName: "Admin",
        lastName: "User",
        role: "MECHANIC",
      })
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("CANNOT_MODIFY_SELF");
  });

  it("returns 404 for non-existent user", async () => {
    const res = await PUT(
      makeRequest("PUT", {
        id: "nonexistent",
        phone: "+27110000099",
        firstName: "Ghost",
        lastName: "User",
        role: "MECHANIC",
      })
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("USER_NOT_FOUND");
  });

  it("updates an existing user successfully", async () => {
    mockProfiles.push({
      id: "prof_mech",
      phone: "+27110000003",
      name: "Old Name",
      role: "MECHANIC",
      status: "ACTIVE",
      shopId: "shop_1",
      createdAtIso: "2025-01-01T00:00:00Z",
    });

    const res = await PUT(
      makeRequest("PUT", {
        id: "prof_mech",
        phone: "+27110000003",
        firstName: "Updated",
        lastName: "Name",
        role: "MECHANIC",
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.user).toBeDefined();
  });
});
