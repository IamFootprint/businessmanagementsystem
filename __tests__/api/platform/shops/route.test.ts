import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPlatformOwner = {
  ok: true,
  phone: "+27110000001",
  profileId: "prof_platform",
  shopId: "shop_platform",
  role: "PLATFORM_OWNER" as const,
  response: undefined
};

const mockUnauthorized = {
  ok: false,
  response: new Response(
    JSON.stringify({ ok: false, error: { code: "UNAUTHORIZED", message: "You need to sign in to continue." } }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  )
};

vi.mock("@/lib/admin/guard", () => ({
  requirePlatformOwner: vi.fn(() => Promise.resolve(mockPlatformOwner))
}));

vi.mock("@/src/lib/store", () => ({
  ShopRepo: {
    create: vi.fn(() =>
      Promise.resolve({
        id: "shop_new",
        name: "Test Cycle Shop",
        slug: "test-cycle-shop-1234"
      })
    ),
    update: vi.fn(() => Promise.resolve({}))
  },
  ProfilesRepo: {
    upsertByPhone: vi.fn(() =>
      Promise.resolve({ id: "prof_owner", phone: "+27820001111", name: "Owner" })
    ),
    getByPhone: vi.fn(() =>
      Promise.resolve({ id: "prof_owner", phone: "+27820001111", name: "Owner" })
    )
  }
}));

vi.mock("@/lib/auth/phone", () => ({
  normalizePhone: vi.fn((p: string) => p)
}));

const { logAuditMock } = vi.hoisted(() => ({
  logAuditMock: vi.fn(() => Promise.resolve())
}));
vi.mock("@/lib/admin/audit", () => ({
  logAudit: logAuditMock
}));

import { POST } from "@/app/api/platform/shops/route";
import { requirePlatformOwner } from "@/lib/admin/guard";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/platform/shops", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

const validPayload = {
  shopName: "Test Cycle Shop",
  ownerPhone: "+27820001111",
  ownerName: "John Owner",
  city: "Johannesburg",
  contactEmail: "john@example.com"
};

describe("POST /api/platform/shops", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePlatformOwner).mockResolvedValue(mockPlatformOwner as any);
  });

  it("creates shop and returns 201 with shopId", async () => {
    const response = await POST(makeRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.shopId).toBe("shop_new");
    expect(body.data.slug).toBeDefined();
  });

  it("calls logAudit with platform.shop.created", async () => {
    await POST(makeRequest(validPayload));

    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "platform.shop.created",
        entity: "shop",
        entityId: "shop_new"
      })
    );
  });

  it("returns 400 when shopName is missing", async () => {
    const response = await POST(
      makeRequest({ ownerPhone: "+27820001111", ownerName: "John" })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  it("returns 400 when ownerPhone is missing", async () => {
    const response = await POST(
      makeRequest({ shopName: "My Shop", ownerName: "John" })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  it("returns 400 when ownerName is too short", async () => {
    const response = await POST(
      makeRequest({ shopName: "My Shop", ownerPhone: "+27820001111", ownerName: "J" })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  it("returns 401 when not platform owner", async () => {
    vi.mocked(requirePlatformOwner).mockResolvedValue(mockUnauthorized as any);

    const response = await POST(makeRequest(validPayload));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
