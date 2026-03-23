import { describe, expect, it } from "vitest";
import { normalizeAuditEventInput } from "./service";

describe("normalizeAuditEventInput", () => {
  it("normalizes defaults and computes changed fields", () => {
    const request = new Request("http://localhost/api/admin/pricing", {
      method: "PUT",
      headers: {
        "x-request-id": "req_test_123",
        "user-agent": "vitest"
      }
    });

    const normalized = normalizeAuditEventInput(
      {
        eventName: "pricing.rule.updated",
        actor: { id: "user_1", display: "+27110000002", role: "SHOP_OWNER" },
        target: { type: "pricing_rule", id: "pricing_rule_default" },
        beforeJson: { calloutFeeCents: 25000 },
        afterJson: { calloutFeeCents: 30000 },
        contextJson: { adminPhone: "+27110000002" }
      },
      request
    );

    expect(normalized.eventCategory).toBe("pricing");
    expect(normalized.action).toBe("updated");
    expect(normalized.requestId).toBe("req_test_123");
    expect(normalized.changedFields).toEqual(["calloutFeeCents"]);
    expect(String((normalized.contextJson as Record<string, unknown>).adminPhone)).toContain("*");
  });

  it("keeps explicit changedFields when supplied", () => {
    const normalized = normalizeAuditEventInput({
      eventName: "booking.same_day_override.applied",
      eventCategory: "booking",
      changedFields: ["slotIso", "reasonText"],
      reasonText: "Customer requested urgent rescue"
    });

    expect(normalized.changedFields).toEqual(["reasonText", "slotIso"]);
    expect(normalized.reasonText).toBe("Customer requested urgent rescue");
  });
});
