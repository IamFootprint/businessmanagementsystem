import { describe, expect, it } from "vitest";
import { maskEmail, maskPhone, redactAuditValue } from "./redaction";

describe("audit redaction", () => {
  it("masks contact values", () => {
    expect(maskPhone("+27110000002")).toMatch(/^\+271\*+/);
    expect(maskEmail("person@example.com")).toContain("@");
  });

  it("redacts secret keys and masks nested contact fields", () => {
    const payload = {
      password: "super-secret",
      authToken: "abc123",
      customer: {
        phone: "+27110000002",
        email: "person@example.com"
      },
      metadata: [{ sessionId: "sess_001", note: "ok" }]
    };

    const redacted = redactAuditValue(payload) as Record<string, unknown>;
    expect(redacted.password).toBe("[REDACTED]");
    expect(redacted.authToken).toBe("[REDACTED]");
    expect(String((redacted.customer as Record<string, unknown>).phone)).toContain("*");
    expect(String((redacted.customer as Record<string, unknown>).email)).toContain("@");
    expect((redacted.metadata as Array<Record<string, unknown>>)[0].sessionId).toBe("[REDACTED]");
  });
});
