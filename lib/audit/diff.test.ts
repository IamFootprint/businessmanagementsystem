import { describe, expect, it } from "vitest";
import { computeChangedFields } from "./diff";

describe("computeChangedFields", () => {
  it("returns changed nested keys for object updates", () => {
    const before = {
      status: "CONFIRMED",
      pricing: { calloutFeeCents: 25000, partsMarkupBps: 1000 },
      tags: ["weekday", "morning"]
    };
    const after = {
      status: "COMPLETED",
      pricing: { calloutFeeCents: 30000, partsMarkupBps: 1000 },
      tags: ["weekday", "afternoon"]
    };

    expect(computeChangedFields(before, after)).toEqual([
      "pricing.calloutFeeCents",
      "status",
      "tags[1]"
    ]);
  });

  it("marks root changed when comparing primitives", () => {
    expect(computeChangedFields("old", "new")).toEqual(["$root"]);
  });

  it("returns empty list when values are equivalent", () => {
    const current = { bookingRef: "BK-123", status: "CONFIRMED" };
    expect(computeChangedFields(current, { ...current })).toEqual([]);
  });
});
