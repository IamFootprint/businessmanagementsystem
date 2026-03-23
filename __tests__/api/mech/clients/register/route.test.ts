import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMechanic = {
  ok: true,
  profile: {
    id: "mech_1",
    phone: "+27110000003",
    role: "MECHANIC",
    shopId: "shop_1"
  }
};

const mockForbidden = {
  ok: false,
  response: new Response(
    JSON.stringify({ ok: false, error: { code: "FORBIDDEN", message: "You do not have permission to do that." } }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  )
};

vi.mock("@/src/lib/auth/localSession", () => ({
  requireRole: vi.fn(() => Promise.resolve(mockMechanic))
}));

vi.mock("@/src/lib/store", () => ({
  ProfilesRepo: {
    getByPhone: vi.fn(() => Promise.resolve(null)),
    upsertByPhone: vi.fn(() =>
      Promise.resolve({
        id: "prof_new",
        name: "Jane Customer",
        phone: "+27820001234",
        status: "ACTIVE"
      })
    )
  }
}));

vi.mock("@/lib/auth/phone", () => ({
  normalizePhone: vi.fn((p: string) => p),
  isAllowedPhone: vi.fn(() => true)
}));

import { POST } from "@/app/api/mech/clients/register/route";
import { requireRole } from "@/src/lib/auth/localSession";
import { ProfilesRepo } from "@/src/lib/store";
import { isAllowedPhone } from "@/lib/auth/phone";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/mech/clients/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/mech/clients/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireRole).mockResolvedValue(mockMechanic as any);
    vi.mocked(ProfilesRepo.getByPhone).mockResolvedValue(null);
    vi.mocked(isAllowedPhone).mockReturnValue(true);
  });

  it("registers new client and returns 200 with alreadyExists false", async () => {
    const response = await POST(makeRequest({ phone: "+27820001234", name: "Jane Customer" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.alreadyExists).toBe(false);
    expect(body.data.client.id).toBe("prof_new");
    expect(body.data.client.phone).toBe("+27820001234");
  });

  it("returns existing client with alreadyExists true", async () => {
    vi.mocked(ProfilesRepo.getByPhone).mockResolvedValue({
      id: "prof_existing",
      name: "Existing User",
      phone: "+27820001234",
      status: "ACTIVE"
    } as any);

    const response = await POST(makeRequest({ phone: "+27820001234", name: "Jane Customer" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.alreadyExists).toBe(true);
    expect(body.data.client.id).toBe("prof_existing");
  });

  it("returns 400 when phone is missing", async () => {
    const response = await POST(makeRequest({ name: "Jane" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  it("returns 400 when name is missing", async () => {
    const response = await POST(makeRequest({ phone: "+27820001234" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  it("returns 400 when phone is invalid", async () => {
    vi.mocked(isAllowedPhone).mockReturnValue(false);

    const response = await POST(makeRequest({ phone: "+27000bad00", name: "Jane" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INVALID_PHONE");
  });

  it("returns 403 when caller is not a mechanic", async () => {
    vi.mocked(requireRole).mockResolvedValue(mockForbidden as any);

    const response = await POST(makeRequest({ phone: "+27820001234", name: "Jane" }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
