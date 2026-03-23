import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/auth/localSession", () => ({
  requireRole: vi.fn(() => Promise.resolve({
    ok: true,
    profile: {
      id: "mech_1",
      phone: "+27110000003",
      role: "MECHANIC",
      shopId: "shop_1"
    }
  })),
  canAccessJobCard: vi.fn(() => Promise.resolve(true))
}));

vi.mock("@/src/lib/store", () => ({
  getJobCard: vi.fn(() => Promise.resolve({
    id: "jc_1",
    ref: "JC-001",
    shopId: "shop_1"
  }))
}));

vi.mock("@/lib/planned-events/store", () => ({
  JobPhotosRepo: {
    remove: vi.fn(() => Promise.resolve({
      id: "photo_1",
      caption: "Before",
      mediaUrl: "https://example.com/p.jpg"
    }))
  }
}));

const { logAuditEventMock } = vi.hoisted(() => ({
  logAuditEventMock: vi.fn(() => Promise.resolve())
}));
vi.mock("@/lib/audit/service", () => ({
  logAuditEvent: logAuditEventMock
}));

import { DELETE } from "@/app/api/mech/jobs/[id]/photos/[photoId]/route";

describe("DELETE /api/mech/jobs/[id]/photos/[photoId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes job_card.photo.deleted event", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/mech/jobs/jc_1/photos/photo_1", { method: "DELETE" }),
      { params: { id: "jc_1", photoId: "photo_1" } }
    );

    expect(response.status).toBe(200);
    expect(logAuditEventMock).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "job_card.photo.deleted"
    }), expect.any(Request));
  });
});
