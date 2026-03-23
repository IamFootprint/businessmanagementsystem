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
    shopId: "shop_1",
    completion: null
  }))
}));

vi.mock("@/lib/planned-events/store", () => ({
  JobPhotosRepo: {
    listByJobCard: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({
      id: "photo_1",
      jobCardId: "jc_1",
      shopId: "shop_1",
      addedByProfileId: "mech_1",
      caption: "Before",
      mediaUrl: "https://example.com/p.jpg",
      createdAtIso: new Date().toISOString()
    }))
  }
}));

const { logAuditEventMock } = vi.hoisted(() => ({
  logAuditEventMock: vi.fn(() => Promise.resolve())
}));
vi.mock("@/lib/audit/service", () => ({
  logAuditEvent: logAuditEventMock
}));

import { POST } from "@/app/api/mech/jobs/[id]/photos/route";

describe("POST /api/mech/jobs/[id]/photos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes job_card.photo.added event", async () => {
    const response = await POST(new Request("http://localhost/api/mech/jobs/jc_1/photos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        caption: "Before",
        mediaUrl: "https://example.com/p.jpg"
      })
    }), { params: { id: "jc_1" } });

    expect(response.status).toBe(200);
    expect(logAuditEventMock).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "job_card.photo.added"
    }), expect.any(Request));
  });
});
