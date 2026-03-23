import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { listPublicPackages } from "@/lib/catalog/publicPackages";
import { GET as availabilityGet } from "@/app/api/public/availability/route";
import { POST as quotePost } from "@/app/api/public/quote/route";
import {
  BookingsRepo,
  JobCardsRepo,
  ProfilesRepo,
  ensureJourneyProfiles,
  getDefaultShopId
} from "@/src/lib/store";

const runSmoke = process.env.RUN_SMOKE === "true";
const smokeTimeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 30000);

function nowPlusHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function toDateIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function nextWeekday(from: Date): Date {
  const d = new Date(from);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

describe("smoke: package booking flow", () => {
  const smokeCase = runSmoke ? it : it.skip;

  smokeCase("runs package catalog -> quote -> availability -> booking create", async () => {
    await ensureJourneyProfiles();
    const shopId = await getDefaultShopId();

    const packages = await listPublicPackages();
    assert(packages.length > 0, "Expected at least one package in catalog.");
    const pkg = packages[0];

    const quoteReq = new Request("http://localhost/api/public/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        itemType: "package",
        itemId: pkg.id,
        distanceKm: 12,
        addOnsCents: 5000,
        consumablesCents: 1000,
        partsCents: 2000,
        afterHours: false
      })
    });
    const quoteRes = await quotePost(quoteReq);
    assert.equal(quoteRes.status, 200, "Quote route failed.");
    const quoteJson = await quoteRes.json() as {
      lineItems: Array<{ code: string; label: string; amountCents: number }>;
      subtotalCents: number;
      totalCents: number;
      currency: "ZAR";
    };
    assert(quoteJson.totalCents > 0, "Quote total must be > 0.");

    const targetDate = toDateIso(nextWeekday(nowPlusHours(48)));
    const availabilityReq = new Request(
      `http://localhost/api/public/availability?date=${targetDate}&itemType=package&itemId=${pkg.id}`
    );
    const availabilityRes = await availabilityGet(availabilityReq);
    if (availabilityRes.status !== 200) {
      const errorPayload = await availabilityRes.json();
      throw new Error(`Availability route failed (${availabilityRes.status}): ${JSON.stringify(errorPayload)}`);
    }
    const availabilityBody = await availabilityRes.json() as {
      ok: boolean;
      data: { slots: Array<{ start: string; end: string; label: string }> };
    };
    const slots = availabilityBody.data?.slots ?? (availabilityBody as unknown as { slots: Array<{ start: string; end: string; label: string }> }).slots;
    assert(slots && slots.length > 0, "Expected availability slots.");
    const slotIso = slots[0].start;

    const customer = await ProfilesRepo.upsertByPhone({
      phone: "+27110000004",
      name: "Client User",
      role: "CUSTOMER",
      status: "ACTIVE",
      shopId
    });

    const booking = await BookingsRepo.create({
      customerProfileId: customer.id,
      customerName: customer.name || "Client User",
      customerPhone: customer.phone,
      serviceItemId: undefined,
      selectedPackageId: pkg.id,
      serviceNameSnapshot: pkg.name,
      addressLine1: "123 Test Street",
      suburb: "Sandton",
      city: "Johannesburg",
      notes: "Smoke booking",
      slotIso,
      status: "CONFIRMED",
      pricingSnapshot: quoteJson,
      shopId
    });
    assert.equal(booking.selectedPackageId, pkg.id, "Package id was not persisted on booking.");

    const jobCard = await JobCardsRepo.createFromBooking(
      booking,
      { id: null, durationMins: pkg.durationMinutes },
      null
    );
    assert.equal(jobCard.bookingId, booking.id, "Job card booking link mismatch.");
    assert.equal(jobCard.durationMinsSnapshot, pkg.durationMinutes, "Job card duration mismatch.");

    const fetched = await BookingsRepo.get(booking.ref);
    assert(fetched, "Created booking could not be fetched by reference.");
    assert.equal(fetched.selectedPackageId, pkg.id, "Fetched booking missing selectedPackageId.");
    assert.equal(fetched.pricingSnapshot?.totalCents, quoteJson.totalCents, "Snapshot mismatch.");
  }, smokeTimeoutMs);
});
