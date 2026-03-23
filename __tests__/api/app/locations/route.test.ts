import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/auth/localSession", () => ({
  requireRole: vi.fn(() => Promise.resolve({
    ok: true,
    profile: {
      id: "client_1",
      phone: "+27110000001",
      role: "CLIENT",
      shopId: "shop_1"
    }
  }))
}));

vi.mock("@/lib/planned-events/store", () => ({
  AppLocationsRepo: {
    listByProfile: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({
      id: "loc_1",
      profileId: "client_1",
      label: "Home",
      addressLine1: "1 Main Road",
      city: "Johannesburg",
      createdAtIso: new Date().toISOString(),
      updatedAtIso: new Date().toISOString()
    }))
  }
}));

const { logAuditEventMock } = vi.hoisted(() => ({
  logAuditEventMock: vi.fn(() => Promise.resolve())
}));
vi.mock("@/lib/audit/service", () => ({
  logAuditEvent: logAuditEventMock
}));

import { POST } from "@/app/api/app/locations/route";

describe("POST /api/app/locations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes location.created event", async () => {
    const response = await POST(new Request("http://localhost/api/app/locations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        label: "Home",
        addressLine1: "1 Main Road",
        city: "Johannesburg"
      })
    }));

    expect(response.status).toBe(200);
    expect(logAuditEventMock).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "location.created"
    }), expect.any(Request));
  });
});
