import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir, getDataDir, isMemoryOnly, readJson, resolveDataFile, setMemoryOnly, writeJsonAtomic } from "@/src/lib/store/fsStore";
import type { PricingSnapshot } from "@/lib/pricing/schema";
import { listNotificationEvents, logNotificationEvent } from "@/src/lib/workshop/notifications";

export type ProfileRole =
  | "PLATFORM_OWNER"
  | "SHOP_OWNER"
  | "MECHANIC"
  | "CLIENT"
  | "ADMIN"
  | "CUSTOMER";
export type ProfileStatus = "ACTIVE" | "INACTIVE" | "PENDING_APPROVAL";
export type OnboardingStatus =
  | "NONE"
  | "CLIENT_PROFILE_INCOMPLETE"
  | "SHOP_REGISTRATION_STARTED"
  | "SHOP_PENDING_APPROVAL"
  | "SHOP_ACTIVE"
  | "COMPLETE"
  | "MECHANIC_PROFILE_INCOMPLETE";
export type ShopStatus = "DRAFT" | "PENDING_APPROVAL" | "ACTIVE" | "REJECTED";
export type AssignmentMode = "AUTO" | "MANUAL";

export type ProfileConsent = {
  whatsappOptIn: boolean;
  marketingOptIn: boolean;
  consentedAtIso?: string;
};

export type NotificationPreferences = {
  whatsappOptOut: boolean;
  emailOptOut: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  updatedAtIso: string;
};

export type ShopBusinessDetails = {
  name: string;
  address: string;
  city: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  vat?: string;
};

export type ShopOperationalDefaults = {
  noticeHours: number;
  workingHours: Array<{ day: string; start: string; end: string; active: boolean }>;
  assignmentMode: AssignmentMode;
};

export type ServiceModels = {
  fixedLocation: {
    enabled: boolean;
    dropOffInstructions?: string;
    parkingAvailability?: "YES" | "LIMITED" | "NO";
    operatingBays?: number;
  };
  mobileMechanic: {
    enabled: boolean;
    serviceRadiusKm?: number;
    calloutFeeCents?: number;
    travelBufferMins?: number;
    serviceAreas?: string[];
  };
};

export type ShopRecord = {
  id: string;
  slug: string;
  name: string;
  shopStatus: ShopStatus;
  createdByProfileId?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  baseLocation?: string;
  businessDetails?: ShopBusinessDetails;
  operationalDefaults?: ShopOperationalDefaults;
  serviceModels?: ServiceModels;
  themeTokens?: Record<string, unknown>;
  businessHours?: string;
  customDomains?: string[];
  submittedAtIso?: string;
  approvedAtIso?: string;
  rejectedAtIso?: string;
  rejectionReason?: string;
  widgetConfig?: {
    buttonColor?: string;
    buttonPosition?: "bottom-right" | "bottom-left";
    buttonLabel?: string;
    hideFab?: boolean;
    authorizedDomains: string[];
    installedAt?: string;
  };
  onboardingChecklist?: {
    completedItems: string[];
    dismissedAt?: string;
  };
  createdAtIso: string;
  updatedAtIso: string;
};

export type ProfileRecord = {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  suburb?: string;
  city?: string;
  preferredMechanicId?: string;
  role: ProfileRole;
  status: ProfileStatus;
  onboardingStatus?: OnboardingStatus;
  termsAcceptedAtIso?: string;
  consent?: ProfileConsent;
  notificationPreferences?: NotificationPreferences;
  shopId?: string;
  specialties?: string[];
  availability?: {
    weeklyHours?: Array<{ day: string; start: string; end: string; active: boolean }>;
    blackoutDates?: string[];
  };
  createdAtIso: string;
  lastLoginAtIso?: string;
};

export type InviteRecord = {
  id: string;
  token: string;
  role: "MECHANIC" | "CLIENT";
  phone: string;
  name?: string;
  shopId: string;
  createdAtIso: string;
  usedAtIso?: string;
};

export type SessionRecord = {
  id: string;
  profileId: string;
  createdAtIso: string;
  expiresAtIso: string;
};

export type ServiceItemRecord = {
  id: string;
  name: string;
  description?: string;
  basePriceCents: number;
  durationMins: number;
  category?: string;
  isActive: boolean;
  sortOrder: number;
  shopId: string;
  createdAtIso: string;
  updatedAtIso: string;
};

export type BikeRecord = {
  id: string;
  customerProfileId: string;
  bikeType: "MTB" | "ROAD" | "GRAVEL" | "E_BIKE" | "OTHER";
  brand: string;
  model?: string;
  drivetrainType?: string;
  brakeType?: string;
  eBike: boolean;
  notes?: string;
  createdAtIso: string;
  updatedAtIso: string;
};

export type ChatMessageRole = "USER" | "ASSISTANT";

export type ChatMessageRecord = {
  id: string;
  atIso: string;
  role: ChatMessageRole;
  text: string;
};

export type ChatThreadRecord = {
  id: string;
  customerProfileId: string;
  createdAtIso: string;
  updatedAtIso: string;
  messages: ChatMessageRecord[];
};

export type BookingStatus = "DRAFT" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

export type BookingRecord = {
  id: string;
  ref: string;
  customerProfileId?: string;
  customerBikeId?: string;
  customerName: string;
  customerPhone: string;
  serviceItemId?: string;
  selectedPackageId?: string;
  preferredMechanicId?: string;
  createdByRole?: ProfileRole;
  createdByProfileId?: string;
  serviceNameSnapshot: string;
  addressLine1: string;
  suburb?: string;
  city?: string;
  notes?: string;
  slotIso: string;
  status: BookingStatus;
  pricingSnapshot?: PricingSnapshot;
  shopId: string;
  createdAtIso: string;
  updatedAtIso: string;
  cancelReason?: string;
  amendedAtIso?: string;
};

export type JobCardStatus =
  | "SCHEDULED"
  | "EN_ROUTE"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "AWAITING_APPROVAL"
  | "COMPLETED"
  | "CANCELLED";

export type JobCardNote = {
  id: string;
  atIso: string;
  authorProfileId?: string;
  text: string;
};

export type JobCardChecklist = {
  intakeDone?: boolean;
  washDone?: boolean;
  drivetrain?: boolean;
  brakes?: boolean;
  wheels?: boolean;
  suspension?: boolean;
  torqueCheck?: boolean;
  testRide?: boolean;
};

export type JobCardPart = {
  id: string;
  inventoryItemId?: string;
  location?: string;
  name: string;
  brand?: string;
  qty: number;
  unitPriceCents?: number;
};

export type JobCardAdditionalCharge = {
  id: string;
  name: string;
  amountCents: number;
  type: "CONSUMABLE" | "ADDITIONAL";
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
  proposedAtIso?: string;
  decidedAtIso?: string;
  decidedByProfileId?: string;
};

export type JobCardCompletion = {
  completedAtIso: string;
  summary?: string;
  customerSignoffName: string;
  customerSignoffAccepted: boolean;
};

export type JobCardRecord = {
  id: string;
  ref: string;
  bookingId: string;
  bookingRef: string;
  assignedMechanicId?: string | null;
  slotIso: string;
  customerName: string;
  customerPhone: string;
  addressLine1: string;
  suburb?: string;
  city?: string;
  serviceName: string;
  durationMinsSnapshot: number;
  status: JobCardStatus;
  shopId: string;
  checklist: JobCardChecklist;
  notes: JobCardNote[];
  partsUsed: JobCardPart[];
  additionalCharges?: JobCardAdditionalCharge[];
  completion?: JobCardCompletion;
};

export type InvoiceLineItem = {
  id: string;
  label: string;
  amountCents: number;
  qty?: number;
  type: "LABOUR" | "PART" | "CONSUMABLE" | "ADDITIONAL";
};

export type InvoiceRecord = {
  id: string;
  ref: string;
  jobCardId: string;
  bookingId: string;
  bookingRef: string;
  customerName: string;
  customerPhone: string;
  issuedAtIso: string;
  issuedByProfileId: string;
  status: "ISSUED" | "PAID";
  shopId: string;
  lineItems: InvoiceLineItem[];
  subtotalCents: number;
  totalCents: number;
};

export type RatingRecord = {
  id: string;
  bookingId: string;
  customerProfileId: string;
  rating: number; // 1-5
  comment?: string;
  createdAtIso: string;
};

export type SupportTicketCategory = "payment" | "cancellation" | "general" | "complaint";
export type SupportTicketPriority = "low" | "normal" | "high";
export type SupportTicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type SupportTicketNote = {
  id: string;
  authorName: string;
  text: string;
  createdAtIso: string;
};

export type SupportTicketRecord = {
  id: string;
  subject: string;
  description: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  bookingId?: string;
  assigneeId?: string;
  shopId: string;
  notes: SupportTicketNote[];
  createdAtIso: string;
  updatedAtIso: string;
  resolvedAtIso?: string;
};

export type TravelBandRule = {
  minKm: number;
  maxKm: number | null;
  feeCents: number;
  label?: string;
};

export type PricingRuleRecord = {
  id: string;
  shopId: string;
  calloutFeeCents: number;
  platformFeeCents: number;
  platformFeePercentBps: number | null;
  partsMarkupBps: number;
  travelBandRulesJson: TravelBandRule[];
  afterHoursEnabled: boolean;
  afterHoursSurchargeBps: number;
  effectiveFrom: string;
  isActive: boolean;
  createdAtIso: string;
  updatedAtIso: string;
};

export type AvailabilityBlockRecord = {
  id: string;
  shopId: string;
  date: string;
  reason?: string;
  isEmergency: boolean;
  createdAtIso: string;
};

export interface LeadRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  formType: string;
  message: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  status: string;
  createdAtIso: string;
  updatedAtIso: string;
}

type StoreState = {
  shops: ShopRecord[];
  profiles: ProfileRecord[];
  invites: InviteRecord[];
  sessions: SessionRecord[];
  serviceItems: ServiceItemRecord[];
  bikes: BikeRecord[];
  chatThreads: ChatThreadRecord[];
  bookings: BookingRecord[];
  jobCards: JobCardRecord[];
  invoices: InvoiceRecord[];
  ratings: RatingRecord[];
  supportTickets: SupportTicketRecord[];
  pricingRules: PricingRuleRecord[];
  availabilityBlocks: AvailabilityBlockRecord[];
  leads: LeadRecord[];
};

type StoreKey = keyof StoreState;

type RequiredJourneyProfile = {
  phone: string;
  name: string;
  email?: string;
  role: ProfileRole;
};

const REQUIRED_JOURNEY_PROFILES: RequiredJourneyProfile[] = [
  { phone: "+27660994766", name: "Tebogo Mokwatlo", email: "info@servicemybikejoburg.co.za", role: "SHOP_OWNER" },
  { phone: "+27110000001", name: "Shop Owner", role: "SHOP_OWNER" },
  { phone: "+27110000002", name: "Platform Owner", role: "PLATFORM_OWNER" },
  { phone: "+27110000003", name: "Tebogo Mokwatlo (Lead Mechanic)", role: "MECHANIC" },
  { phone: "+27110000004", name: "Client User", role: "CLIENT" }
];

const memoryStore: StoreState = {
  shops: [],
  profiles: [],
  invites: [],
  sessions: [],
  serviceItems: [],
  bikes: [],
  chatThreads: [],
  bookings: [],
  jobCards: [],
  invoices: [],
  ratings: [],
  supportTickets: [],
  pricingRules: [],
  availabilityBlocks: [],
  leads: []
};

// ─── Fixture loading for serverless (memory-only) mode ───────────────────────
// Map store collection keys to fixture file names that are committed to git
// and deployed with the app. These provide stable seed data on every cold start.
const FIXTURE_FILE_MAP: Partial<Record<StoreKey, string>> = {
  shops: "shops.json",
  profiles: "profiles.json",
  serviceItems: "service_items.json"
};

function getFixturesDir(): string {
  const cwd = process.cwd();
  if (cwd.endsWith(path.join("apps", "web"))) {
    return path.join(cwd, "fixtures");
  }
  return path.join(cwd, "apps", "web", "fixtures");
}

const fixtureLoadedKeys = new Set<StoreKey>();

async function hydrateFromFixture<T extends StoreKey>(key: T): Promise<boolean> {
  if (fixtureLoadedKeys.has(key)) return false;
  const fixtureFile = FIXTURE_FILE_MAP[key];
  if (!fixtureFile) return false;
  try {
    const filePath = path.join(getFixturesDir(), fixtureFile);
    const raw = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(raw);
    if (Array.isArray(data) && data.length > 0) {
      memoryStore[key] = data as StoreState[T];
      fixtureLoadedKeys.add(key);
      return true;
    }
  } catch {
    // Fixture file missing or unreadable — fall through to dynamic seed
  }
  return false;
}

const DEFAULT_WEEKLY_HOURS: ShopOperationalDefaults["workingHours"] = [
  { day: "Mon", start: "08:00", end: "18:00", active: true },
  { day: "Tue", start: "08:00", end: "18:00", active: true },
  { day: "Wed", start: "08:00", end: "18:00", active: true },
  { day: "Thu", start: "08:00", end: "18:00", active: true },
  { day: "Fri", start: "08:00", end: "18:00", active: true },
  { day: "Sat", start: "08:00", end: "18:00", active: true },
  { day: "Sun", start: "08:00", end: "18:00", active: false }
];

const DEFAULT_OPERATIONAL_DEFAULTS: ShopOperationalDefaults = {
  noticeHours: 24,
  workingHours: DEFAULT_WEEKLY_HOURS,
  assignmentMode: "AUTO"
};

function cloneOperationalDefaults() {
  return {
    noticeHours: DEFAULT_OPERATIONAL_DEFAULTS.noticeHours,
    assignmentMode: DEFAULT_OPERATIONAL_DEFAULTS.assignmentMode,
    workingHours: DEFAULT_OPERATIONAL_DEFAULTS.workingHours.map((entry) => ({ ...entry }))
  };
}

function normalizeProfileStatus(status?: string): ProfileStatus {
  if (status === "ACTIVE" || status === "INACTIVE" || status === "PENDING_APPROVAL") return status;
  return "ACTIVE";
}

function defaultOnboardingStatusForRole(role: ProfileRole): OnboardingStatus {
  if (role === "CLIENT" || role === "CUSTOMER") return "CLIENT_PROFILE_INCOMPLETE";
  if (role === "MECHANIC") return "NONE";
  if (role === "SHOP_OWNER") return "SHOP_ACTIVE";
  return "NONE";
}

function normalizeOnboardingStatus(value: unknown, role: ProfileRole): OnboardingStatus {
  if (
    value === "NONE" ||
    value === "CLIENT_PROFILE_INCOMPLETE" ||
    value === "SHOP_REGISTRATION_STARTED" ||
    value === "SHOP_PENDING_APPROVAL" ||
    value === "SHOP_ACTIVE" ||
    value === "COMPLETE" ||
    value === "MECHANIC_PROFILE_INCOMPLETE"
  ) {
    return value;
  }
  return defaultOnboardingStatusForRole(role);
}

function normalizeConsent(value: unknown): ProfileConsent {
  const raw = (value || {}) as Record<string, unknown>;
  return {
    whatsappOptIn: typeof raw.whatsappOptIn === "boolean" ? raw.whatsappOptIn : false,
    marketingOptIn: typeof raw.marketingOptIn === "boolean" ? raw.marketingOptIn : false,
    consentedAtIso: typeof raw.consentedAtIso === "string" ? raw.consentedAtIso : undefined
  };
}

function normalizeShopStatus(value: unknown): ShopStatus {
  if (value === "DRAFT" || value === "PENDING_APPROVAL" || value === "ACTIVE" || value === "REJECTED") {
    return value;
  }
  return "ACTIVE";
}

function normalizeOperationalDefaults(value: unknown): ShopOperationalDefaults {
  const raw = (value || {}) as Partial<ShopOperationalDefaults>;
  const workingHours = Array.isArray(raw.workingHours)
    ? raw.workingHours
        .filter((entry) => entry && typeof entry.day === "string")
        .map((entry) => ({
          day: entry.day,
          start: entry.start || "08:00",
          end: entry.end || "18:00",
          active: entry.active !== false
        }))
    : cloneOperationalDefaults().workingHours;
  return {
    noticeHours: typeof raw.noticeHours === "number" && raw.noticeHours >= 0 ? raw.noticeHours : 24,
    assignmentMode: raw.assignmentMode === "MANUAL" ? "MANUAL" : "AUTO",
    workingHours: workingHours.length ? workingHours : cloneOperationalDefaults().workingHours
  };
}

function normalizeShopRecord(input: ShopRecord): ShopRecord {
  const businessDetails = input.businessDetails || {
    name: input.name,
    address: input.baseLocation || "",
    city: "",
    contactEmail: input.email || "",
    contactPhone: input.phone || ""
  };
  return {
    ...input,
    shopStatus: normalizeShopStatus(input.shopStatus),
    businessDetails,
    operationalDefaults: normalizeOperationalDefaults(input.operationalDefaults),
    submittedAtIso: input.submittedAtIso,
    approvedAtIso: input.approvedAtIso,
    rejectedAtIso: input.rejectedAtIso,
    rejectionReason: input.rejectionReason
  };
}

function normalizeProfileRecord(input: ProfileRecord): ProfileRecord {
  const role = input.role || "CLIENT";
  const status = normalizeProfileStatus(input.status);
  return {
    ...input,
    role,
    status,
    onboardingStatus: normalizeOnboardingStatus(input.onboardingStatus, role),
    consent: normalizeConsent(input.consent)
  };
}

async function ensureDataDir() {
  if (isMemoryOnly()) return null;
  const dir = getDataDir();
  return ensureDir(dir);
}

async function readCollection<T extends StoreKey>(key: T): Promise<StoreState[T]> {
  if (isMemoryOnly()) {
    // In memory-only mode (Vercel), hydrate from committed fixture files first.
    // This ensures stable IDs survive across serverless cold starts.
    if (Array.isArray(memoryStore[key]) && (memoryStore[key] as unknown[]).length === 0) {
      await hydrateFromFixture(key);
    }

    // After fixture hydration, fall back to dynamic seed only for profiles
    if (key === "profiles" && Array.isArray(memoryStore[key]) && memoryStore[key].length === 0) {
      await seedIfEmpty();
      return (memoryStore[key] as unknown as ProfileRecord[]).map((entry) => normalizeProfileRecord(entry)) as StoreState[T];
    }
    if (key === "profiles" && Array.isArray(memoryStore[key])) {
      return (memoryStore[key] as unknown as ProfileRecord[]).map((entry) => normalizeProfileRecord(entry as ProfileRecord)) as StoreState[T];
    }
    if (key === "shops" && Array.isArray(memoryStore[key])) {
      return (memoryStore[key] as unknown as ShopRecord[]).map((entry) => normalizeShopRecord(entry as ShopRecord)) as StoreState[T];
    }
    return memoryStore[key];
  }
  const dir = await ensureDataDir();
  if (!dir) return memoryStore[key];
  const filePath = resolveDataFile(`${key}.json`);
  const data = await readJson(filePath, memoryStore[key]);
  if (key === "profiles" && Array.isArray(data) && data.length === 0) {
    await seedIfEmpty();
    const seeded = await readJson(filePath, memoryStore[key]);
    return (seeded as ProfileRecord[]).map((entry) => normalizeProfileRecord(entry)) as StoreState[T];
  }
  if (key === "profiles" && Array.isArray(data)) {
    return data.map((entry) => normalizeProfileRecord(entry as ProfileRecord)) as StoreState[T];
  }
  if (key === "shops" && Array.isArray(data)) {
    return data.map((entry) => normalizeShopRecord(entry as ShopRecord)) as StoreState[T];
  }
  return data as StoreState[T];
}

async function writeCollection<T extends StoreKey>(key: T, data: StoreState[T]) {
  if (isMemoryOnly()) {
    memoryStore[key] = data;
    return;
  }
  const dir = await ensureDataDir();
  if (!dir) {
    memoryStore[key] = data;
    setMemoryOnly();
    return;
  }
  const filePath = resolveDataFile(`${key}.json`);
  try {
    await writeJsonAtomic(filePath, data);
  } catch {
    memoryStore[key] = data;
    setMemoryOnly();
  }
}

function buildId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
}

function buildRef(prefix: string) {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `${prefix}-${y}${m}${d}-${rand}`;
}

function randomToken() {
  return crypto.randomBytes(18).toString("base64url");
}

function slotIsoAt(daysFromNow: number, hourLocal: number, minuteLocal = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  // Africa/Johannesburg is UTC+2 and does not observe DST.
  date.setUTCHours(hourLocal - 2, minuteLocal, 0, 0);
  return date.toISOString();
}

async function ensureComprehensiveDemoSeed() {
  const [existingBookings, existingCards, existingInvoices, existingTickets] = await Promise.all([
    readCollection("bookings"),
    readCollection("jobCards"),
    readCollection("invoices"),
    readCollection("supportTickets")
  ]);
  if (existingBookings.length || existingCards.length || existingInvoices.length || existingTickets.length) return;

  const shopId = await getDefaultShopId();
  await ensureServiceSeed();

  const demoProfiles: Array<{ phone: string; name: string; role: ProfileRole; status?: ProfileStatus }> = [
    { phone: "+27660994766", name: "Tebogo Mokwatlo", role: "MECHANIC" },
    { phone: "+27610000035", name: "Tebogo Mokwatlo (Backup)", role: "MECHANIC" },
    { phone: "+27610000036", name: "Sipho Dlamini (Reserve Mechanic)", role: "MECHANIC", status: "INACTIVE" },
    { phone: "+27110000004", name: "Client User", role: "CLIENT" },
    { phone: "+27610010011", name: "Thabo Ndlovu", role: "CLIENT" },
    { phone: "+27610010012", name: "Lerato Maseko", role: "CLIENT" }
  ];

  for (const profile of demoProfiles) {
    // Don't downgrade a SHOP_OWNER to MECHANIC — Tebogo is both the owner and lead mechanic
    const existing = await ProfilesRepo.getByPhone(profile.phone);
    const effectiveRole = existing?.role === "SHOP_OWNER" && profile.role === "MECHANIC"
      ? "SHOP_OWNER"
      : profile.role;
    const upserted = await ProfilesRepo.upsertByPhone({
      phone: profile.phone,
      name: profile.name,
      role: effectiveRole,
      status: "ACTIVE",
      shopId
    });
    if (profile.status && upserted.status !== profile.status) {
      await ProfilesRepo.setStatus(upserted.id, profile.status);
    }
  }

  const [leadMechanic, wheelMechanic, primaryClient, clientOne, clientTwo] = await Promise.all([
    ProfilesRepo.getByPhone("+27660994766"),
    ProfilesRepo.getByPhone("+27610000035"),
    ProfilesRepo.getByPhone("+27110000004"),
    ProfilesRepo.getByPhone("+27610010011"),
    ProfilesRepo.getByPhone("+27610010012")
  ]);
  if (!leadMechanic || !wheelMechanic || !primaryClient || !clientOne || !clientTwo) return;

  const serviceItems = await ServiceItemsRepo.listActive(shopId);
  if (!serviceItems.length) return;
  const pickService = (needle: string, fallbackIndex: number) =>
    serviceItems.find((item) => `${item.name} ${item.category || ""}`.toLowerCase().includes(needle)) ||
    serviceItems[fallbackIndex] ||
    serviceItems[0];
  const tuneService = pickService("tune", 0);
  const brakeService = pickService("brake", 1);
  const majorService = pickService("major", 2);
  const suspensionService = pickService("suspension", 3);
  const detailService = pickService("detail", 4);
  const raceService = pickService("race", 5);
  const serviceDurationById = new Map(serviceItems.map((item) => [item.id, item.durationMins]));
  const serviceDurationFor = (booking: BookingRecord) =>
    booking.serviceItemId ? serviceDurationById.get(booking.serviceItemId) || 90 : 90;

  const bikes = await readCollection("bikes");
  if (bikes.length === 0) {
    await BikesRepo.create({
      customerProfileId: primaryClient.id,
      bikeType: "ROAD",
      brand: "Specialized",
      model: "Tarmac SL7",
      drivetrainType: "Shimano Ultegra Di2 12-speed",
      brakeType: "Hydraulic Disc",
      eBike: false,
      notes: "Customer prefers 28c tubeless setup and chain wax."
    });
    await BikesRepo.create({
      customerProfileId: clientOne.id,
      bikeType: "MTB",
      brand: "Santa Cruz",
      model: "Tallboy 5",
      drivetrainType: "SRAM GX Eagle AXS",
      brakeType: "Hydraulic Disc",
      eBike: false,
      notes: "Rear suspension service interval reached."
    });
    await BikesRepo.create({
      customerProfileId: clientTwo.id,
      bikeType: "E_BIKE",
      brand: "Trek",
      model: "Rail 7",
      drivetrainType: "Shimano Deore 12-speed",
      brakeType: "Hydraulic Disc",
      eBike: true,
      notes: "Needs firmware check and battery connector inspection."
    });
  }

  const bookingA = await BookingsRepo.create({
    customerProfileId: primaryClient.id,
    customerName: primaryClient.name || "Client User",
    customerPhone: primaryClient.phone,
    serviceItemId: tuneService.id,
    serviceNameSnapshot: tuneService.name,
    addressLine1: "42 Cedar Road",
    suburb: "Fourways",
    city: "Johannesburg",
    notes: "Please focus on front derailleur rub under load.",
    slotIso: slotIsoAt(1, 9),
    status: "CONFIRMED",
    shopId
  });

  const bookingB = await BookingsRepo.create({
    customerProfileId: clientOne.id,
    customerName: clientOne.name || "Thabo Ndlovu",
    customerPhone: clientOne.phone,
    serviceItemId: brakeService.id,
    serviceNameSnapshot: brakeService.name,
    addressLine1: "18 Main Street",
    suburb: "Randburg",
    city: "Johannesburg",
    notes: "Rear brake feels spongy after recent ride.",
    slotIso: slotIsoAt(0, 10),
    status: "CONFIRMED",
    shopId
  });

  const bookingC = await BookingsRepo.create({
    customerProfileId: clientTwo.id,
    customerName: clientTwo.name || "Lerato Maseko",
    customerPhone: clientTwo.phone,
    serviceItemId: suspensionService.id,
    serviceNameSnapshot: suspensionService.name,
    addressLine1: "220 Rivonia Road",
    suburb: "Sandton",
    city: "Johannesburg",
    notes: "Please call before adding any extra parts.",
    slotIso: slotIsoAt(0, 13),
    status: "CONFIRMED",
    shopId
  });

  const bookingD = await BookingsRepo.create({
    customerProfileId: primaryClient.id,
    customerName: primaryClient.name || "Client User",
    customerPhone: primaryClient.phone,
    serviceItemId: majorService.id,
    serviceNameSnapshot: majorService.name,
    addressLine1: "42 Cedar Road",
    suburb: "Fourways",
    city: "Johannesburg",
    notes: "Season refresh before race block.",
    slotIso: slotIsoAt(-2, 8, 30),
    status: "COMPLETED",
    shopId
  });

  const bookingE = await BookingsRepo.create({
    customerProfileId: clientTwo.id,
    customerName: clientTwo.name || "Lerato Maseko",
    customerPhone: clientTwo.phone,
    serviceItemId: detailService.id,
    serviceNameSnapshot: detailService.name,
    addressLine1: "220 Rivonia Road",
    suburb: "Sandton",
    city: "Johannesburg",
    notes: "Deep clean before resale photos.",
    slotIso: slotIsoAt(-1, 15),
    status: "CANCELLED",
    shopId
  });

  await BookingsRepo.update(bookingE.id, { cancelReason: "Customer postponed due to travel." });

  await BookingsRepo.create({
    customerProfileId: clientOne.id,
    customerName: clientOne.name || "Thabo Ndlovu",
    customerPhone: clientOne.phone,
    serviceItemId: raceService.id,
    serviceNameSnapshot: raceService.name,
    addressLine1: "18 Main Street",
    suburb: "Randburg",
    city: "Johannesburg",
    notes: "Draft request from web form, pending confirmation.",
    slotIso: slotIsoAt(3, 7, 30),
    status: "DRAFT",
    shopId
  });

  const cardA = await JobCardsRepo.createFromBooking(
    bookingA,
    { id: bookingA.serviceItemId, durationMins: serviceDurationFor(bookingA) },
    leadMechanic.id
  );

  const cardB = await JobCardsRepo.createFromBooking(
    bookingB,
    { id: bookingB.serviceItemId, durationMins: serviceDurationFor(bookingB) },
    leadMechanic.id
  );
  await JobCardsRepo.updateStatus(cardB.id, "EN_ROUTE");
  await JobCardsRepo.updateChecklist(cardB.id, {
    intakeDone: true,
    washDone: true,
    drivetrain: true,
    brakes: true
  });

  const cardC = await JobCardsRepo.createFromBooking(
    bookingC,
    { id: bookingC.serviceItemId, durationMins: serviceDurationFor(bookingC) },
    wheelMechanic.id
  );
  await JobCardsRepo.updateStatus(cardC.id, "AWAITING_APPROVAL");
  await JobCardsRepo.addAdditionalCharge(cardC.id, {
    id: buildId("chg"),
    name: "Fork dust seals + fluid top-up",
    amountCents: 89000,
    type: "ADDITIONAL",
    approvalStatus: "PENDING"
  });
  await JobCardsRepo.addNote(
    cardC.id,
    {
      id: buildId("note"),
      atIso: new Date().toISOString(),
      authorProfileId: wheelMechanic.id,
      text: "Found worn dust seals and requested customer approval."
    }
  );

  const cardD = await JobCardsRepo.createFromBooking(
    bookingD,
    { id: bookingD.serviceItemId, durationMins: serviceDurationFor(bookingD) },
    wheelMechanic.id
  );
  await JobCardsRepo.updateStatus(cardD.id, "IN_PROGRESS");
  await JobCardsRepo.addPart(cardD.id, {
    id: buildId("part"),
    name: "Shimano B05S Brake Pads",
    brand: "Shimano",
    qty: 1,
    unitPriceCents: 33900
  });
  await JobCardsRepo.addPart(cardD.id, {
    id: buildId("part"),
    name: "Muc-Off Wet Chain Lube 120ml",
    brand: "Muc-Off",
    qty: 1,
    unitPriceCents: 19900
  });
  await JobCardsRepo.complete(cardD.id, {
    completedAtIso: slotIsoAt(-2, 11, 45),
    summary: "Major service completed with new pads and drivetrain refresh.",
    customerSignoffName: primaryClient.name || "Client User",
    customerSignoffAccepted: true
  });

  const cardE = await JobCardsRepo.createFromBooking(
    bookingE,
    { id: bookingE.serviceItemId, durationMins: serviceDurationFor(bookingE) },
    leadMechanic.id
  );
  await JobCardsRepo.updateStatus(cardE.id, "CANCELLED");

  const invoices = await readCollection("invoices");
  if (invoices.length === 0) {
    const completedLabour = majorService.basePriceCents;
    const completedParts = 33900 + 19900;
    await InvoicesRepo.create({
      shopId,
      jobCardId: cardD.id,
      bookingId: bookingD.id,
      bookingRef: bookingD.ref,
      customerName: bookingD.customerName,
      customerPhone: bookingD.customerPhone,
      issuedAtIso: slotIsoAt(-2, 12, 10),
      issuedByProfileId: leadMechanic.id,
      status: "PAID",
      lineItems: [
        { id: buildId("li"), label: majorService.name, amountCents: completedLabour, qty: 1, type: "LABOUR" },
        { id: buildId("li"), label: "Shimano B05S Brake Pads", amountCents: 33900, qty: 1, type: "PART" },
        { id: buildId("li"), label: "Muc-Off Wet Chain Lube 120ml", amountCents: 19900, qty: 1, type: "CONSUMABLE" }
      ],
      subtotalCents: completedLabour + completedParts,
      totalCents: completedLabour + completedParts
    });

    await InvoicesRepo.create({
      shopId,
      jobCardId: cardC.id,
      bookingId: bookingC.id,
      bookingRef: bookingC.ref,
      customerName: bookingC.customerName,
      customerPhone: bookingC.customerPhone,
      issuedAtIso: slotIsoAt(0, 14),
      issuedByProfileId: wheelMechanic.id,
      status: "ISSUED",
      lineItems: [
        { id: buildId("li"), label: suspensionService.name, amountCents: suspensionService.basePriceCents, qty: 1, type: "LABOUR" },
        { id: buildId("li"), label: "Fork dust seals + fluid top-up", amountCents: 89000, qty: 1, type: "ADDITIONAL" }
      ],
      subtotalCents: suspensionService.basePriceCents + 89000,
      totalCents: suspensionService.basePriceCents + 89000
    });
  }

  const ratings = await readCollection("ratings");
  if (ratings.length === 0) {
    await RatingsRepo.create({
      bookingId: bookingD.id,
      customerProfileId: primaryClient.id,
      rating: 5,
      comment: "Bike felt race-ready immediately after collection."
    });
  }

  const supportTickets = await readCollection("supportTickets");
  if (supportTickets.length === 0) {
    const approvalTicket = await SupportTicketsRepo.create({
      subject: "Awaiting approval for fork seals replacement",
      description: "Mechanic requested additional charge approval; customer asked for ETA impact.",
      category: "general",
      priority: "normal",
      bookingId: bookingC.id,
      assigneeId: leadMechanic.id,
      shopId
    });
    await SupportTicketsRepo.addNote(approvalTicket.id, {
      authorName: "Dispatch",
      text: "Customer requested WhatsApp update once extra work is approved."
    });

    const paymentTicket = await SupportTicketsRepo.create({
      subject: "Invoice copy requested",
      description: "Customer needs VAT line item split for reimbursement.",
      category: "payment",
      priority: "high",
      bookingId: bookingD.id,
      assigneeId: wheelMechanic.id,
      shopId
    });
    await SupportTicketsRepo.update(paymentTicket.id, {
      status: "in_progress",
      assigneeId: wheelMechanic.id
    });
    await SupportTicketsRepo.addNote(paymentTicket.id, {
      authorName: "Admin",
      text: "Detailed invoice regenerated and emailed to customer."
    });

    const cancellationTicket = await SupportTicketsRepo.create({
      subject: "Cancelled booking follow-up",
      description: "Reschedule request captured for next available Saturday slot.",
      category: "cancellation",
      priority: "low",
      bookingId: bookingE.id,
      assigneeId: leadMechanic.id,
      shopId
    });
    await SupportTicketsRepo.update(cancellationTicket.id, {
      status: "resolved",
      resolvedAtIso: new Date().toISOString()
    });
    await SupportTicketsRepo.addNote(cancellationTicket.id, {
      authorName: "Support",
      text: "Customer confirmed they will rebook for next week."
    });
  }

  const threads = await readCollection("chatThreads");
  if (threads.length === 0) {
    const primaryThread = await ChatThreadsRepo.getOrCreateForCustomer(primaryClient.id);
    await ChatThreadsRepo.appendMessage(primaryThread.id, {
      id: buildId("msg"),
      atIso: slotIsoAt(-1, 16, 20),
      role: "USER",
      text: "Can you confirm my bike is ready for collection?"
    });
    await ChatThreadsRepo.appendMessage(primaryThread.id, {
      id: buildId("msg"),
      atIso: slotIsoAt(-1, 16, 24),
      role: "ASSISTANT",
      text: "Yes, your major service is complete and signed off. Collection is available until 17:30."
    });

    const mtbThread = await ChatThreadsRepo.getOrCreateForCustomer(clientOne.id);
    await ChatThreadsRepo.appendMessage(mtbThread.id, {
      id: buildId("msg"),
      atIso: slotIsoAt(0, 8, 5),
      role: "USER",
      text: "I might be 10 minutes late for today’s brake booking."
    });
    await ChatThreadsRepo.appendMessage(mtbThread.id, {
      id: buildId("msg"),
      atIso: slotIsoAt(0, 8, 8),
      role: "ASSISTANT",
      text: "No problem. The mechanic has been updated and your slot is still secured."
    });
  }

  const invites = await readCollection("invites");
  if (invites.length === 0) {
    await InvitesRepo.create({
      phone: "+27610000045",
      name: "Neo Khumalo (Suspension Tech)",
      shopId
    });
  }

  const existingEvents = await listNotificationEvents(1);
  if (existingEvents.length === 0) {
    await logNotificationEvent({
      eventType: "booking.confirmed",
      channel: "WHATSAPP_STUB",
      message: `${bookingA.ref} confirmed for ${bookingA.serviceNameSnapshot}.`,
      target: bookingA.customerPhone,
      customerPhone: bookingA.customerPhone,
      bookingId: bookingA.id,
      bookingRef: bookingA.ref,
      actorProfileId: leadMechanic.id
    });
    await logNotificationEvent({
      eventType: "job_card.status_changed",
      channel: "SYSTEM_STUB",
      message: `${cardB.ref} status changed to EN_ROUTE.`,
      bookingId: bookingB.id,
      bookingRef: bookingB.ref,
      jobCardId: cardB.id,
      jobCardRef: cardB.ref,
      customerPhone: bookingB.customerPhone,
      actorProfileId: leadMechanic.id
    });
    await logNotificationEvent({
      eventType: "invoice.issued",
      channel: "EMAIL_STUB",
      message: `Invoice issued for ${bookingC.ref} and pending customer approval.`,
      target: bookingC.customerPhone,
      customerPhone: bookingC.customerPhone,
      bookingId: bookingC.id,
      bookingRef: bookingC.ref,
      jobCardId: cardC.id,
      jobCardRef: cardC.ref,
      actorProfileId: wheelMechanic.id,
      status: "QUEUED"
    });
    await logNotificationEvent({
      eventType: "support.ticket.updated",
      channel: "SYSTEM_STUB",
      message: "Support queue updated with payment and cancellation follow-ups.",
      actorProfileId: leadMechanic.id
    });
  }
}

const DEFAULT_SHOP_SLUG = "servicemybike";

const DEFAULT_CUSTOM_DOMAINS = ["book.servicemybikejoburg.co.za"];
const DEFAULT_THEME_TOKENS = { primaryColor: "#0f4d73", shopName: "ServiceMyBike Joburg" };

export async function getDefaultShopId(): Promise<string> {
  // Check env var override first
  if (process.env.DEFAULT_SHOP_ID) {
    return process.env.DEFAULT_SHOP_ID;
  }

  const shops = await readCollection("shops");
  const activeShop = shops.find((shop) => shop.shopStatus === "ACTIVE");
  if (activeShop) {
    return activeShop.id;
  }

  if (shops.length > 0) return shops[0].id;

  // Fallback: create default shop
  const shop = await ShopRepo.create({
    name: "ServiceMyBike Joburg",
    slug: DEFAULT_SHOP_SLUG,
    shopStatus: "ACTIVE",
    email: "bookings@servicemybikejoburg.co.za",
    baseLocation: "Fourways, Johannesburg",
    operationalDefaults: {
      noticeHours: 24,
      assignmentMode: "AUTO",
      workingHours: [
        { day: "Mon", start: "07:30", end: "17:00", active: true },
        { day: "Tue", start: "07:30", end: "17:00", active: true },
        { day: "Wed", start: "07:30", end: "17:00", active: true },
        { day: "Thu", start: "07:30", end: "17:00", active: true },
        { day: "Fri", start: "07:30", end: "17:00", active: true },
        { day: "Sat", start: "07:30", end: "17:00", active: true },
        { day: "Sun", start: "07:30", end: "17:00", active: false }
      ]
    },
    customDomains: DEFAULT_CUSTOM_DOMAINS,
    themeTokens: DEFAULT_THEME_TOKENS
  });
  return shop.id;
}

export const ShopRepo = {
  async getById(id: string) {
    const shops = await readCollection("shops");
    return shops.find((s) => s.id === id) || null;
  },
  async getBySlug(slug: string) {
    const shops = await readCollection("shops");
    return shops.find((s) => s.slug === slug) || null;
  },
  async getByDomain(hostname: string) {
    const shops = await readCollection("shops");
    return shops.find((s) => s.shopStatus === "ACTIVE" && s.customDomains?.includes(hostname)) || null;
  },
  async getDefault() {
    const shops = await readCollection("shops");
    return shops.find((shop) => shop.shopStatus === "ACTIVE") || shops[0] || null;
  },
  async list() {
    return readCollection("shops");
  },
  async create(input: {
    name: string;
    slug: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    baseLocation?: string;
    businessHours?: string;
    createdByProfileId?: string;
    shopStatus?: ShopStatus;
    businessDetails?: ShopBusinessDetails;
    operationalDefaults?: Partial<ShopOperationalDefaults>;
    serviceModels?: ServiceModels;
    customDomains?: string[];
    themeTokens?: Record<string, unknown>;
    submittedAtIso?: string;
    approvedAtIso?: string;
    rejectedAtIso?: string;
    rejectionReason?: string;
    widgetConfig?: ShopRecord["widgetConfig"];
    onboardingChecklist?: ShopRecord["onboardingChecklist"];
  }) {
    const shops = await readCollection("shops");
    const now = new Date().toISOString();
    const operationalDefaults = normalizeOperationalDefaults({
      ...cloneOperationalDefaults(),
      ...(input.operationalDefaults || {})
    });
    const businessDetails: ShopBusinessDetails = input.businessDetails || {
      name: input.name,
      address: input.baseLocation || "",
      city: "",
      contactEmail: input.email || "",
      contactPhone: input.phone || ""
    };
    const shop: ShopRecord = {
      id: buildId("shop"),
      slug: input.slug,
      name: input.name,
      shopStatus: input.shopStatus || "ACTIVE",
      createdByProfileId: input.createdByProfileId,
      phone: input.phone,
      whatsapp: input.whatsapp,
      email: input.email,
      baseLocation: input.baseLocation,
      businessDetails,
      operationalDefaults,
      serviceModels: input.serviceModels,
      themeTokens: input.themeTokens,
      businessHours: input.businessHours,
      customDomains: input.customDomains,
      submittedAtIso: input.submittedAtIso,
      approvedAtIso: input.approvedAtIso,
      rejectedAtIso: input.rejectedAtIso,
      rejectionReason: input.rejectionReason,
      widgetConfig: input.widgetConfig || { authorizedDomains: [] },
      onboardingChecklist: input.onboardingChecklist || { completedItems: ["shop_created"] },
      createdAtIso: now,
      updatedAtIso: now
    };
    shops.unshift(normalizeShopRecord(shop));
    await writeCollection("shops", shops);
    return normalizeShopRecord(shop);
  },
  async update(id: string, updates: Partial<Omit<ShopRecord, "id" | "slug" | "createdAtIso">>) {
    const shops = await readCollection("shops");
    const idx = shops.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    shops[idx] = normalizeShopRecord({
      ...shops[idx],
      ...updates,
      operationalDefaults: updates.operationalDefaults
        ? normalizeOperationalDefaults({ ...shops[idx].operationalDefaults, ...updates.operationalDefaults })
        : shops[idx].operationalDefaults,
      updatedAtIso: new Date().toISOString()
    });
    await writeCollection("shops", shops);
    return shops[idx];
  }
};

export async function seedIfEmpty() {
  if (isMemoryOnly()) {
    // In memory-only mode (Vercel), seed directly into memoryStore
    if (memoryStore.profiles.length > 0) return;
  } else {
    const dir = await ensureDataDir();
    if (!dir) return;
    const filePath = resolveDataFile("profiles.json");
    const existing = await readJson<ProfileRecord[]>(filePath, []);
    if (existing.length > 0) return;
  }
  const shopId = await getDefaultShopId();
  const tebogoPhone = "+27660994766";
  const adminPhone = process.env.ADMIN_PHONE || tebogoPhone;
  const admin: ProfileRecord = {
    id: buildId("prof"),
    phone: adminPhone,
    name: adminPhone === tebogoPhone ? "Tebogo Mokwatlo" : "Admin",
    email: adminPhone === tebogoPhone ? "info@servicemybikejoburg.co.za" : undefined,
    role: "SHOP_OWNER",
    status: "ACTIVE",
    onboardingStatus: "SHOP_ACTIVE",
    consent: normalizeConsent(undefined),
    shopId,
    createdAtIso: new Date().toISOString()
  };
  const next = [admin];
  await writeCollection("profiles", next);
  await ensureJourneyProfiles();
}

export async function ensureJourneyProfiles() {
  const profiles = await readCollection("profiles");
  const shopId = await getDefaultShopId();
  let changed = false;
  const nowIso = new Date().toISOString();

  for (const required of REQUIRED_JOURNEY_PROFILES) {
    const idx = profiles.findIndex((profile) => profile.phone === required.phone);
    if (idx >= 0) {
      const current = profiles[idx];
      const updated: ProfileRecord = {
        ...current,
        name: required.name,
        email: required.email || current.email,
        role: required.role,
        status: normalizeProfileStatus(current.status),
        onboardingStatus:
          required.role === "SHOP_OWNER"
            ? normalizeOnboardingStatus(current.onboardingStatus, "SHOP_OWNER")
            : normalizeOnboardingStatus(current.onboardingStatus, required.role),
        consent: normalizeConsent(current.consent),
        shopId
      };
      if (
        current.name !== updated.name ||
        current.role !== updated.role ||
        current.status !== updated.status ||
        current.shopId !== updated.shopId ||
        current.email !== updated.email
      ) {
        profiles[idx] = updated;
        changed = true;
      }
      continue;
    }

    profiles.unshift({
      id: buildId("prof"),
      phone: required.phone,
      name: required.name,
      email: required.email,
      role: required.role,
      status: "ACTIVE",
      onboardingStatus:
        required.role === "SHOP_OWNER"
          ? "SHOP_ACTIVE"
          : required.role === "MECHANIC"
            ? "NONE"
            : required.role === "CLIENT"
              ? "NONE"
              : "NONE",
      consent: normalizeConsent(undefined),
      shopId,
      createdAtIso: nowIso
    });
    changed = true;
  }

  for (let index = 0; index < profiles.length; index += 1) {
    const current = profiles[index];
    if (current.shopId) continue;
    profiles[index] = {
      ...current,
      shopId
    };
    changed = true;
  }

  if (changed) {
    await writeCollection("profiles", profiles);
  }

  try {
    await ensureComprehensiveDemoSeed();
  } catch (err) {
    console.error("[localStore] ensureComprehensiveDemoSeed failed (non-fatal):", err);
  }
}

export const ProfilesRepo = {
  async list(shopId?: string) {
    const profiles = await readCollection("profiles");
    if (shopId) return profiles.filter((p) => p.shopId === shopId);
    return profiles;
  },
  async getById(id: string) {
    const profiles = await readCollection("profiles");
    return profiles.find((profile) => profile.id === id) || null;
  },
  async getByPhone(phone: string) {
    const profiles = await readCollection("profiles");
    return profiles.find((profile) => profile.phone === phone) || null;
  },
  async upsertByPhone(input: {
    phone: string;
    name?: string;
    role: ProfileRole;
    status?: ProfileStatus;
    shopId?: string;
    onboardingStatus?: OnboardingStatus;
    termsAcceptedAtIso?: string;
    consent?: Partial<ProfileConsent>;
  }) {
    const profiles = await readCollection("profiles");
    const idx = profiles.findIndex((profile) => profile.phone === input.phone);
    if (idx >= 0) {
      const current = normalizeProfileRecord(profiles[idx]);
      const updated = normalizeProfileRecord({
        ...current,
        name: input.name ?? profiles[idx].name,
        role: input.role ?? profiles[idx].role,
        status: input.status ?? current.status,
        onboardingStatus: input.onboardingStatus ?? current.onboardingStatus,
        termsAcceptedAtIso: input.termsAcceptedAtIso ?? current.termsAcceptedAtIso,
        consent: {
          ...normalizeConsent(current.consent),
          ...(input.consent || {}),
          consentedAtIso: input.consent?.consentedAtIso || current.consent?.consentedAtIso
        },
        shopId: input.shopId ?? profiles[idx].shopId,
        lastLoginAtIso: new Date().toISOString()
      });
      profiles[idx] = updated;
      await writeCollection("profiles", profiles);
      return updated;
    }
    const profile = normalizeProfileRecord({
      id: buildId("prof"),
      phone: input.phone,
      name: input.name,
      role: input.role,
      status: input.status ?? "ACTIVE",
      onboardingStatus: input.onboardingStatus ?? defaultOnboardingStatusForRole(input.role),
      termsAcceptedAtIso: input.termsAcceptedAtIso,
      consent: {
        ...normalizeConsent(undefined),
        ...(input.consent || {})
      },
      shopId: input.shopId,
      createdAtIso: new Date().toISOString(),
      lastLoginAtIso: new Date().toISOString()
    });
    profiles.unshift(profile);
    await writeCollection("profiles", profiles);
    return profile;
  },
  async setStatus(id: string, status: ProfileStatus) {
    const profiles = await readCollection("profiles");
    const idx = profiles.findIndex((profile) => profile.id === id);
    if (idx === -1) return null;
    profiles[idx] = normalizeProfileRecord({ ...profiles[idx], status });
    await writeCollection("profiles", profiles);
    return profiles[idx];
  },
  async update(
    id: string,
    updates: Partial<Omit<ProfileRecord, "id" | "createdAtIso">>
  ) {
    const profiles = await readCollection("profiles");
    const idx = profiles.findIndex((profile) => profile.id === id);
    if (idx === -1) return null;
    profiles[idx] = normalizeProfileRecord({
      ...profiles[idx],
      ...updates
    });
    await writeCollection("profiles", profiles);
    return profiles[idx];
  },
  async listMechanics(shopId?: string) {
    const profiles = await readCollection("profiles");
    return profiles.filter((profile) => profile.role === "MECHANIC" && (!shopId || profile.shopId === shopId));
  },
  async getDefaultMechanic(shopId?: string) {
    const profiles = await readCollection("profiles");
    return profiles.find((profile) => profile.role === "MECHANIC" && profile.status === "ACTIVE" && (!shopId || profile.shopId === shopId)) || null;
  }
};

export const InvitesRepo = {
  async list(shopId?: string) {
    const invites = await readCollection("invites");
    if (shopId) return invites.filter((i) => i.shopId === shopId);
    return invites;
  },
  async create(input: { phone: string; name?: string; shopId: string; role?: "MECHANIC" | "CLIENT" }) {
    const invites = await readCollection("invites");
    const invite: InviteRecord = {
      id: buildId("inv"),
      token: randomToken(),
      role: input.role || "MECHANIC",
      phone: input.phone,
      name: input.name,
      shopId: input.shopId,
      createdAtIso: new Date().toISOString()
    };
    invites.unshift(invite);
    await writeCollection("invites", invites);
    return invite;
  },
  async consume(token: string) {
    const invites = await readCollection("invites");
    const idx = invites.findIndex((invite) => invite.token === token);
    if (idx === -1) return { invite: null, profile: null };
    const invite = invites[idx];
    if (invite.usedAtIso) return { invite, profile: null };
    const profile = await ProfilesRepo.upsertByPhone({
      phone: invite.phone,
      name: invite.name,
      role: invite.role || "MECHANIC",
      status: "ACTIVE",
      onboardingStatus: invite.role === "CLIENT" ? "CLIENT_PROFILE_INCOMPLETE" : "MECHANIC_PROFILE_INCOMPLETE",
      shopId: invite.shopId
    });
    invites[idx] = { ...invite, usedAtIso: new Date().toISOString() };
    await writeCollection("invites", invites);
    return { invite: invites[idx], profile };
  }
};

export const SessionsRepo = {
  async create(profileId: string, ttlMinutes: number) {
    const sessions = await readCollection("sessions");
    const now = Date.now();
    const session: SessionRecord = {
      id: buildId("sess"),
      profileId,
      createdAtIso: new Date(now).toISOString(),
      expiresAtIso: new Date(now + ttlMinutes * 60 * 1000).toISOString()
    };
    sessions.unshift(session);
    await writeCollection("sessions", sessions);
    return session;
  },
  async get(id: string) {
    const sessions = await readCollection("sessions");
    const session = sessions.find((entry) => entry.id === id);
    if (!session) return null;
    if (Date.now() > new Date(session.expiresAtIso).getTime()) {
      const filtered = sessions.filter((entry) => entry.id !== id);
      await writeCollection("sessions", filtered);
      return null;
    }
    return session;
  },
  async remove(id: string) {
    const sessions = await readCollection("sessions");
    const next = sessions.filter((entry) => entry.id !== id);
    if (next.length !== sessions.length) {
      await writeCollection("sessions", next);
    }
  }
};

export const ServiceItemsRepo = {
  async list(shopId?: string) {
    const items = await readCollection("serviceItems");
    const filtered = shopId ? items.filter((i) => i.shopId === shopId) : items;
    return filtered.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  },
  async listActive(shopId?: string) {
    const items = await this.list(shopId);
    return items.filter((item) => item.isActive);
  },
  async get(id: string) {
    const items = await readCollection("serviceItems");
    return items.find((item) => item.id === id) || null;
  },
  async create(input: Omit<ServiceItemRecord, "id" | "createdAtIso" | "updatedAtIso">) {
    const items = await readCollection("serviceItems");
    const now = new Date().toISOString();
    const item: ServiceItemRecord = {
      ...input,
      id: buildId("svc"),
      createdAtIso: now,
      updatedAtIso: now
    };
    items.unshift(item);
    await writeCollection("serviceItems", items);
    return item;
  },
  async update(id: string, updates: Partial<Omit<ServiceItemRecord, "id" | "createdAtIso">>) {
    const items = await readCollection("serviceItems");
    const idx = items.findIndex((item) => item.id === id);
    if (idx === -1) return null;
    const updated = { ...items[idx], ...updates, updatedAtIso: new Date().toISOString() };
    items[idx] = updated;
    await writeCollection("serviceItems", items);
    return updated;
  },
  async toggle(id: string, isActive: boolean) {
    return this.update(id, { isActive });
  }
};

export const BikesRepo = {
  async listByCustomer(customerProfileId: string) {
    const bikes = await readCollection("bikes");
    return bikes
      .filter((bike) => bike.customerProfileId === customerProfileId)
      .sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso));
  },
  async getById(id: string) {
    const bikes = await readCollection("bikes");
    return bikes.find((bike) => bike.id === id) || null;
  },
  async create(input: Omit<BikeRecord, "id" | "createdAtIso" | "updatedAtIso">) {
    const bikes = await readCollection("bikes");
    const nowIso = new Date().toISOString();
    const bike: BikeRecord = {
      ...input,
      id: buildId("bike"),
      createdAtIso: nowIso,
      updatedAtIso: nowIso
    };
    bikes.unshift(bike);
    await writeCollection("bikes", bikes);
    return bike;
  },
  async update(
    id: string,
    updates: Partial<Omit<BikeRecord, "id" | "customerProfileId" | "createdAtIso">>
  ) {
    const bikes = await readCollection("bikes");
    const idx = bikes.findIndex((bike) => bike.id === id);
    if (idx === -1) return null;
    bikes[idx] = {
      ...bikes[idx],
      ...updates,
      updatedAtIso: new Date().toISOString()
    };
    await writeCollection("bikes", bikes);
    return bikes[idx];
  },
  async remove(id: string) {
    const bikes = await readCollection("bikes");
    const next = bikes.filter((bike) => bike.id !== id);
    if (next.length === bikes.length) return false;
    await writeCollection("bikes", next);
    return true;
  }
};

export const ChatThreadsRepo = {
  async listByCustomer(customerProfileId: string) {
    const threads = await readCollection("chatThreads");
    return threads
      .filter((thread) => thread.customerProfileId === customerProfileId)
      .sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso));
  },
  async getById(id: string) {
    const threads = await readCollection("chatThreads");
    return threads.find((thread) => thread.id === id) || null;
  },
  async getOrCreateForCustomer(customerProfileId: string) {
    const threads = await this.listByCustomer(customerProfileId);
    if (threads[0]) return threads[0];
    const nowIso = new Date().toISOString();
    const next: ChatThreadRecord = {
      id: buildId("thread"),
      customerProfileId,
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
      messages: []
    };
    const all = await readCollection("chatThreads");
    all.unshift(next);
    await writeCollection("chatThreads", all);
    return next;
  },
  async appendMessage(threadId: string, message: ChatMessageRecord) {
    const all = await readCollection("chatThreads");
    const idx = all.findIndex((thread) => thread.id === threadId);
    if (idx === -1) return null;
    all[idx] = {
      ...all[idx],
      updatedAtIso: new Date().toISOString(),
      messages: [...all[idx].messages, message]
    };
    await writeCollection("chatThreads", all);
    return all[idx];
  }
};

export const BookingsRepo = {
  async list(shopId?: string) {
    const bookings = await readCollection("bookings");
    if (shopId) return bookings.filter((b) => b.shopId === shopId);
    return bookings;
  },
  async get(idOrRef: string) {
    const bookings = await readCollection("bookings");
    return bookings.find((booking) => booking.id === idOrRef || booking.ref === idOrRef) || null;
  },
  async listByCustomer(profileId: string) {
    const bookings = await readCollection("bookings");
    return bookings.filter((booking) => booking.customerProfileId === profileId);
  },
  async create(input: Omit<BookingRecord, "id" | "ref" | "createdAtIso" | "updatedAtIso">) {
    const bookings = await readCollection("bookings");
    const now = new Date().toISOString();
    const booking: BookingRecord = {
      id: buildId("bk"),
      ref: buildRef("BK"),
      createdAtIso: now,
      updatedAtIso: now,
      ...input
    };
    bookings.unshift(booking);
    await writeCollection("bookings", bookings);
    return booking;
  },
  async update(id: string, updates: Partial<Omit<BookingRecord, "id" | "ref" | "createdAtIso">>) {
    const bookings = await readCollection("bookings");
    const idx = bookings.findIndex((booking) => booking.id === id);
    if (idx === -1) return null;
    const updated = {
      ...bookings[idx],
      ...updates,
      updatedAtIso: new Date().toISOString()
    };
    bookings[idx] = updated;
    await writeCollection("bookings", bookings);
    return updated;
  }
};

export const JobCardsRepo = {
  async list(shopId?: string) {
    const cards = await readCollection("jobCards");
    if (shopId) return cards.filter((c) => c.shopId === shopId);
    return cards;
  },
  async get(idOrRef: string) {
    const cards = await readCollection("jobCards");
    return cards.find((card) => card.id === idOrRef || card.ref === idOrRef) || null;
  },
  async listByDate(dateIso: string, _shopId?: string) {
    const cards = await readCollection("jobCards");
    return cards.filter((card) => toDateIso(card.slotIso) === dateIso);
  },
  async listByMechanicAndDate(mechanicId: string, dateIso: string, _shopId?: string) {
    const cards = await this.listByDate(dateIso);
    return cards.filter((card) => card.assignedMechanicId === mechanicId);
  },
  async listByMechanicInRange(mechanicId: string, fromDateIso: string, untilDateIso: string) {
    const cards = await readCollection("jobCards");
    return cards
      .filter((card) => card.assignedMechanicId === mechanicId)
      .filter((card) => {
        const dateIso = toDateIso(card.slotIso);
        return dateIso >= fromDateIso && dateIso <= untilDateIso;
      })
      .sort((a, b) => new Date(a.slotIso).getTime() - new Date(b.slotIso).getTime());
  },
  async listInProgressByMechanic(mechanicId: string) {
    const activeStatuses: JobCardStatus[] = ["EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_APPROVAL"];
    const cards = await readCollection("jobCards");
    return cards
      .filter((card) => card.assignedMechanicId === mechanicId)
      .filter((card) => activeStatuses.includes(card.status))
      .sort((a, b) => new Date(a.slotIso).getTime() - new Date(b.slotIso).getTime());
  },
  async createFromBooking(
    booking: BookingRecord,
    service: { id?: string | null; durationMins: number },
    assignedMechanicId?: string | null
  ) {
    const cards = await readCollection("jobCards");
    const card: JobCardRecord = {
      id: buildId("jc"),
      ref: buildRef("JC"),
      bookingId: booking.id,
      bookingRef: booking.ref,
      assignedMechanicId: assignedMechanicId ?? null,
      slotIso: booking.slotIso,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      addressLine1: booking.addressLine1,
      suburb: booking.suburb,
      city: booking.city,
      serviceName: booking.serviceNameSnapshot,
      durationMinsSnapshot: service.durationMins,
      status: "SCHEDULED",
      shopId: booking.shopId,
      checklist: {},
      notes: booking.notes
        ? [{ id: buildId("note"), atIso: new Date().toISOString(), authorProfileId: booking.customerProfileId, text: booking.notes }]
        : [],
      partsUsed: [],
      additionalCharges: []
    };
    cards.unshift(card);
    await writeCollection("jobCards", cards);
    return card;
  },
  async updateStatus(id: string, status: JobCardStatus) {
    const cards = await readCollection("jobCards");
    const idx = cards.findIndex((card) => card.id === id);
    if (idx === -1) return null;
    cards[idx] = { ...cards[idx], status };
    await writeCollection("jobCards", cards);
    return cards[idx];
  },
  async reassignMechanic(id: string, assignedMechanicId?: string | null) {
    const cards = await readCollection("jobCards");
    const idx = cards.findIndex((card) => card.id === id);
    if (idx === -1) return null;
    cards[idx] = { ...cards[idx], assignedMechanicId: assignedMechanicId ?? null };
    await writeCollection("jobCards", cards);
    return cards[idx];
  },
  async reschedule(id: string, slotIso: string) {
    const cards = await readCollection("jobCards");
    const idx = cards.findIndex((card) => card.id === id);
    if (idx === -1) return null;
    cards[idx] = { ...cards[idx], slotIso };
    await writeCollection("jobCards", cards);
    return cards[idx];
  },
  async updateChecklist(id: string, checklist: JobCardChecklist) {
    const cards = await readCollection("jobCards");
    const idx = cards.findIndex((card) => card.id === id);
    if (idx === -1) return null;
    cards[idx] = { ...cards[idx], checklist };
    await writeCollection("jobCards", cards);
    return cards[idx];
  },
  async addNote(id: string, note: JobCardNote) {
    const cards = await readCollection("jobCards");
    const idx = cards.findIndex((card) => card.id === id);
    if (idx === -1) return null;
    cards[idx] = { ...cards[idx], notes: [...cards[idx].notes, note] };
    await writeCollection("jobCards", cards);
    return cards[idx];
  },
  async addPart(id: string, part: JobCardPart) {
    const cards = await readCollection("jobCards");
    const idx = cards.findIndex((card) => card.id === id);
    if (idx === -1) return null;
    cards[idx] = { ...cards[idx], partsUsed: [...cards[idx].partsUsed, part] };
    await writeCollection("jobCards", cards);
    return cards[idx];
  },
  async addAdditionalCharge(id: string, charge: JobCardAdditionalCharge) {
    const cards = await readCollection("jobCards");
    const idx = cards.findIndex((card) => card.id === id);
    if (idx === -1) return null;
    const current = cards[idx].additionalCharges || [];
    cards[idx] = { ...cards[idx], additionalCharges: [...current, charge] };
    await writeCollection("jobCards", cards);
    return cards[idx];
  },
  async decideAdditionalCharge(
    id: string,
    chargeId: string,
    decision: "APPROVED" | "REJECTED",
    decidedByProfileId?: string
  ) {
    const cards = await readCollection("jobCards");
    const idx = cards.findIndex((card) => card.id === id);
    if (idx === -1) return null;

    const charges = cards[idx].additionalCharges || [];
    const chargeIdx = charges.findIndex((charge) => charge.id === chargeId);
    if (chargeIdx === -1) return null;

    charges[chargeIdx] = {
      ...charges[chargeIdx],
      approvalStatus: decision,
      decidedAtIso: new Date().toISOString(),
      decidedByProfileId
    };
    cards[idx] = {
      ...cards[idx],
      additionalCharges: [...charges]
    };
    await writeCollection("jobCards", cards);
    return cards[idx];
  },
  async complete(id: string, completion: JobCardCompletion) {
    const cards = await readCollection("jobCards");
    const idx = cards.findIndex((card) => card.id === id);
    if (idx === -1) return null;
    cards[idx] = { ...cards[idx], status: "COMPLETED", completion };
    await writeCollection("jobCards", cards);
    return cards[idx];
  }
};

export const InvoicesRepo = {
  async list(shopId?: string) {
    const invoices = await readCollection("invoices");
    if (shopId) return invoices.filter((i) => i.shopId === shopId);
    return invoices;
  },
  async get(idOrRef: string) {
    const invoices = await readCollection("invoices");
    return invoices.find((invoice) => invoice.id === idOrRef || invoice.ref === idOrRef) || null;
  },
  async getByJobCardId(jobCardId: string) {
    const invoices = await readCollection("invoices");
    return invoices.find((invoice) => invoice.jobCardId === jobCardId) || null;
  },
  async create(input: Omit<InvoiceRecord, "id" | "ref">) {
    const invoices = await readCollection("invoices");
    const next: InvoiceRecord = {
      id: buildId("inv"),
      ref: buildRef("INV"),
      ...input
    };
    invoices.unshift(next);
    await writeCollection("invoices", invoices);
    return next;
  }
};

export const RatingsRepo = {
  async getByBookingId(bookingId: string) {
    const ratings = await readCollection("ratings");
    return ratings.find((r) => r.bookingId === bookingId) || null;
  },
  async create(input: { bookingId: string; customerProfileId: string; rating: number; comment?: string }) {
    const ratings = await readCollection("ratings");
    const existing = ratings.find((r) => r.bookingId === input.bookingId);
    if (existing) return existing;
    const record: RatingRecord = {
      id: buildId("rat"),
      bookingId: input.bookingId,
      customerProfileId: input.customerProfileId,
      rating: input.rating,
      comment: input.comment,
      createdAtIso: new Date().toISOString()
    };
    ratings.unshift(record);
    await writeCollection("ratings", ratings);
    return record;
  },
  async list(shopId?: string) {
    const ratings = await readCollection("ratings");
    if (!shopId) return ratings;
    const bookings = await readCollection("bookings");
    const shopBookingIds = new Set(bookings.filter((b) => b.shopId === shopId).map((b) => b.id));
    return ratings.filter((r) => shopBookingIds.has(r.bookingId));
  }
};

export const SupportTicketsRepo = {
  async list(shopId?: string) {
    const tickets = await readCollection("supportTickets");
    if (shopId) return tickets.filter((t) => t.shopId === shopId);
    return tickets;
  },
  async get(id: string) {
    const tickets = await readCollection("supportTickets");
    return tickets.find((t) => t.id === id) || null;
  },
  async create(input: {
    subject: string;
    description: string;
    category: SupportTicketCategory;
    priority: SupportTicketPriority;
    shopId: string;
    bookingId?: string;
    assigneeId?: string;
  }) {
    const tickets = await readCollection("supportTickets");
    const now = new Date().toISOString();
    const ticket: SupportTicketRecord = {
      id: buildId("tkt"),
      subject: input.subject,
      description: input.description,
      category: input.category,
      priority: input.priority,
      status: "open",
      bookingId: input.bookingId,
      assigneeId: input.assigneeId,
      shopId: input.shopId,
      notes: [],
      createdAtIso: now,
      updatedAtIso: now
    };
    tickets.unshift(ticket);
    await writeCollection("supportTickets", tickets);
    return ticket;
  },
  async update(id: string, updates: Partial<Pick<SupportTicketRecord, "status" | "priority" | "assigneeId" | "resolvedAtIso">>) {
    const tickets = await readCollection("supportTickets");
    const idx = tickets.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    tickets[idx] = { ...tickets[idx], ...updates, updatedAtIso: new Date().toISOString() };
    await writeCollection("supportTickets", tickets);
    return tickets[idx];
  },
  async addNote(id: string, note: { authorName: string; text: string }) {
    const tickets = await readCollection("supportTickets");
    const idx = tickets.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const newNote: SupportTicketNote = {
      id: buildId("tn"),
      authorName: note.authorName,
      text: note.text,
      createdAtIso: new Date().toISOString()
    };
    tickets[idx] = {
      ...tickets[idx],
      notes: [...tickets[idx].notes, newNote],
      updatedAtIso: new Date().toISOString()
    };
    await writeCollection("supportTickets", tickets);
    return tickets[idx];
  }
};

export const PricingRulesRepo = {
  async getActive(shopId?: string): Promise<PricingRuleRecord | null> {
    const rules = await readCollection("pricingRules");
    const sid = shopId || (await getDefaultShopId());
    const now = new Date().toISOString();
    const active = rules
      .filter((r) => r.shopId === sid && r.isActive && r.effectiveFrom <= now)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
    return active[0] || null;
  },
  async upsert(input: Omit<PricingRuleRecord, "createdAtIso" | "updatedAtIso">): Promise<PricingRuleRecord> {
    const rules = await readCollection("pricingRules");
    const idx = rules.findIndex((r) => r.id === input.id);
    const now = new Date().toISOString();
    if (idx >= 0) {
      rules[idx] = { ...rules[idx], ...input, updatedAtIso: now };
      await writeCollection("pricingRules", rules);
      return rules[idx];
    }
    const record: PricingRuleRecord = { ...input, createdAtIso: now, updatedAtIso: now };
    rules.push(record);
    await writeCollection("pricingRules", rules);
    return record;
  }
};

export const AvailabilityBlocksRepo = {
  async list(shopId?: string): Promise<AvailabilityBlockRecord[]> {
    const blocks = await readCollection("availabilityBlocks");
    const sid = shopId || (await getDefaultShopId());
    return blocks.filter((b) => b.shopId === sid).sort((a, b) => a.date.localeCompare(b.date));
  },
  async create(input: { shopId: string; date: string; reason?: string; isEmergency?: boolean }): Promise<AvailabilityBlockRecord> {
    const blocks = await readCollection("availabilityBlocks");
    const record: AvailabilityBlockRecord = {
      id: buildId("avblk"),
      shopId: input.shopId,
      date: input.date,
      reason: input.reason,
      isEmergency: input.isEmergency ?? false,
      createdAtIso: new Date().toISOString()
    };
    blocks.push(record);
    await writeCollection("availabilityBlocks", blocks);
    return record;
  },
  async remove(id: string): Promise<boolean> {
    const blocks = await readCollection("availabilityBlocks");
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return false;
    blocks.splice(idx, 1);
    await writeCollection("availabilityBlocks", blocks);
    return true;
  }
};

// ─── Leads ───────────────────────────────────────────────────────────────────

export const LeadsRepo = {
  async create(input: { name: string; email: string; phone?: string | null; company?: string | null; formType: string; message?: string | null; utmSource?: string | null; utmMedium?: string | null; utmCampaign?: string | null }): Promise<LeadRecord> {
    const leads = await readCollection("leads");
    const now = new Date().toISOString();
    const lead: LeadRecord = {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      company: input.company || null,
      formType: input.formType,
      message: input.message || null,
      utmSource: input.utmSource || null,
      utmMedium: input.utmMedium || null,
      utmCampaign: input.utmCampaign || null,
      status: "NEW",
      createdAtIso: now,
      updatedAtIso: now,
    };
    leads.push(lead);
    await writeCollection("leads", leads);
    return lead;
  },
  async list(): Promise<LeadRecord[]> {
    return readCollection("leads");
  },
};

export function toDateIso(isoString: string) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Johannesburg"
  }).format(date);
}

export async function getProfileForSession(sessionId: string) {
  const session = await SessionsRepo.get(sessionId);
  if (!session) return null;
  return ProfilesRepo.getById(session.profileId);
}

export async function createSession(profileId: string, ttlMinutes: number) {
  return SessionsRepo.create(profileId, ttlMinutes);
}

export async function removeSession(id: string) {
  return SessionsRepo.remove(id);
}

export async function ensureServiceSeed() {
  const items = await ServiceItemsRepo.list();
  if (items.length > 0) return;
  const shopId = await getDefaultShopId();
  const seed = [
    ["Minor Tune-up", "Full safety check, drivetrain clean, brakes and gears tuned.", 85000, 90, "tune"],
    ["Standard Service", "Deep clean, cable inspection, wheel true, full adjustments.", 125000, 120, "service"],
    ["Major Service", "Complete strip, bearing checks, and full rebuild tune.", 175000, 180, "service"],
    ["Race Prep", "Pre-event setup, torque check, and performance inspection.", 140000, 120, "performance"],
    ["Suspension Service", "Fork and shock service with seal/lube refresh.", 220000, 180, "suspension"],
    ["Brake Overhaul", "Hydraulic bleed, rotor alignment, pad replacement.", 95000, 90, "brakes"],
    ["Drivetrain Refresh", "Cassette wear check, chain replacement, indexing.", 110000, 90, "drivetrain"],
    ["Wheel True & Tension", "Lateral/radial true and spoke tension balancing.", 70000, 60, "wheels"],
    ["E-Bike Diagnostics", "Firmware checks, motor diagnostics, safety test.", 180000, 120, "e-bike"],
    ["Bike Wash & Detail", "Deep clean, polish, and drivetrain relube.", 45000, 45, "detail"]
  ] as const;
  for (const [name, description, basePriceCents, durationMins, category] of seed) {
    await ServiceItemsRepo.create({
      name,
      description,
      basePriceCents,
      durationMins,
      category,
      isActive: true,
      sortOrder: seed.findIndex((entry) => entry[0] === name) + 1,
      shopId
    });
  }
}

export async function getJobCard(idOrRef: string) {
  return JobCardsRepo.get(idOrRef);
}

export async function listJobCardsByDate(dateIso: string, shopId?: string) {
  return JobCardsRepo.listByDate(dateIso, shopId);
}

export async function listJobCardsByMechanicAndDate(mechanicId: string, dateIso: string, shopId?: string) {
  return JobCardsRepo.listByMechanicAndDate(mechanicId, dateIso, shopId);
}

export async function listJobCardsByMechanicInRange(
  mechanicId: string,
  fromDateIso: string,
  toDateIso: string
) {
  return JobCardsRepo.listByMechanicInRange(mechanicId, fromDateIso, toDateIso);
}

export async function listInProgressJobCardsByMechanic(mechanicId: string) {
  return JobCardsRepo.listInProgressByMechanic(mechanicId);
}

export async function updateJobCardStatus(id: string, status: JobCardStatus) {
  return JobCardsRepo.updateStatus(id, status);
}

export async function appendJobCardNote(id: string, text: string, authorProfileId?: string) {
  return JobCardsRepo.addNote(id, {
    id: buildId("note"),
    atIso: new Date().toISOString(),
    authorProfileId,
    text
  });
}

export async function completeJobCard(
  id: string,
  payload: { customerName: string; approved: boolean; summary?: string }
) {
  return JobCardsRepo.complete(id, {
    completedAtIso: new Date().toISOString(),
    summary: payload.summary,
    customerSignoffName: payload.customerName,
    customerSignoffAccepted: payload.approved
  });
}
