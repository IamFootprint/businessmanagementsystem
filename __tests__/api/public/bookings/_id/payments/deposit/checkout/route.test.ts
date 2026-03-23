import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/auth/localSession", () => ({
  requireRole: vi.fn(() => Promise.resolve({
    ok: true,
    profile: {
      id: "profile_1",
      phone: "+27110000001",
      role: "CLIENT",
      shopId: "shop_1"
    }
  })),
  canAccessBooking: vi.fn(() => Promise.resolve(true))
}));

vi.mock("@/src/lib/store", () => ({
  BookingsRepo: {
    get: vi.fn(() => Promise.resolve({
      id: "bk_1",
      ref: "BK-001",
      customerProfileId: "profile_1",
      shopId: "shop_1",
      status: "DRAFT",
      pricingSnapshot: { totalCents: 40000 }
    }))
  }
}));

vi.mock("@/lib/planned-events/store", () => ({
  PaymentInitiationsRepo: {
    create: vi.fn(() => Promise.resolve({
      id: "pay_1",
      provider: "PAYFAST",
      amountCents: 20000,
      currency: "ZAR"
    }))
  }
}));

const { logAuditEventMock } = vi.hoisted(() => ({
  logAuditEventMock: vi.fn(() => Promise.resolve())
}));
vi.mock("@/lib/audit/service", () => ({
  logAuditEvent: logAuditEventMock
}));

import { POST } from "@/app/api/public/bookings/[id]/payments/deposit/checkout/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/public/bookings/bk_1/payments/deposit/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/public/bookings/[id]/payments/deposit/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes payment.initiated for valid checkout payload", async () => {
    const response = await POST(makeRequest({ provider: "PAYFAST" }), { params: { id: "bk_1" } });

    expect(response.status).toBe(200);
    expect(logAuditEventMock).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "payment.initiated"
    }), expect.any(Request));
  });

  it("writes payment.failed for invalid payload", async () => {
    const response = await POST(makeRequest({ provider: "INVALID_PROVIDER" }), { params: { id: "bk_1" } });

    expect(response.status).toBe(400);
    expect(logAuditEventMock).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "payment.failed",
      outcome: "failure"
    }), expect.any(Request));
  });
});
