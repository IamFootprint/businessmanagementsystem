import { describe, it, expect, beforeEach, vi } from "vitest";

// Force memory-only mode before importing localStore
vi.mock("@/src/lib/store/fsStore", () => ({
  getDataDir: () => "/tmp/test-data",
  ensureDir: async () => null,
  readJson: async (_path: string, fallback: unknown) => fallback,
  writeJsonAtomic: async () => {},
  isMemoryOnly: () => true,
  setMemoryOnly: () => {},
  resolveDataFile: (f: string) => `/tmp/test-data/${f}`,
}));

// We need a fresh store for each test suite, so we use dynamic import
// after mocking. The mock ensures we stay in memory-only mode.
let store: typeof import("./localStore");
const TEST_SHOP_ID = "shop_test_default";

beforeEach(async () => {
  vi.resetModules();
  store = await import("./localStore");
});

describe("ProfilesRepo", () => {
  it("creates a profile via upsertByPhone", async () => {
    const profile = await store.ProfilesRepo.upsertByPhone({
      phone: "+27821111111",
      name: "Test User",
      role: "CUSTOMER",
    });
    expect(profile.id).toMatch(/^prof_/);
    expect(profile.phone).toBe("+27821111111");
    expect(profile.name).toBe("Test User");
    expect(profile.role).toBe("CUSTOMER");
    expect(profile.status).toBe("ACTIVE");
  });

  it("updates existing profile on second upsert", async () => {
    await store.ProfilesRepo.upsertByPhone({
      phone: "+27822222222",
      name: "First",
      role: "CUSTOMER",
    });
    const updated = await store.ProfilesRepo.upsertByPhone({
      phone: "+27822222222",
      name: "Updated",
      role: "MECHANIC",
    });
    expect(updated.name).toBe("Updated");
    expect(updated.role).toBe("MECHANIC");
  });

  it("getByPhone returns null for missing profile", async () => {
    const result = await store.ProfilesRepo.getByPhone("+27000000000");
    expect(result).toBeNull();
  });

  it("getById returns the correct profile", async () => {
    const created = await store.ProfilesRepo.upsertByPhone({
      phone: "+27823333333",
      name: "FindMe",
      role: "ADMIN",
    });
    const found = await store.ProfilesRepo.getById(created.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("FindMe");
  });

  it("setStatus changes profile status", async () => {
    const created = await store.ProfilesRepo.upsertByPhone({
      phone: "+27824444444",
      name: "StatusTest",
      role: "MECHANIC",
    });
    const updated = await store.ProfilesRepo.setStatus(created.id, "INACTIVE");
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("INACTIVE");
  });

  it("listMechanics only returns mechanics", async () => {
    await store.ProfilesRepo.upsertByPhone({ phone: "+27825555555", name: "Mech", role: "MECHANIC" });
    await store.ProfilesRepo.upsertByPhone({ phone: "+27825555556", name: "Cust", role: "CUSTOMER" });
    const mechs = await store.ProfilesRepo.listMechanics();
    expect(mechs.every((m) => m.role === "MECHANIC")).toBe(true);
  });
});

describe("SessionsRepo", () => {
  it("creates and retrieves a session", async () => {
    const profile = await store.ProfilesRepo.upsertByPhone({
      phone: "+27826666666",
      name: "SessionUser",
      role: "CUSTOMER",
    });
    const session = await store.SessionsRepo.create(profile.id, 60);
    expect(session.id).toMatch(/^sess_/);
    expect(session.profileId).toBe(profile.id);

    const retrieved = await store.SessionsRepo.get(session.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.profileId).toBe(profile.id);
  });

  it("returns null for expired session", async () => {
    const profile = await store.ProfilesRepo.upsertByPhone({
      phone: "+27827777777",
      name: "ExpireUser",
      role: "CUSTOMER",
    });
    // Create session with 0 minutes TTL (already expired)
    const session = await store.SessionsRepo.create(profile.id, -1);
    const retrieved = await store.SessionsRepo.get(session.id);
    expect(retrieved).toBeNull();
  });

  it("removes a session", async () => {
    const profile = await store.ProfilesRepo.upsertByPhone({
      phone: "+27828888888",
      name: "RemoveUser",
      role: "CUSTOMER",
    });
    const session = await store.SessionsRepo.create(profile.id, 60);
    await store.SessionsRepo.remove(session.id);
    const result = await store.SessionsRepo.get(session.id);
    expect(result).toBeNull();
  });
});

describe("getProfileForSession", () => {
  it("returns profile for valid session", async () => {
    const profile = await store.ProfilesRepo.upsertByPhone({
      phone: "+27829999999",
      name: "ProfileSession",
      role: "ADMIN",
    });
    const session = await store.SessionsRepo.create(profile.id, 60);
    const result = await store.getProfileForSession(session.id);
    expect(result).not.toBeNull();
    expect(result!.phone).toBe("+27829999999");
  });

  it("returns null for invalid session", async () => {
    const result = await store.getProfileForSession("nonexistent");
    expect(result).toBeNull();
  });
});

describe("ServiceItemsRepo", () => {
  it("creates and lists service items sorted by sortOrder", async () => {
    await store.ServiceItemsRepo.create({
      name: "Service B",
      basePriceCents: 20000,
      durationMins: 60,
      isActive: true,
      sortOrder: 2,
      shopId: TEST_SHOP_ID,
    });
    await store.ServiceItemsRepo.create({
      name: "Service A",
      basePriceCents: 10000,
      durationMins: 30,
      isActive: true,
      sortOrder: 1,
      shopId: TEST_SHOP_ID,
    });
    const items = await store.ServiceItemsRepo.list();
    expect(items.length).toBeGreaterThanOrEqual(2);
    const sortOrders = items.map((i) => i.sortOrder);
    expect(sortOrders).toEqual([...sortOrders].sort((a, b) => a - b));
  });

  it("listActive filters inactive items", async () => {
    await store.ServiceItemsRepo.create({
      name: "Inactive Svc",
      basePriceCents: 5000,
      durationMins: 15,
      isActive: false,
      sortOrder: 99,
      shopId: TEST_SHOP_ID,
    });
    const active = await store.ServiceItemsRepo.listActive();
    expect(active.every((i) => i.isActive)).toBe(true);
  });

  it("updates a service item", async () => {
    const item = await store.ServiceItemsRepo.create({
      name: "UpdateMe",
      basePriceCents: 10000,
      durationMins: 30,
      isActive: true,
      sortOrder: 10,
      shopId: TEST_SHOP_ID,
    });
    const updated = await store.ServiceItemsRepo.update(item.id, { name: "Updated Name" });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("Updated Name");
  });

  it("toggle changes isActive", async () => {
    const item = await store.ServiceItemsRepo.create({
      name: "ToggleMe",
      basePriceCents: 10000,
      durationMins: 30,
      isActive: true,
      sortOrder: 11,
      shopId: TEST_SHOP_ID,
    });
    const toggled = await store.ServiceItemsRepo.toggle(item.id, false);
    expect(toggled!.isActive).toBe(false);
  });
});

describe("BookingsRepo", () => {
  it("creates a booking with auto-generated id and ref", async () => {
    const booking = await store.BookingsRepo.create({
      customerName: "John",
      customerPhone: "+27821111111",
      serviceItemId: "svc_123",
      serviceNameSnapshot: "Tune-up",
      addressLine1: "123 Main St",
      slotIso: new Date().toISOString(),
      status: "DRAFT",
      shopId: TEST_SHOP_ID,
    });
    expect(booking.id).toMatch(/^bk_/);
    expect(booking.ref).toMatch(/^BK-\d{8}-\d{4}$/);
    expect(booking.status).toBe("DRAFT");
  });

  it("retrieves booking by id or ref", async () => {
    const booking = await store.BookingsRepo.create({
      customerName: "Jane",
      customerPhone: "+27822222222",
      serviceItemId: "svc_456",
      serviceNameSnapshot: "Service",
      addressLine1: "456 Oak Ave",
      slotIso: new Date().toISOString(),
      status: "CONFIRMED",
      shopId: TEST_SHOP_ID,
    });
    const byId = await store.BookingsRepo.get(booking.id);
    expect(byId).not.toBeNull();
    const byRef = await store.BookingsRepo.get(booking.ref);
    expect(byRef).not.toBeNull();
    expect(byId!.id).toBe(byRef!.id);
  });

  it("updates booking status", async () => {
    const booking = await store.BookingsRepo.create({
      customerName: "Status",
      customerPhone: "+27823333333",
      serviceItemId: "svc_789",
      serviceNameSnapshot: "Svc",
      addressLine1: "789 Elm",
      slotIso: new Date().toISOString(),
      status: "DRAFT",
      shopId: TEST_SHOP_ID,
    });
    const updated = await store.BookingsRepo.update(booking.id, { status: "CONFIRMED" });
    expect(updated!.status).toBe("CONFIRMED");
  });

  it("listByCustomer filters correctly", async () => {
    const profile = await store.ProfilesRepo.upsertByPhone({
      phone: "+27824444444",
      name: "CustBooking",
      role: "CUSTOMER",
    });
    await store.BookingsRepo.create({
      customerProfileId: profile.id,
      customerName: "CustBooking",
      customerPhone: "+27824444444",
      serviceItemId: "svc_1",
      serviceNameSnapshot: "Svc",
      addressLine1: "1 St",
      slotIso: new Date().toISOString(),
      status: "DRAFT",
      shopId: TEST_SHOP_ID,
    });
    const list = await store.BookingsRepo.listByCustomer(profile.id);
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.every((b) => b.customerProfileId === profile.id)).toBe(true);
  });
});

describe("JobCardsRepo", () => {
  it("creates a job card from a booking", async () => {
    const booking = await store.BookingsRepo.create({
      customerName: "JC Test",
      customerPhone: "+27825555555",
      serviceItemId: "svc_jc",
      serviceNameSnapshot: "Minor Tune-up",
      addressLine1: "10 JC Road",
      slotIso: "2025-01-15T09:00:00.000Z",
      status: "CONFIRMED",
      shopId: TEST_SHOP_ID,
    });
    const service = {
      id: "svc_jc",
      name: "Minor Tune-up",
      basePriceCents: 85000,
      durationMins: 90,
      isActive: true,
      sortOrder: 1,
      shopId: TEST_SHOP_ID,
      createdAtIso: new Date().toISOString(),
      updatedAtIso: new Date().toISOString(),
    };
    const card = await store.JobCardsRepo.createFromBooking(booking, service, null);
    expect(card.id).toMatch(/^jc_/);
    expect(card.ref).toMatch(/^JC-/);
    expect(card.bookingId).toBe(booking.id);
    expect(card.status).toBe("SCHEDULED");
    expect(card.durationMinsSnapshot).toBe(90);
  });

  it("updates job card status", async () => {
    const booking = await store.BookingsRepo.create({
      customerName: "Status JC",
      customerPhone: "+27826666666",
      serviceItemId: "svc_st",
      serviceNameSnapshot: "Service",
      addressLine1: "20 Road",
      slotIso: "2025-01-15T09:00:00.000Z",
      status: "CONFIRMED",
      shopId: TEST_SHOP_ID,
    });
    const service = {
      id: "svc_st", name: "Service", basePriceCents: 10000, durationMins: 60,
      isActive: true, sortOrder: 1, shopId: TEST_SHOP_ID, createdAtIso: new Date().toISOString(), updatedAtIso: new Date().toISOString(),
    };
    const card = await store.JobCardsRepo.createFromBooking(booking, service, null);
    const updated = await store.JobCardsRepo.updateStatus(card.id, "IN_PROGRESS");
    expect(updated!.status).toBe("IN_PROGRESS");
  });

  it("adds notes to a job card", async () => {
    const booking = await store.BookingsRepo.create({
      customerName: "Notes JC",
      customerPhone: "+27827777777",
      serviceItemId: "svc_n",
      serviceNameSnapshot: "Svc",
      addressLine1: "30 Rd",
      slotIso: "2025-01-15T09:00:00.000Z",
      status: "CONFIRMED",
      shopId: TEST_SHOP_ID,
    });
    const service = {
      id: "svc_n", name: "Svc", basePriceCents: 10000, durationMins: 60,
      isActive: true, sortOrder: 1, shopId: TEST_SHOP_ID, createdAtIso: new Date().toISOString(), updatedAtIso: new Date().toISOString(),
    };
    const card = await store.JobCardsRepo.createFromBooking(booking, service, null);
    const updated = await store.JobCardsRepo.addNote(card.id, {
      id: "note_1",
      atIso: new Date().toISOString(),
      text: "Customer arrived",
    });
    expect(updated!.notes.length).toBeGreaterThanOrEqual(1);
    expect(updated!.notes.some((n) => n.text === "Customer arrived")).toBe(true);
  });

  it("adds parts to a job card", async () => {
    const booking = await store.BookingsRepo.create({
      customerName: "Parts JC",
      customerPhone: "+27828888888",
      serviceItemId: "svc_p",
      serviceNameSnapshot: "Svc",
      addressLine1: "40 Rd",
      slotIso: "2025-01-15T09:00:00.000Z",
      status: "CONFIRMED",
      shopId: TEST_SHOP_ID,
    });
    const service = {
      id: "svc_p", name: "Svc", basePriceCents: 10000, durationMins: 60,
      isActive: true, sortOrder: 1, shopId: TEST_SHOP_ID, createdAtIso: new Date().toISOString(), updatedAtIso: new Date().toISOString(),
    };
    const card = await store.JobCardsRepo.createFromBooking(booking, service, null);
    const updated = await store.JobCardsRepo.addPart(card.id, {
      id: "part_1",
      name: "Brake pad",
      brand: "Shimano",
      qty: 2,
      unitPriceCents: 15000,
    });
    expect(updated!.partsUsed.length).toBe(1);
    expect(updated!.partsUsed[0].name).toBe("Brake pad");
  });

  it("completes a job card", async () => {
    const booking = await store.BookingsRepo.create({
      customerName: "Complete JC",
      customerPhone: "+27829999999",
      serviceItemId: "svc_c",
      serviceNameSnapshot: "Svc",
      addressLine1: "50 Rd",
      slotIso: "2025-01-15T09:00:00.000Z",
      status: "CONFIRMED",
      shopId: TEST_SHOP_ID,
    });
    const service = {
      id: "svc_c", name: "Svc", basePriceCents: 10000, durationMins: 60,
      isActive: true, sortOrder: 1, shopId: TEST_SHOP_ID, createdAtIso: new Date().toISOString(), updatedAtIso: new Date().toISOString(),
    };
    const card = await store.JobCardsRepo.createFromBooking(booking, service, null);
    const completed = await store.JobCardsRepo.complete(card.id, {
      completedAtIso: new Date().toISOString(),
      summary: "All good",
      customerSignoffName: "Complete JC",
      customerSignoffAccepted: true,
    });
    expect(completed!.status).toBe("COMPLETED");
    expect(completed!.completion?.summary).toBe("All good");
  });
});

describe("InvoicesRepo", () => {
  it("creates and retrieves an invoice", async () => {
    const invoice = await store.InvoicesRepo.create({
      shopId: TEST_SHOP_ID,
      jobCardId: "jc_test",
      bookingId: "bk_test",
      bookingRef: "BK-20250115-0001",
      customerName: "Invoice User",
      customerPhone: "+27821010101",
      issuedAtIso: new Date().toISOString(),
      issuedByProfileId: "prof_test",
      status: "ISSUED",
      lineItems: [
        { id: "li_1", label: "Labour", amountCents: 85000, qty: 1, type: "LABOUR" },
      ],
      subtotalCents: 85000,
      totalCents: 85000,
    });
    expect(invoice.id).toMatch(/^inv_/);
    expect(invoice.ref).toMatch(/^INV-/);

    const byId = await store.InvoicesRepo.get(invoice.id);
    expect(byId).not.toBeNull();

    const byJobCard = await store.InvoicesRepo.getByJobCardId("jc_test");
    expect(byJobCard).not.toBeNull();
    expect(byJobCard!.id).toBe(invoice.id);
  });
});

describe("RatingsRepo", () => {
  it("creates and retrieves a rating", async () => {
    const rating = await store.RatingsRepo.create({
      bookingId: "bk_rate_1",
      customerProfileId: "prof_rate_1",
      rating: 5,
      comment: "Excellent!",
    });
    expect(rating.id).toMatch(/^rat_/);
    expect(rating.rating).toBe(5);

    const found = await store.RatingsRepo.getByBookingId("bk_rate_1");
    expect(found).not.toBeNull();
    expect(found!.comment).toBe("Excellent!");
  });

  it("prevents duplicate ratings for same booking", async () => {
    await store.RatingsRepo.create({
      bookingId: "bk_rate_dup",
      customerProfileId: "prof_dup",
      rating: 4,
    });
    const dup = await store.RatingsRepo.create({
      bookingId: "bk_rate_dup",
      customerProfileId: "prof_dup",
      rating: 2,
    });
    // Should return existing, not create new
    expect(dup.rating).toBe(4);
  });
});

describe("InvitesRepo", () => {
  it("creates an invite with token", async () => {
    const invite = await store.InvitesRepo.create({
      phone: "+27820001111",
      name: "New Mechanic",
      shopId: TEST_SHOP_ID,
    });
    expect(invite.id).toMatch(/^inv_/);
    expect(invite.token).toBeTruthy();
    expect(invite.role).toBe("MECHANIC");
  });

  it("consumes an invite and creates a mechanic profile", async () => {
    const invite = await store.InvitesRepo.create({
      phone: "+27820002222",
      name: "Invited Mech",
      shopId: TEST_SHOP_ID,
    });
    const result = await store.InvitesRepo.consume(invite.token);
    expect(result.invite).not.toBeNull();
    expect(result.profile).not.toBeNull();
    expect(result.profile!.role).toBe("MECHANIC");

    // Consuming again returns invite but null profile (already used)
    const again = await store.InvitesRepo.consume(invite.token);
    expect(again.invite).not.toBeNull();
    expect(again.profile).toBeNull();
  });

  it("returns nulls for invalid token", async () => {
    const result = await store.InvitesRepo.consume("nonexistent_token");
    expect(result.invite).toBeNull();
    expect(result.profile).toBeNull();
  });
});

describe("BikesRepo", () => {
  it("creates, lists, updates, and removes bikes", async () => {
    const bike = await store.BikesRepo.create({
      customerProfileId: "prof_bike_1",
      bikeType: "MTB",
      brand: "Specialized",
      model: "Stumpjumper",
      eBike: false,
    });
    expect(bike.id).toMatch(/^bike_/);

    const list = await store.BikesRepo.listByCustomer("prof_bike_1");
    expect(list.length).toBe(1);

    const updated = await store.BikesRepo.update(bike.id, { model: "Epic" });
    expect(updated!.model).toBe("Epic");

    const removed = await store.BikesRepo.remove(bike.id);
    expect(removed).toBe(true);

    const afterRemove = await store.BikesRepo.listByCustomer("prof_bike_1");
    expect(afterRemove.length).toBe(0);
  });
});

describe("ChatThreadsRepo", () => {
  it("creates a thread on first access", async () => {
    const thread = await store.ChatThreadsRepo.getOrCreateForCustomer("prof_chat_1");
    expect(thread.id).toMatch(/^thread_/);
    expect(thread.messages).toEqual([]);
  });

  it("returns existing thread on second access", async () => {
    const first = await store.ChatThreadsRepo.getOrCreateForCustomer("prof_chat_2");
    const second = await store.ChatThreadsRepo.getOrCreateForCustomer("prof_chat_2");
    expect(first.id).toBe(second.id);
  });

  it("appends messages", async () => {
    const thread = await store.ChatThreadsRepo.getOrCreateForCustomer("prof_chat_3");
    const updated = await store.ChatThreadsRepo.appendMessage(thread.id, {
      id: "msg_1",
      atIso: new Date().toISOString(),
      role: "USER",
      text: "Hello",
    });
    expect(updated!.messages.length).toBe(1);
    expect(updated!.messages[0].text).toBe("Hello");
  });
});

describe("toDateIso", () => {
  it("formats a date in Africa/Johannesburg timezone", () => {
    // 2025-01-15 at midnight UTC → 2025-01-15 in SAST (UTC+2)
    const result = store.toDateIso("2025-01-15T00:00:00.000Z");
    expect(result).toBe("2025-01-15");
  });

  it("handles timezone offset correctly", () => {
    // 2025-01-14 at 22:30 UTC → 2025-01-15 00:30 SAST
    const result = store.toDateIso("2025-01-14T22:30:00.000Z");
    expect(result).toBe("2025-01-15");
  });
});
