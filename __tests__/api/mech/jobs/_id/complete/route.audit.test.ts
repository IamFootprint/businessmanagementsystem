import { beforeEach, describe, expect, it, vi } from "vitest";

const authProfile = {
  id: "prof_mech",
  phone: "+27110000003",
  role: "MECHANIC",
  shopId: "shop_1"
};

const baseCard = {
  id: "jc_1",
  ref: "JC-20260306-0001",
  bookingId: "bk_1",
  bookingRef: "BK-20260306-0001",
  serviceName: "Minor Service",
  customerName: "Test Rider",
  customerPhone: "+27110000020",
  status: "IN_PROGRESS",
  shopId: "shop_1",
  partsUsed: [],
  additionalCharges: [] as Array<{ approvalStatus?: string }>,
  completion: null
};

vi.mock("@/src/lib/auth/localSession", () => ({
  requireRole: vi.fn(() => Promise.resolve({ ok: true, profile: authProfile })),
  canAccessJobCard: vi.fn(() => Promise.resolve(true))
}));

vi.mock("@/src/lib/store", () => ({
  getJobCard: vi.fn(() => Promise.resolve(baseCard)),
  JobCardsRepo: {
    complete: vi.fn(() => Promise.resolve({
      ...baseCard,
      status: "COMPLETED",
      completion: {
        completedAtIso: new Date().toISOString(),
        customerSignoffName: "Test Rider",
        customerSignoffAccepted: true
      }
    })),
    addPart: vi.fn(() => Promise.resolve(null))
  },
  BookingsRepo: {
    get: vi.fn(() => Promise.resolve({
      id: "bk_1",
      ref: "BK-20260306-0001",
      status: "CONFIRMED",
      serviceItemId: "svc_1",
      selectedPackageId: null,
      pricingSnapshot: null,
      shopId: "shop_1"
    })),
    update: vi.fn(() => Promise.resolve({
      id: "bk_1",
      ref: "BK-20260306-0001",
      status: "COMPLETED",
      shopId: "shop_1"
    }))
  },
  InvoicesRepo: {
    getByJobCardId: vi.fn(() => Promise.resolve(null)),
    create: vi.fn(() => Promise.resolve({
      id: "inv_1",
      ref: "INV-20260306-0001",
      bookingId: "bk_1",
      bookingRef: "BK-20260306-0001",
      jobCardId: "jc_1",
      shopId: "shop_1",
      totalCents: 75000
    }))
  },
  ServiceItemsRepo: {
    get: vi.fn(() => Promise.resolve({ basePriceCents: 75000 }))
  }
}));

vi.mock("@/lib/catalog/publicPackages", () => ({
  getPublicPackageById: vi.fn(() => Promise.resolve(null))
}));

vi.mock("@/src/lib/workshop/statuses", () => ({
  assertJobCardTransition: vi.fn(() => ({ ok: true })),
  assertBookingTransition: vi.fn(() => ({ ok: true }))
}));

vi.mock("@/src/lib/workshop/inventory", () => ({
  applyInventoryUsage: vi.fn(() => Promise.resolve())
}));

const { logAuditMock, logAuditEventMock } = vi.hoisted(() => ({
  logAuditMock: vi.fn(() => Promise.resolve()),
  logAuditEventMock: vi.fn(() => Promise.resolve())
}));
vi.mock("@/lib/admin/audit", () => ({
  logAudit: logAuditMock
}));

vi.mock("@/lib/audit/service", () => ({
  logAuditEvent: logAuditEventMock
}));

vi.mock("@/src/lib/workshop/notifications", () => ({
  logNotificationEvent: vi.fn(() => Promise.resolve())
}));

import { POST } from "@/app/api/mech/jobs/[id]/complete/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/mech/jobs/jc_1/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/mech/jobs/[id]/complete audit integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes booking.status.changed and invoice.issued audit events", async () => {
    const response = await POST(makeRequest({
      customerName: "Test Rider",
      approved: true,
      summary: "Completed",
      checklist: {
        intakeDone: true,
        washDone: true,
        drivetrain: true,
        brakes: true,
        wheels: true,
        suspension: true,
        torqueCheck: true,
        testRide: true
      }
    }), { params: { id: "jc_1" } });

    expect(response.status).toBe(200);
    expect(logAuditEventMock).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "booking.status.changed"
    }), expect.any(Request));
    expect(logAuditEventMock).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "invoice.issued"
    }), expect.any(Request));
  });
});
