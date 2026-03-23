import { beforeEach, describe, expect, it, vi } from "vitest";

const { logAuditEventMock } = vi.hoisted(() => ({
  logAuditEventMock: vi.fn(() => Promise.resolve())
}));
vi.mock("@/lib/audit/service", () => ({
  logAuditEvent: logAuditEventMock
}));

import { POST } from "@/app/api/webhooks/payments/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/webhooks/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/webhooks/payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes webhook received + succeeded + reconciled events for paid webhook", async () => {
    const response = await POST(makeRequest({
      provider: "PAYFAST",
      eventType: "payment.paid",
      providerReference: "pf_123",
      status: "PAID",
      bookingId: "bk_1",
      invoiceId: "inv_1"
    }));

    expect(response.status).toBe(200);
    expect(logAuditEventMock).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "payment.webhook.received"
    }), expect.any(Request));
    expect(logAuditEventMock).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "payment.succeeded"
    }), expect.any(Request));
    expect(logAuditEventMock).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "payment.reconciled"
    }), expect.any(Request));
  });

  it("writes payment.failed for failed webhook status", async () => {
    const response = await POST(makeRequest({
      provider: "YOCO",
      eventType: "payment.failed",
      providerReference: "yo_123",
      status: "FAILED",
      bookingId: "bk_2",
      invoiceId: "inv_2"
    }));

    expect(response.status).toBe(200);
    expect(logAuditEventMock).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "payment.failed",
      outcome: "failure"
    }), expect.any(Request));
  });

  it("writes failure audit for invalid payload", async () => {
    const response = await POST(makeRequest({ provider: "PAYFAST" }));

    expect(response.status).toBe(400);
    expect(logAuditEventMock).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "payment.webhook.received",
      outcome: "failure"
    }), expect.any(Request));
  });
});
