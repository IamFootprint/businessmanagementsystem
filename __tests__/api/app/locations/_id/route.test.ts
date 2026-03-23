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
    getById: vi.fn(() => Promise.resolve({
      id: "loc_1",
      profileId: "client_1",
      label: "Home",
      addressLine1: "1 Main Road",
      city: "Johannesburg",
      createdAtIso: new Date().toISOString(),
      updatedAtIso: new Date().toISOString()
    })),
    update: vi.fn(() => Promise.resolve({
      id: "loc_1",
      profileId: "client_1",
      label: "Office",
      addressLine1: "2 Main Road",
      city: "Johannesburg",
      createdAtIso: new Date().toISOString(),
      updatedAtIso: new Date().toISOString()
    })),
    remove: vi.fn(() => Promise.resolve({
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

import { DELETE, PUT } from "@/app/api/app/locations/[id]/route";

describe("PUT/DELETE /api/app/locations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes location.updated event", async () => {
    const response = await PUT(new Request("http://localhost/api/app/locations/loc_1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: "Office", addressLine1: "2 Main Road" })
    }), { params: { id: "loc_1" } });

    expect(response.status).toBe(200);
    expect(logAuditEventMock).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "location.updated"
    }), expect.any(Request));
  });

  it("writes location.deleted event", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/app/locations/loc_1", { method: "DELETE" }),
      { params: { id: "loc_1" } }
    );

    expect(response.status).toBe(200);
    expect(logAuditEventMock).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "location.deleted"
    }), expect.any(Request));
  });
});
