import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAdmin = {
  ok: true,
  phone: "+27110000001",
  profileId: "prof_admin",
  shopId: "shop_1",
  role: "SHOP_OWNER" as const,
  response: undefined
};

const booking = {
  id: "bk_1",
  ref: "BK-20260306-0001",
  shopId: "shop_1",
  status: "CONFIRMED",
  slotIso: "2026-03-07T09:00:00.000Z",
  preferredMechanicId: null,
  customerPhone: "+27110000020"
};

vi.mock("@/lib/admin/guard", () => ({
  requireAdmin: vi.fn(() => Promise.resolve(mockAdmin))
}));

vi.mock("@/src/lib/store", () => ({
  BookingsRepo: {
    get: vi.fn(() => Promise.resolve(booking)),
    update: vi.fn((_id: string, updates: Record<string, unknown>) => Promise.resolve({ ...booking, ...updates }))
  },
  JobCardsRepo: {
    list: vi.fn(() => Promise.resolve([])),
    reschedule: vi.fn(() => Promise.resolve(null)),
    reassignMechanic: vi.fn(() => Promise.resolve(null))
  }
}));

vi.mock("@/src/lib/workshop/scheduling", () => ({
  getSchedulingPolicy: vi.fn(() => Promise.resolve({ defaultNoticeHours: 24 })),
  isSlotOutsideNoticeWindow: vi.fn(() => false),
  pickAssignedMechanic: vi.fn(() => Promise.resolve({ mechanic: null, reason: "AUTO_NO_MECHANIC" }))
}));

vi.mock("@/src/lib/workshop/statuses", () => ({
  isJobCardAmendLocked: vi.fn(() => false)
}));

vi.mock("@/src/lib/workshop/notifications", () => ({
  logNotificationEvent: vi.fn(() => Promise.resolve())
}));

const { logAuditMock } = vi.hoisted(() => ({
  logAuditMock: vi.fn(() => Promise.resolve())
}));
vi.mock("@/lib/admin/audit", () => ({
  logAudit: logAuditMock
}));

import { POST } from "@/app/api/admin/bookings/[id]/reschedule/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/bookings/bk_1/reschedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/admin/bookings/[id]/reschedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires a reason when same-day override is used", async () => {
    const response = await POST(makeRequest({
      slotStart: "2026-03-06T10:00:00.000Z",
      allowSameDayOverride: true
    }), { params: { id: "bk_1" } });

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("REASON_REQUIRED");
  });

  it("writes same-day override audit event with reason", async () => {
    const response = await POST(makeRequest({
      slotStart: "2026-03-06T10:00:00.000Z",
      allowSameDayOverride: true,
      reasonText: "Customer stranded and requested urgent assistance"
    }), { params: { id: "bk_1" } });

    expect(response.status).toBe(200);
    expect(logAuditMock).toHaveBeenCalledWith(expect.objectContaining({
      action: "booking.same_day_override.applied",
      entity: "booking",
      entityId: "bk_1",
      metadata: expect.objectContaining({
        reasonText: "Customer stranded and requested urgent assistance"
      })
    }));
  });
});
