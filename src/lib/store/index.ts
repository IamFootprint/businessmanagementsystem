/**
 * Data source abstraction layer.
 *
 * DATA_MODE env var controls which store backs the app:
 *   "prisma"  → PostgreSQL via Prisma (production / Supabase)
 *   "local"   → JSON files on disk (local dev, default)
 *
 * All consumer code should import from this file, never from
 * localStore or prismaStore directly.
 */

const usePrisma = process.env.DATA_MODE === "prisma";

// Re-export types (always from localStore — they're the canonical definitions)
export type {
  ProfileRole, ProfileStatus, OnboardingStatus, ProfileConsent, NotificationPreferences, ProfileRecord,
  ShopStatus, AssignmentMode, ShopBusinessDetails, ShopOperationalDefaults, ServiceModels,
  InviteRecord, SessionRecord,
  ServiceItemRecord,
  BikeRecord,
  ChatMessageRole, ChatMessageRecord, ChatThreadRecord,
  BookingStatus, BookingRecord,
  JobCardStatus, JobCardNote, JobCardChecklist, JobCardPart,
  JobCardAdditionalCharge, JobCardCompletion, JobCardRecord,
  InvoiceLineItem, InvoiceRecord,
  RatingRecord,
  ShopRecord,
  SupportTicketCategory, SupportTicketPriority, SupportTicketStatus,
  SupportTicketNote, SupportTicketRecord,
  TravelBandRule, PricingRuleRecord,
  AvailabilityBlockRecord,
  LeadRecord
} from "./localStore";

// Conditional re-exports
async function loadModule() {
  if (usePrisma) {
    return await import("./prismaStore");
  }
  return await import("./localStore");
}

// We use a lazy-init pattern so the import happens once
let _mod: Awaited<ReturnType<typeof loadModule>> | null = null;
async function mod() {
  if (!_mod) _mod = await loadModule();
  return _mod;
}

// ─── Shop facade ──────────────────────────────────────────────────────────────

export const ShopRepo = {
  getById: async (id: string) => (await mod()).ShopRepo.getById(id),
  getBySlug: async (slug: string) => (await mod()).ShopRepo.getBySlug(slug),
  getByDomain: async (hostname: string) => (await mod()).ShopRepo.getByDomain(hostname),
  getDefault: async () => (await mod()).ShopRepo.getDefault(),
  list: async () => (await mod()).ShopRepo.list(),
  create: async (input: Parameters<typeof import("./localStore").ShopRepo.create>[0]) => (await mod()).ShopRepo.create(input),
  update: async (id: string, updates: Parameters<typeof import("./localStore").ShopRepo.update>[1]) => (await mod()).ShopRepo.update(id, updates)
};

export async function getDefaultShopId() {
  return (await mod()).getDefaultShopId();
}

// ─── Repo facades ─────────────────────────────────────────────────────────────

export const ProfilesRepo = {
  list: async (shopId?: string) => (await mod()).ProfilesRepo.list(shopId),
  getById: async (id: string) => (await mod()).ProfilesRepo.getById(id),
  getByPhone: async (phone: string) => (await mod()).ProfilesRepo.getByPhone(phone),
  upsertByPhone: async (input: Parameters<typeof import("./localStore").ProfilesRepo.upsertByPhone>[0]) => (await mod()).ProfilesRepo.upsertByPhone(input),
  setStatus: async (id: string, status: import("./localStore").ProfileStatus) => (await mod()).ProfilesRepo.setStatus(id, status),
  update: async (id: string, updates: Parameters<typeof import("./localStore").ProfilesRepo.update>[1]) => (await mod()).ProfilesRepo.update(id, updates),
  listMechanics: async (shopId?: string) => (await mod()).ProfilesRepo.listMechanics(shopId),
  getDefaultMechanic: async (shopId?: string) => (await mod()).ProfilesRepo.getDefaultMechanic(shopId)
};

export const InvitesRepo = {
  list: async (shopId?: string) => (await mod()).InvitesRepo.list(shopId),
  create: async (input: { phone: string; name?: string; shopId: string; role?: "MECHANIC" | "CLIENT" }) => (await mod()).InvitesRepo.create(input),
  consume: async (token: string) => (await mod()).InvitesRepo.consume(token)
};

export const SessionsRepo = {
  create: async (profileId: string, ttlMinutes: number) => (await mod()).SessionsRepo.create(profileId, ttlMinutes),
  get: async (id: string) => (await mod()).SessionsRepo.get(id),
  remove: async (id: string) => (await mod()).SessionsRepo.remove(id)
};

export const ServiceItemsRepo = {
  list: async (shopId?: string) => (await mod()).ServiceItemsRepo.list(shopId),
  listActive: async (shopId?: string) => (await mod()).ServiceItemsRepo.listActive(shopId),
  get: async (id: string) => (await mod()).ServiceItemsRepo.get(id),
  create: async (input: Parameters<typeof import("./localStore").ServiceItemsRepo.create>[0]) => (await mod()).ServiceItemsRepo.create(input),
  update: async (id: string, updates: Parameters<typeof import("./localStore").ServiceItemsRepo.update>[1]) => (await mod()).ServiceItemsRepo.update(id, updates),
  toggle: async (id: string, isActive: boolean) => (await mod()).ServiceItemsRepo.toggle(id, isActive)
};

export const BikesRepo = {
  listByCustomer: async (id: string) => (await mod()).BikesRepo.listByCustomer(id),
  getById: async (id: string) => (await mod()).BikesRepo.getById(id),
  create: async (input: Parameters<typeof import("./localStore").BikesRepo.create>[0]) => (await mod()).BikesRepo.create(input),
  update: async (id: string, updates: Parameters<typeof import("./localStore").BikesRepo.update>[1]) => (await mod()).BikesRepo.update(id, updates),
  remove: async (id: string) => (await mod()).BikesRepo.remove(id)
};

export const ChatThreadsRepo = {
  listByCustomer: async (id: string) => (await mod()).ChatThreadsRepo.listByCustomer(id),
  getById: async (id: string) => (await mod()).ChatThreadsRepo.getById(id),
  getOrCreateForCustomer: async (id: string) => (await mod()).ChatThreadsRepo.getOrCreateForCustomer(id),
  appendMessage: async (threadId: string, msg: import("./localStore").ChatMessageRecord) => (await mod()).ChatThreadsRepo.appendMessage(threadId, msg)
};

export const BookingsRepo = {
  list: async (shopId?: string) => (await mod()).BookingsRepo.list(shopId),
  get: async (idOrRef: string) => (await mod()).BookingsRepo.get(idOrRef),
  listByCustomer: async (profileId: string) => (await mod()).BookingsRepo.listByCustomer(profileId),
  create: async (input: Parameters<typeof import("./localStore").BookingsRepo.create>[0]) => (await mod()).BookingsRepo.create(input),
  update: async (id: string, updates: Parameters<typeof import("./localStore").BookingsRepo.update>[1]) => (await mod()).BookingsRepo.update(id, updates)
};

export const JobCardsRepo = {
  list: async (shopId?: string) => (await mod()).JobCardsRepo.list(shopId),
  get: async (idOrRef: string) => (await mod()).JobCardsRepo.get(idOrRef),
  listByDate: async (dateIso: string, shopId?: string) => (await mod()).JobCardsRepo.listByDate(dateIso, shopId),
  listByMechanicAndDate: async (mechanicId: string, dateIso: string, shopId?: string) => (await mod()).JobCardsRepo.listByMechanicAndDate(mechanicId, dateIso, shopId),
  listByMechanicInRange: async (mechanicId: string, from: string, to: string) => (await mod()).JobCardsRepo.listByMechanicInRange(mechanicId, from, to),
  listInProgressByMechanic: async (mechanicId: string) => (await mod()).JobCardsRepo.listInProgressByMechanic(mechanicId),
  createFromBooking: async (...args: Parameters<typeof import("./localStore").JobCardsRepo.createFromBooking>) => (await mod()).JobCardsRepo.createFromBooking(...args),
  updateStatus: async (id: string, status: import("./localStore").JobCardStatus) => (await mod()).JobCardsRepo.updateStatus(id, status),
  reassignMechanic: async (id: string, mechanicId?: string | null) => (await mod()).JobCardsRepo.reassignMechanic(id, mechanicId),
  reschedule: async (id: string, slotIso: string) => (await mod()).JobCardsRepo.reschedule(id, slotIso),
  updateChecklist: async (id: string, checklist: import("./localStore").JobCardChecklist) => (await mod()).JobCardsRepo.updateChecklist(id, checklist),
  addNote: async (id: string, note: import("./localStore").JobCardNote) => (await mod()).JobCardsRepo.addNote(id, note),
  addPart: async (id: string, part: import("./localStore").JobCardPart) => (await mod()).JobCardsRepo.addPart(id, part),
  addAdditionalCharge: async (id: string, charge: import("./localStore").JobCardAdditionalCharge) => (await mod()).JobCardsRepo.addAdditionalCharge(id, charge),
  decideAdditionalCharge: async (
    id: string,
    chargeId: string,
    decision: "APPROVED" | "REJECTED",
    decidedByProfileId?: string
  ) => (await mod()).JobCardsRepo.decideAdditionalCharge(id, chargeId, decision, decidedByProfileId),
  complete: async (id: string, completion: import("./localStore").JobCardCompletion) => (await mod()).JobCardsRepo.complete(id, completion)
};

export const InvoicesRepo = {
  list: async (shopId?: string) => (await mod()).InvoicesRepo.list(shopId),
  get: async (idOrRef: string) => (await mod()).InvoicesRepo.get(idOrRef),
  getByJobCardId: async (jobCardId: string) => (await mod()).InvoicesRepo.getByJobCardId(jobCardId),
  create: async (input: Parameters<typeof import("./localStore").InvoicesRepo.create>[0]) => (await mod()).InvoicesRepo.create(input)
};

export const RatingsRepo = {
  getByBookingId: async (bookingId: string) => (await mod()).RatingsRepo.getByBookingId(bookingId),
  create: async (input: Parameters<typeof import("./localStore").RatingsRepo.create>[0]) => (await mod()).RatingsRepo.create(input),
  list: async (shopId?: string) => (await mod()).RatingsRepo.list(shopId)
};

export const SupportTicketsRepo = {
  list: async (shopId?: string) => (await mod()).SupportTicketsRepo.list(shopId),
  get: async (id: string) => (await mod()).SupportTicketsRepo.get(id),
  create: async (input: Parameters<typeof import("./localStore").SupportTicketsRepo.create>[0]) => (await mod()).SupportTicketsRepo.create(input),
  update: async (id: string, updates: Parameters<typeof import("./localStore").SupportTicketsRepo.update>[1]) => (await mod()).SupportTicketsRepo.update(id, updates),
  addNote: async (id: string, note: { authorName: string; text: string }) => (await mod()).SupportTicketsRepo.addNote(id, note)
};

export const PricingRulesRepo = {
  getActive: async (shopId?: string) => (await mod()).PricingRulesRepo.getActive(shopId),
  upsert: async (input: Parameters<typeof import("./localStore").PricingRulesRepo.upsert>[0]) => (await mod()).PricingRulesRepo.upsert(input)
};

export const AvailabilityBlocksRepo = {
  list: async (shopId?: string) => (await mod()).AvailabilityBlocksRepo.list(shopId),
  create: async (input: Parameters<typeof import("./localStore").AvailabilityBlocksRepo.create>[0]) => (await mod()).AvailabilityBlocksRepo.create(input),
  remove: async (id: string) => (await mod()).AvailabilityBlocksRepo.remove(id)
};

export const LeadsRepo = {
  create: async (input: Parameters<typeof import("./localStore").LeadsRepo.create>[0]) => (await mod()).LeadsRepo.create(input),
  list: async () => (await mod()).LeadsRepo.list(),
};

// ─── Convenience functions ────────────────────────────────────────────────────

export async function getProfileForSession(sessionId: string) {
  return (await mod()).getProfileForSession(sessionId);
}

export async function createSession(profileId: string, ttlMinutes: number) {
  return (await mod()).createSession(profileId, ttlMinutes);
}

export async function removeSession(id: string) {
  return (await mod()).removeSession(id);
}

export async function seedIfEmpty() {
  return (await mod()).seedIfEmpty();
}

export async function ensureJourneyProfiles() {
  return (await mod()).ensureJourneyProfiles();
}

export async function ensureServiceSeed() {
  return (await mod()).ensureServiceSeed();
}

export async function getJobCard(idOrRef: string) { return JobCardsRepo.get(idOrRef); }
export async function listJobCardsByDate(dateIso: string, shopId?: string) { return JobCardsRepo.listByDate(dateIso, shopId); }
export async function listJobCardsByMechanicAndDate(mechanicId: string, dateIso: string, shopId?: string) { return JobCardsRepo.listByMechanicAndDate(mechanicId, dateIso, shopId); }
export async function listJobCardsByMechanicInRange(mechanicId: string, from: string, to: string) { return JobCardsRepo.listByMechanicInRange(mechanicId, from, to); }
export async function listInProgressJobCardsByMechanic(mechanicId: string) { return JobCardsRepo.listInProgressByMechanic(mechanicId); }
export async function updateJobCardStatus(id: string, status: import("./localStore").JobCardStatus) { return JobCardsRepo.updateStatus(id, status); }

export function toDateIso(isoString: string) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit",
    timeZone: "Africa/Johannesburg"
  }).format(date);
}
