import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/guard", () => ({
  requireAdmin: vi.fn(() => Promise.resolve({ ok: true, shopId: "shop_1", role: "SHOP_OWNER" }))
}));

vi.mock("@/lib/audit/query", () => ({
  getAuditEventDetail: vi.fn(() => Promise.resolve(null))
}));

import { getAuditEventDetail } from "@/lib/audit/query";
import * as route from "@/app/api/admin/audit/[id]/route";

describe("/api/admin/audit/[id] mutability", () => {
  it("exposes no PUT/DELETE handlers", () => {
    expect((route as unknown as { PUT?: unknown }).PUT).toBeUndefined();
    expect((route as unknown as { DELETE?: unknown }).DELETE).toBeUndefined();
  });

  it("returns 404 when event is missing", async () => {
    const response = await route.GET(
      new Request("http://localhost/api/admin/audit/evt_1"),
      { params: { id: "evt_1" } }
    );

    expect(response.status).toBe(404);
  });

  it("masks sensitive payload fields by default", async () => {
    vi.mocked(getAuditEventDetail).mockResolvedValueOnce({
      id: "evt_1",
      occurredAt: new Date().toISOString(),
      recordedAt: new Date().toISOString(),
      eventName: "admin.sensitive_record.viewed",
      eventCategory: "security",
      severity: "warning",
      outcome: "success",
      actorType: "user",
      actorId: "user_1",
      actorDisplay: "+27110000001",
      actorRole: "ADMIN",
      targetType: "booking",
      targetId: "bk_1",
      targetDisplay: "bk_1",
      action: "view",
      subaction: null,
      reasonCode: null,
      reasonText: "call +27110000001",
      beforeJson: { customerPhone: "+27110000001", token: "abc" },
      afterJson: { customerEmail: "person@example.com" },
      changedFields: [],
      contextJson: { otp: "123456", customerPhone: "+27110000001" },
      requestId: "req_1",
      traceId: null,
      spanId: null,
      sessionId: null,
      ipAddress: null,
      userAgent: null,
      deviceId: null,
      channel: "admin_api",
      route: "/api/admin/audit/evt_1",
      httpMethod: "GET",
      tenantId: null,
      environment: "test",
      serviceName: "test",
      serviceVersion: null,
      isSensitive: true,
      retentionClass: "security",
      shopId: "shop_1"
    });

    const response = await route.GET(
      new Request("http://localhost/api/admin/audit/evt_1"),
      { params: { id: "evt_1" } }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.event.actorDisplay).toBe("+271******01");
    expect(body.data.event.beforeJson.customerPhone).not.toBe("+27110000001");
    expect(body.data.event.beforeJson.customerPhone).toContain("+271");
    expect(body.data.event.beforeJson.customerPhone).toContain("01");
    expect(body.data.event.beforeJson.token).toBe("[REDACTED]");
    expect(body.data.event.afterJson.customerEmail).not.toBe("person@example.com");
    expect(body.data.event.afterJson.customerEmail).toContain("@");
    expect(body.data.event.contextJson.otp).toBe("[REDACTED]");
  });
});
