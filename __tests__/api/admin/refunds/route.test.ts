import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/guard", () => ({
  requireAdmin: vi.fn(() => Promise.resolve({
    ok: true,
    profileId: "owner_1",
    phone: "+27110000002",
    shopId: "shop_1",
    role: "SHOP_OWNER"
  }))
}));

vi.mock("@/lib/planned-events/store", () => ({
  RefundsRepo: {
    create: vi.fn(() => Promise.resolve({
      id: "refund_1",
      shopId: "shop_1",
      status: "REQUESTED",
      reasonText: "Customer disputed charge",
      currency: "ZAR",
      createdAtIso: new Date().toISOString(),
      updatedAtIso: new Date().toISOString()
    })),
    getById: vi.fn(() => Promise.resolve({
      id: "refund_1",
      shopId: "shop_1",
      status: "REQUESTED",
      reasonText: "Customer disputed charge",
      currency: "ZAR",
      createdAtIso: new Date().toISOString(),
      updatedAtIso: new Date().toISOString()
    })),
    updateStatus: vi.fn(() => Promise.resolve({
      id: "refund_1",
      shopId: "shop_1",
      status: "APPROVED",
      reasonText: "Customer disputed charge",
      currency: "ZAR",
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

import { POST } from "@/app/api/admin/refunds/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/refunds", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/admin/refunds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes refund.requested event", async () => {
    const response = await POST(makeRequest({
      stage: "REQUESTED",
      bookingId: "bk_1",
      amountCents: 10000,
      reasonText: "Customer disputed charge"
    }));

    expect(response.status).toBe(200);
    expect(logAuditEventMock).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "refund.requested"
    }), expect.any(Request));
  });

  it("writes refund.approved event", async () => {
    const response = await POST(makeRequest({
      stage: "APPROVED",
      refundId: "refund_1",
      reasonText: "Approved by owner"
    }));

    expect(response.status).toBe(200);
    expect(logAuditEventMock).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "refund.approved"
    }), expect.any(Request));
  });

  it("writes refund.processed event", async () => {
    const response = await POST(makeRequest({
      stage: "PROCESSED",
      refundId: "refund_1",
      reasonText: "Refund settled"
    }));

    expect(response.status).toBe(200);
    expect(logAuditEventMock).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "refund.processed"
    }), expect.any(Request));
  });
});
