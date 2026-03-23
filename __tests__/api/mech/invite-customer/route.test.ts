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
  requireRole: vi.fn(() => Promise.resolve(mockMechanic)),
  normalizeAndValidatePhone: vi.fn((p: string) => p)
}));

vi.mock("@/src/lib/store", () => ({
  InvitesRepo: {
    create: vi.fn(() =>
      Promise.resolve({
        id: "inv_1",
        phone: "+27820001234",
        name: "Jane Customer",
        shopId: "shop_1",
        role: "CLIENT",
        token: "tok_abc123"
      })
    )
  }
}));

import { POST } from "@/app/api/mech/invite-customer/route";
import { requireRole, normalizeAndValidatePhone } from "@/src/lib/auth/localSession";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/mech/invite-customer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/mech/invite-customer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireRole).mockResolvedValue(mockMechanic as any);
    vi.mocked(normalizeAndValidatePhone).mockImplementation((p: string) => p);
  });

  it("creates invite and returns 201 with inviteUrl", async () => {
    const response = await POST(makeRequest({ phone: "+27820001234", name: "Jane Customer" }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.invite).toBeDefined();
    expect(body.data.invite.token).toBe("tok_abc123");
    expect(body.data.inviteUrl).toContain("tok_abc123");
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
    vi.mocked(normalizeAndValidatePhone).mockReturnValue(null as any);

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
