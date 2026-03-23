import crypto from "node:crypto";
import { prisma, withShopContext } from "./prismaClient";
import type { PricingSnapshot } from "@/lib/pricing/schema";
import { resolveWorkshopRole } from "@/src/lib/auth/roles";
import { listNotificationEvents, logNotificationEvent } from "@/src/lib/workshop/notifications";
import type {
  ProfileRole, ProfileStatus, OnboardingStatus, ProfileConsent, ProfileRecord, InviteRecord, SessionRecord,
  ServiceItemRecord, BikeRecord, ChatThreadRecord, ChatMessageRecord,
  BookingRecord, BookingStatus, JobCardRecord, JobCardStatus, JobCardChecklist, ShopStatus,
  ShopBusinessDetails, ShopOperationalDefaults,
  JobCardNote, JobCardPart, JobCardAdditionalCharge, JobCardCompletion,
  InvoiceRecord, InvoiceLineItem, RatingRecord, ShopRecord,
  SupportTicketCategory, SupportTicketPriority, SupportTicketRecord, SupportTicketNote as SupportTicketNoteRecord
} from "./localStore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toIso(d: Date): string { return d.toISOString(); }

function buildRef(prefix: string) {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `${prefix}-${y}${m}${day}-${rand}`;
}

function randomToken() { return crypto.randomBytes(18).toString("base64url"); }

function slotIsoAt(daysFromNow: number, hourLocal: number, minuteLocal = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  // Africa/Johannesburg is UTC+2 and does not observe DST.
  date.setUTCHours(hourLocal - 2, minuteLocal, 0, 0);
  return date.toISOString();
}

function defaultOnboardingStatusForRole(role: ProfileRole): OnboardingStatus {
  if (role === "CLIENT" || role === "CUSTOMER") return "CLIENT_PROFILE_INCOMPLETE";
  if (role === "MECHANIC") return "NONE";
  if (role === "SHOP_OWNER") return "SHOP_ACTIVE";
  return "NONE";
}

function normalizeConsent(value?: Partial<ProfileConsent> | null): ProfileConsent {
  return {
    whatsappOptIn: Boolean(value?.whatsappOptIn),
    marketingOptIn: Boolean(value?.marketingOptIn),
    consentedAtIso: value?.consentedAtIso
  };
}

function normalizeShopStatus(value?: unknown): ShopStatus {
  if (value === "DRAFT" || value === "PENDING_APPROVAL" || value === "ACTIVE" || value === "REJECTED") {
    return value;
  }
  return "ACTIVE";
}

function defaultOperationalDefaults(): ShopOperationalDefaults {
  return {
    noticeHours: 24,
    assignmentMode: "AUTO",
    workingHours: [
      { day: "Mon", start: "08:00", end: "18:00", active: true },
      { day: "Tue", start: "08:00", end: "18:00", active: true },
      { day: "Wed", start: "08:00", end: "18:00", active: true },
      { day: "Thu", start: "08:00", end: "18:00", active: true },
      { day: "Fri", start: "08:00", end: "18:00", active: true },
      { day: "Sat", start: "08:00", end: "18:00", active: true },
      { day: "Sun", start: "08:00", end: "18:00", active: false }
    ]
  };
}

function toPrismaRole(role: ProfileRole) {
  if (role === "MECHANIC") return "MECHANIC";
  if (role === "CLIENT" || role === "CUSTOMER") return "CUSTOMER";
  return "ADMIN";
}

function toPrismaStatus(status?: ProfileStatus) {
  if (status === "INACTIVE") return "INACTIVE";
  if (status === "PENDING_APPROVAL") return "INACTIVE";
  return "ACTIVE";
}

export function toDateIso(isoString: string) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit",
    timeZone: "Africa/Johannesburg"
  }).format(date);
}

// ─── Shop ────────────────────────────────────────────────────────────────────

function mapShop(s: { id: string; slug: string; name: string; phone: string | null; whatsapp: string | null; email: string | null; baseLocation: string | null; themeTokens: any; businessHours: string | null; createdAt: Date; updatedAt: Date }): ShopRecord {
  const themeTokens = (s.themeTokens as Record<string, unknown> | null) || {};
  const businessDetails = (themeTokens.businessDetails as ShopBusinessDetails | undefined) || {
    name: s.name,
    address: s.baseLocation || "",
    city: "",
    contactEmail: s.email || "",
    contactPhone: s.phone || ""
  };
  const operationalDefaults = (themeTokens.operationalDefaults as ShopOperationalDefaults | undefined) || defaultOperationalDefaults();
  const serviceModels = (themeTokens.serviceModels as ShopRecord["serviceModels"]) ?? undefined;
  // customDomains stored in themeTokens JSON until DB migration adds native column
  const customDomains = Array.isArray(themeTokens.customDomains) ? themeTokens.customDomains as string[] : [];
  return {
    id: s.id, slug: s.slug, name: s.name,
    shopStatus: normalizeShopStatus(themeTokens.shopStatus),
    createdByProfileId: typeof themeTokens.createdByProfileId === "string" ? themeTokens.createdByProfileId : undefined,
    phone: s.phone ?? undefined, whatsapp: s.whatsapp ?? undefined,
    email: s.email ?? undefined, baseLocation: s.baseLocation ?? undefined,
    themeTokens: themeTokens ?? undefined, businessHours: s.businessHours ?? undefined,
    customDomains,
    businessDetails,
    operationalDefaults,
    serviceModels,
    submittedAtIso: typeof themeTokens.submittedAtIso === "string" ? themeTokens.submittedAtIso : undefined,
    approvedAtIso: typeof themeTokens.approvedAtIso === "string" ? themeTokens.approvedAtIso : undefined,
    rejectedAtIso: typeof themeTokens.rejectedAtIso === "string" ? themeTokens.rejectedAtIso : undefined,
    rejectionReason: typeof themeTokens.rejectionReason === "string" ? themeTokens.rejectionReason : undefined,
    createdAtIso: toIso(s.createdAt), updatedAtIso: toIso(s.updatedAt)
  };
}

const DEFAULT_CUSTOM_DOMAINS = ["book.servicemybikejoburg.co.za"];
const DEFAULT_THEME_TOKENS = { primaryColor: "#0f4d73", shopName: "ServiceMyBike Joburg" };

export async function getDefaultShopId(): Promise<string> {
  // Check env var override first
  if (process.env.DEFAULT_SHOP_ID) {
    return process.env.DEFAULT_SHOP_ID;
  }

  const shops = await prisma.shop.findMany({ orderBy: { createdAt: "asc" } });
  const mapped = shops.map(mapShop);
  const active = mapped.find((shop) => shop.shopStatus === "ACTIVE");
  if (active) return active.id;

  if (mapped.length > 0) return mapped[0].id;

  // Fallback: create default shop
  const created = await prisma.shop.create({
    data: {
      slug: "servicemybike",
      name: "ServiceMyBike Joburg",
      themeTokens: {
        shopStatus: "ACTIVE",
        operationalDefaults: defaultOperationalDefaults(),
        customDomains: DEFAULT_CUSTOM_DOMAINS,
        ...DEFAULT_THEME_TOKENS,
      } as any
    }
  });
  return created.id;
}

export const ShopRepo = {
  async getById(id: string) {
    const s = await prisma.shop.findUnique({ where: { id } });
    return s ? mapShop(s) : null;
  },
  async getBySlug(slug: string) {
    const s = await prisma.shop.findUnique({ where: { slug } });
    return s ? mapShop(s) : null;
  },
  async getByDomain(hostname: string) {
    // customDomains stored in themeTokens JSON until DB migration adds native column
    const rows = await prisma.shop.findMany();
    const mapped = rows.map(mapShop);
    return mapped.find((s) => s.shopStatus === "ACTIVE" && s.customDomains?.includes(hostname)) || null;
  },
  async getDefault() {
    const rows = await prisma.shop.findMany({ orderBy: { createdAt: "asc" } });
    const mapped = rows.map(mapShop);
    return mapped.find((shop) => shop.shopStatus === "ACTIVE") || mapped[0] || null;
  },
  async list() {
    const rows = await prisma.shop.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(mapShop);
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
    serviceModels?: ShopRecord["serviceModels"];
    submittedAtIso?: string;
    approvedAtIso?: string;
    rejectedAtIso?: string;
    rejectionReason?: string;
  }) {
    const baseTokens: Record<string, unknown> = {
      shopStatus: input.shopStatus || "ACTIVE",
      createdByProfileId: input.createdByProfileId || null,
      businessDetails: input.businessDetails || {
        name: input.name,
        address: input.baseLocation || "",
        city: "",
        contactEmail: input.email || "",
        contactPhone: input.phone || ""
      },
      operationalDefaults: {
        ...defaultOperationalDefaults(),
        ...(input.operationalDefaults || {})
      },
      ...(input.serviceModels && { serviceModels: input.serviceModels }),
      submittedAtIso: input.submittedAtIso || null,
      approvedAtIso: input.approvedAtIso || null,
      rejectedAtIso: input.rejectedAtIso || null,
      rejectionReason: input.rejectionReason || null
    };
    const s = await prisma.shop.create({
      data: {
        slug: input.slug,
        name: input.name,
        phone: input.phone,
        whatsapp: input.whatsapp,
        email: input.email,
        baseLocation: input.baseLocation,
        businessHours: input.businessHours,
        themeTokens: baseTokens as any
      }
    });
    return mapShop(s);
  },
  async update(id: string, updates: Partial<Omit<ShopRecord, "id" | "slug" | "createdAtIso">>) {
    try {
      const current = await prisma.shop.findUnique({ where: { id } });
      if (!current) return null;
      const currentTokens = (current.themeTokens as Record<string, unknown> | null) || {};
      const nextTokens = {
        ...currentTokens,
        ...(updates.themeTokens || {}),
        ...(updates.shopStatus ? { shopStatus: updates.shopStatus } : {}),
        ...(updates.createdByProfileId ? { createdByProfileId: updates.createdByProfileId } : {}),
        ...(updates.businessDetails ? { businessDetails: updates.businessDetails } : {}),
        ...(updates.operationalDefaults ? { operationalDefaults: updates.operationalDefaults } : {}),
        ...(updates.serviceModels !== undefined ? { serviceModels: updates.serviceModels } : {}),
        ...(updates.submittedAtIso !== undefined ? { submittedAtIso: updates.submittedAtIso } : {}),
        ...(updates.approvedAtIso !== undefined ? { approvedAtIso: updates.approvedAtIso } : {}),
        ...(updates.rejectedAtIso !== undefined ? { rejectedAtIso: updates.rejectedAtIso } : {}),
        ...(updates.rejectionReason !== undefined ? { rejectionReason: updates.rejectionReason } : {})
      };
      const s = await prisma.shop.update({
        where: { id },
        data: {
          name: updates.name,
          phone: updates.phone,
          whatsapp: updates.whatsapp,
          email: updates.email,
          baseLocation: updates.baseLocation,
          businessHours: updates.businessHours,
          themeTokens: nextTokens as any
        }
      });
      return mapShop(s);
    } catch { return null; }
  }
};

// ─── Profiles ─────────────────────────────────────────────────────────────────

function mapProfile(p: { id: string; phone: string; name: string | null; role: string; status: string; shopId: string | null; createdAt: Date; updatedAt: Date; lastLoginAt: Date | null }): ProfileRecord {
  const role = resolveWorkshopRole({
    role: p.role,
    phone: p.phone,
    name: p.name,
    shopId: p.shopId
  }) as ProfileRole;
  return {
    id: p.id, phone: p.phone, name: p.name ?? undefined,
    email: undefined,
    suburb: undefined,
    city: undefined,
    preferredMechanicId: undefined,
    role,
    status: p.status as ProfileStatus,
    onboardingStatus: defaultOnboardingStatusForRole(role),
    consent: normalizeConsent(undefined),
    shopId: p.shopId ?? undefined,
    specialties: undefined,
    availability: undefined,
    createdAtIso: toIso(p.createdAt), lastLoginAtIso: p.lastLoginAt ? toIso(p.lastLoginAt) : undefined
  };
}

export const ProfilesRepo = {
  async list(shopId?: string) {
    const where = shopId ? { shopId } : {};
    const rows = await prisma.profile.findMany({ where, orderBy: { createdAt: "desc" } });
    return rows.map(mapProfile);
  },
  async getById(id: string) {
    const p = await prisma.profile.findUnique({ where: { id } });
    return p ? mapProfile(p) : null;
  },
  async getByPhone(phone: string) {
    const p = await prisma.profile.findUnique({ where: { phone } });
    return p ? mapProfile(p) : null;
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
    const role = toPrismaRole(input.role);
    const status = toPrismaStatus(input.status);
    const p = await prisma.profile.upsert({
      where: { phone: input.phone },
      update: { name: input.name, role, status, shopId: input.shopId, lastLoginAt: new Date() },
      create: { phone: input.phone, name: input.name, role, status, shopId: input.shopId, lastLoginAt: new Date() }
    });
    const mapped = mapProfile(p);
    return {
      ...mapped,
      onboardingStatus: input.onboardingStatus || mapped.onboardingStatus,
      termsAcceptedAtIso: input.termsAcceptedAtIso,
      consent: normalizeConsent(input.consent)
    };
  },
  async setStatus(id: string, status: ProfileStatus) {
    try {
      const p = await prisma.profile.update({ where: { id }, data: { status: toPrismaStatus(status) as any } });
      return mapProfile(p);
    } catch { return null; }
  },
  async update(
    id: string,
    updates: Partial<Omit<ProfileRecord, "id" | "createdAtIso">>
  ) {
    try {
      const p = await prisma.profile.update({
        where: { id },
        data: {
          phone: updates.phone,
          name: updates.name,
          role: updates.role ? toPrismaRole(updates.role as ProfileRole) : undefined,
          status: updates.status ? toPrismaStatus(updates.status as ProfileStatus) as any : undefined,
          shopId: updates.shopId
        }
      });
      return mapProfile(p);
    } catch {
      return null;
    }
  },
  async listMechanics(shopId?: string) {
    const where: any = { role: "MECHANIC" };
    if (shopId) where.shopId = shopId;
    const rows = await prisma.profile.findMany({ where });
    return rows.map(mapProfile);
  },
  async getDefaultMechanic(shopId?: string) {
    const where: any = { role: "MECHANIC", status: "ACTIVE" };
    if (shopId) where.shopId = shopId;
    const p = await prisma.profile.findFirst({ where });
    return p ? mapProfile(p) : null;
  }
};

// ─── Invites ──────────────────────────────────────────────────────────────────

function mapInvite(i: { id: string; token: string; role: string; phone: string; name: string | null; shopId: string; createdAt: Date; usedAt: Date | null }): InviteRecord {
  return {
    id: i.id, token: i.token, role: (i.role === "CUSTOMER" ? "CLIENT" : "MECHANIC") as "MECHANIC" | "CLIENT",
    phone: i.phone, name: i.name ?? undefined, shopId: i.shopId,
    createdAtIso: toIso(i.createdAt), usedAtIso: i.usedAt ? toIso(i.usedAt) : undefined
  };
}

export const InvitesRepo = {
  async list(shopId?: string) {
    if (!shopId) {
      console.warn("[SECURITY] InvitesRepo.list() called without shopId - returning empty");
      return [];
    }
    return withShopContext(shopId, async (tx) => {
      const rows = await tx.invite.findMany({ where: { shopId }, orderBy: { createdAt: "desc" } });
      return rows.map(mapInvite);
    });
  },
  async create(input: { phone: string; name?: string; shopId: string; role?: "MECHANIC" | "CLIENT" }) {
    // Prisma enum uses CUSTOMER; localStore uses CLIENT — map here
    const prismaRole = input.role === "CLIENT" ? "CUSTOMER" as const : "MECHANIC" as const;
    const i = await prisma.invite.create({
      data: { token: randomToken(), role: prismaRole, phone: input.phone, name: input.name, shopId: input.shopId }
    });
    return mapInvite(i);
  },
  async consume(token: string) {
    const i = await prisma.invite.findUnique({ where: { token } });
    if (!i) return { invite: null, profile: null };
    if (i.usedAt) return { invite: mapInvite(i), profile: null };
    const role = (i.role === "CUSTOMER" ? "CLIENT" : "MECHANIC") as "MECHANIC" | "CLIENT";
    const profile = await ProfilesRepo.upsertByPhone({
      phone: i.phone,
      name: i.name ?? undefined,
      role,
      status: "ACTIVE",
      onboardingStatus: role === "CLIENT" ? "CLIENT_PROFILE_INCOMPLETE" : "MECHANIC_PROFILE_INCOMPLETE",
      shopId: i.shopId
    });
    const updated = await prisma.invite.update({ where: { id: i.id }, data: { usedAt: new Date() } });
    return { invite: mapInvite(updated), profile };
  }
};

// ─── Sessions ─────────────────────────────────────────────────────────────────

function mapSession(s: { id: string; profileId: string; createdAt: Date; expiresAt: Date }): SessionRecord {
  return { id: s.id, profileId: s.profileId, createdAtIso: toIso(s.createdAt), expiresAtIso: toIso(s.expiresAt) };
}

export const SessionsRepo = {
  async create(profileId: string, ttlMinutes: number) {
    const s = await prisma.session.create({
      data: { profileId, expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000) }
    });
    return mapSession(s);
  },
  async get(id: string) {
    const s = await prisma.session.findUnique({ where: { id } });
    if (!s) return null;
    if (Date.now() > s.expiresAt.getTime()) {
      await prisma.session.delete({ where: { id } }).catch(() => {});
      return null;
    }
    return mapSession(s);
  },
  async remove(id: string) {
    await prisma.session.delete({ where: { id } }).catch(() => {});
  }
};

// ─── Service Items ────────────────────────────────────────────────────────────

function mapServiceItem(s: { id: string; name: string; description: string | null; basePriceCents: number; durationMins: number; category: string | null; isActive: boolean; sortOrder: number; shopId: string; createdAt: Date; updatedAt: Date }): ServiceItemRecord {
  return {
    id: s.id, name: s.name, description: s.description ?? undefined,
    basePriceCents: s.basePriceCents, durationMins: s.durationMins,
    category: s.category ?? undefined, isActive: s.isActive, sortOrder: s.sortOrder,
    shopId: s.shopId,
    createdAtIso: toIso(s.createdAt), updatedAtIso: toIso(s.updatedAt)
  };
}

export const ServiceItemsRepo = {
  async list(shopId?: string) {
    if (!shopId) {
      console.warn("[SECURITY] ServiceItemsRepo.list() called without shopId - returning empty");
      return [];
    }
    return withShopContext(shopId, async (tx) => {
      const rows = await tx.serviceItem.findMany({ where: { shopId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
      return rows.map(mapServiceItem);
    });
  },
  async listActive(shopId?: string) {
    if (!shopId) {
      console.warn("[SECURITY] ServiceItemsRepo.listActive() called without shopId - returning empty");
      return [];
    }
    return withShopContext(shopId, async (tx) => {
      const rows = await tx.serviceItem.findMany({ where: { isActive: true as const, shopId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
      return rows.map(mapServiceItem);
    });
  },
  async get(id: string) {
    const s = await prisma.serviceItem.findUnique({ where: { id } });
    return s ? mapServiceItem(s) : null;
  },
  async create(input: Omit<ServiceItemRecord, "id" | "createdAtIso" | "updatedAtIso">) {
    const s = await prisma.serviceItem.create({
      data: { name: input.name, description: input.description, basePriceCents: input.basePriceCents, durationMins: input.durationMins, category: input.category, isActive: input.isActive, sortOrder: input.sortOrder, shopId: input.shopId }
    });
    return mapServiceItem(s);
  },
  async update(id: string, updates: Partial<Omit<ServiceItemRecord, "id" | "createdAtIso">>) {
    try {
      const s = await prisma.serviceItem.update({ where: { id }, data: { name: updates.name, description: updates.description, basePriceCents: updates.basePriceCents, durationMins: updates.durationMins, category: updates.category, isActive: updates.isActive, sortOrder: updates.sortOrder } });
      return mapServiceItem(s);
    } catch { return null; }
  },
  async toggle(id: string, isActive: boolean) {
    return this.update(id, { isActive });
  }
};

// ─── Bikes ────────────────────────────────────────────────────────────────────

function mapBike(b: { id: string; customerProfileId: string; bikeType: string; brand: string; model: string | null; drivetrainType: string | null; brakeType: string | null; eBike: boolean; notes: string | null; createdAt: Date; updatedAt: Date }): BikeRecord {
  return {
    id: b.id, customerProfileId: b.customerProfileId,
    bikeType: b.bikeType as BikeRecord["bikeType"],
    brand: b.brand, model: b.model ?? undefined, drivetrainType: b.drivetrainType ?? undefined,
    brakeType: b.brakeType ?? undefined, eBike: b.eBike, notes: b.notes ?? undefined,
    createdAtIso: toIso(b.createdAt), updatedAtIso: toIso(b.updatedAt)
  };
}

export const BikesRepo = {
  async listByCustomer(customerProfileId: string) {
    const rows = await prisma.bike.findMany({ where: { customerProfileId }, orderBy: { updatedAt: "desc" } });
    return rows.map(mapBike);
  },
  async getById(id: string) {
    const b = await prisma.bike.findUnique({ where: { id } });
    return b ? mapBike(b) : null;
  },
  async create(input: Omit<BikeRecord, "id" | "createdAtIso" | "updatedAtIso">) {
    const b = await prisma.bike.create({
      data: { customerProfileId: input.customerProfileId, bikeType: input.bikeType as any, brand: input.brand, model: input.model, drivetrainType: input.drivetrainType, brakeType: input.brakeType, eBike: input.eBike, notes: input.notes }
    });
    return mapBike(b);
  },
  async update(id: string, updates: Partial<Omit<BikeRecord, "id" | "customerProfileId" | "createdAtIso">>) {
    try {
      const b = await prisma.bike.update({ where: { id }, data: { bikeType: updates.bikeType as any, brand: updates.brand, model: updates.model, drivetrainType: updates.drivetrainType, brakeType: updates.brakeType, eBike: updates.eBike, notes: updates.notes } });
      return mapBike(b);
    } catch { return null; }
  },
  async remove(id: string) {
    try { await prisma.bike.delete({ where: { id } }); return true; }
    catch { return false; }
  }
};

// ─── Chat Threads ─────────────────────────────────────────────────────────────

function mapThread(t: { id: string; customerProfileId: string; createdAt: Date; updatedAt: Date; messages: { id: string; role: string; text: string; createdAt: Date }[] }): ChatThreadRecord {
  return {
    id: t.id, customerProfileId: t.customerProfileId,
    createdAtIso: toIso(t.createdAt), updatedAtIso: toIso(t.updatedAt),
    messages: t.messages.map((m) => ({ id: m.id, atIso: toIso(m.createdAt), role: m.role as ChatMessageRecord["role"], text: m.text }))
  };
}

const threadInclude = { messages: { orderBy: { createdAt: "asc" as const } } };

export const ChatThreadsRepo = {
  async listByCustomer(customerProfileId: string) {
    const rows = await prisma.chatThread.findMany({ where: { customerProfileId }, include: threadInclude, orderBy: { updatedAt: "desc" } });
    return rows.map(mapThread);
  },
  async getById(id: string) {
    const t = await prisma.chatThread.findUnique({ where: { id }, include: threadInclude });
    return t ? mapThread(t) : null;
  },
  async getOrCreateForCustomer(customerProfileId: string) {
    const existing = await prisma.chatThread.findFirst({ where: { customerProfileId }, include: threadInclude, orderBy: { updatedAt: "desc" } });
    if (existing) return mapThread(existing);
    const t = await prisma.chatThread.create({ data: { customerProfileId }, include: threadInclude });
    return mapThread(t);
  },
  async appendMessage(threadId: string, message: ChatMessageRecord) {
    const t = await prisma.chatThread.update({
      where: { id: threadId },
      data: { messages: { create: { role: message.role, text: message.text } } },
      include: threadInclude
    }).catch(() => null);
    return t ? mapThread(t) : null;
  }
};

// ─── Bookings ─────────────────────────────────────────────────────────────────

function mapBooking(b: { id: string; ref: string; customerProfileId: string | null; customerName: string; customerPhone: string; serviceItemId: string | null; selectedPackageId: string | null; serviceNameSnapshot: string; addressLine1: string; suburb: string | null; city: string | null; notes: string | null; slotIso: string; status: string; pricingSnapshotJson: unknown; shopId: string; cancelReason: string | null; amendedAt: Date | null; createdAt: Date; updatedAt: Date }): BookingRecord {
  return {
    id: b.id, ref: b.ref, customerProfileId: b.customerProfileId ?? undefined,
    customerName: b.customerName, customerPhone: b.customerPhone,
    serviceItemId: b.serviceItemId ?? undefined,
    selectedPackageId: b.selectedPackageId ?? undefined,
    serviceNameSnapshot: b.serviceNameSnapshot,
    addressLine1: b.addressLine1, suburb: b.suburb ?? undefined, city: b.city ?? undefined,
    notes: b.notes ?? undefined, slotIso: b.slotIso, status: b.status as BookingStatus,
    pricingSnapshot: b.pricingSnapshotJson ? b.pricingSnapshotJson as PricingSnapshot : undefined,
    shopId: b.shopId,
    cancelReason: b.cancelReason ?? undefined, amendedAtIso: b.amendedAt ? toIso(b.amendedAt) : undefined,
    createdAtIso: toIso(b.createdAt), updatedAtIso: toIso(b.updatedAt)
  };
}

export const BookingsRepo = {
  async list(shopId?: string) {
    if (!shopId) {
      console.warn("[SECURITY] BookingsRepo.list() called without shopId - returning empty");
      return [];
    }
    return withShopContext(shopId, async (tx) => {
      const rows = await tx.booking.findMany({ where: { shopId }, orderBy: { createdAt: "desc" } });
      return rows.map(mapBooking);
    });
  },
  async get(idOrRef: string) {
    const b = await prisma.booking.findFirst({ where: { OR: [{ id: idOrRef }, { ref: idOrRef }] } });
    return b ? mapBooking(b) : null;
  },
  async listByCustomer(profileId: string) {
    const rows = await prisma.booking.findMany({ where: { customerProfileId: profileId }, orderBy: { createdAt: "desc" } });
    return rows.map(mapBooking);
  },
  async create(input: Omit<BookingRecord, "id" | "ref" | "createdAtIso" | "updatedAtIso">) {
    const b = await prisma.booking.create({
      data: {
        ref: buildRef("BK"), customerProfileId: input.customerProfileId,
        customerName: input.customerName, customerPhone: input.customerPhone,
        serviceItemId: input.serviceItemId,
        selectedPackageId: input.selectedPackageId,
        serviceNameSnapshot: input.serviceNameSnapshot,
        addressLine1: input.addressLine1, suburb: input.suburb, city: input.city,
        notes: input.notes, slotIso: input.slotIso, status: input.status as any,
        pricingSnapshotJson: input.pricingSnapshot as any,
        shopId: input.shopId,
        cancelReason: input.cancelReason
      }
    });
    return mapBooking(b);
  },
  async update(id: string, updates: Partial<Omit<BookingRecord, "id" | "ref" | "createdAtIso">>) {
    try {
      const b = await prisma.booking.update({
        where: { id },
        data: {
          customerName: updates.customerName, customerPhone: updates.customerPhone,
          addressLine1: updates.addressLine1, suburb: updates.suburb, city: updates.city,
          notes: updates.notes, slotIso: updates.slotIso, status: updates.status as any,
          serviceItemId: updates.serviceItemId,
          selectedPackageId: updates.selectedPackageId,
          pricingSnapshotJson: updates.pricingSnapshot === undefined ? undefined : updates.pricingSnapshot as any,
          cancelReason: updates.cancelReason,
          amendedAt: updates.amendedAtIso ? new Date(updates.amendedAtIso) : undefined
        }
      });
      return mapBooking(b);
    } catch { return null; }
  }
};

// ─── Job Cards ────────────────────────────────────────────────────────────────

type PrismaJobCard = {
  id: string; ref: string; bookingId: string; bookingRef: string;
  assignedMechanicId: string | null; slotIso: string; customerName: string;
  customerPhone: string; addressLine1: string; suburb: string | null; city: string | null;
  serviceName: string; durationMinsSnapshot: number; status: string; shopId: string;
  checklistJson: any; completionJson: any;
  notes: { id: string; authorProfileId: string | null; text: string; createdAt: Date }[];
  parts: { id: string; location: string | null; name: string; brand: string | null; qty: number; unitPriceCents: number | null }[];
  additionalCharges: { id: string; name: string; amountCents: number; type: string }[];
};

const jobCardInclude = {
  notes: { orderBy: { createdAt: "asc" as const } },
  parts: true,
  additionalCharges: true
};

function mapJobCard(c: PrismaJobCard): JobCardRecord {
  return {
    id: c.id, ref: c.ref, bookingId: c.bookingId, bookingRef: c.bookingRef,
    assignedMechanicId: c.assignedMechanicId, slotIso: c.slotIso,
    customerName: c.customerName, customerPhone: c.customerPhone,
    addressLine1: c.addressLine1, suburb: c.suburb ?? undefined, city: c.city ?? undefined,
    serviceName: c.serviceName, durationMinsSnapshot: c.durationMinsSnapshot,
    status: c.status as JobCardStatus, shopId: c.shopId,
    checklist: (c.checklistJson ?? {}) as JobCardChecklist,
    notes: c.notes.map((n) => ({ id: n.id, atIso: toIso(n.createdAt), authorProfileId: n.authorProfileId ?? undefined, text: n.text })),
    partsUsed: c.parts.map((p) => ({ id: p.id, inventoryItemId: undefined, location: p.location ?? undefined, name: p.name, brand: p.brand ?? undefined, qty: p.qty, unitPriceCents: p.unitPriceCents ?? undefined })),
    additionalCharges: c.additionalCharges.map((ch) => ({ id: ch.id, name: ch.name, amountCents: ch.amountCents, type: ch.type as "CONSUMABLE" | "ADDITIONAL", approvalStatus: "APPROVED" as const })),
    completion: c.completionJson ? c.completionJson as JobCardCompletion : undefined
  };
}

export const JobCardsRepo = {
  async list(shopId?: string) {
    if (!shopId) {
      console.warn("[SECURITY] JobCardsRepo.list() called without shopId - returning empty");
      return [];
    }
    return withShopContext(shopId, async (tx) => {
      const rows = await tx.jobCard.findMany({ where: { shopId }, include: jobCardInclude, orderBy: { createdAt: "desc" } });
      return rows.map(mapJobCard);
    });
  },
  async get(idOrRef: string) {
    const c = await prisma.jobCard.findFirst({ where: { OR: [{ id: idOrRef }, { ref: idOrRef }] }, include: jobCardInclude });
    return c ? mapJobCard(c) : null;
  },
  async listByDate(dateIso: string, shopId?: string) {
    if (!shopId) {
      console.warn("[SECURITY] JobCardsRepo.listByDate() called without shopId - returning empty");
      return [];
    }
    const cards = await this.list(shopId);
    return cards.filter((c) => toDateIso(c.slotIso) === dateIso);
  },
  async listByMechanicAndDate(mechanicId: string, dateIso: string, shopId?: string) {
    const cards = await this.listByDate(dateIso, shopId);
    return cards.filter((c) => c.assignedMechanicId === mechanicId);
  },
  async listByMechanicInRange(mechanicId: string, fromDateIso: string, untilDateIso: string) {
    const rows = await prisma.jobCard.findMany({
      where: { assignedMechanicId: mechanicId },
      include: jobCardInclude, orderBy: { slotIso: "asc" }
    });
    return rows.map(mapJobCard).filter((c) => {
      const d = toDateIso(c.slotIso);
      return d >= fromDateIso && d <= untilDateIso;
    });
  },
  async listInProgressByMechanic(mechanicId: string) {
    const activeStatuses = ["EN_ROUTE", "ARRIVED", "IN_PROGRESS", "AWAITING_APPROVAL"];
    const rows = await prisma.jobCard.findMany({
      where: { assignedMechanicId: mechanicId, status: { in: activeStatuses as any } },
      include: jobCardInclude, orderBy: { slotIso: "asc" }
    });
    return rows.map(mapJobCard);
  },
  async createFromBooking(
    booking: BookingRecord,
    service: { id?: string | null; durationMins: number },
    assignedMechanicId?: string | null
  ) {
    const noteData = booking.notes ? [{ authorProfileId: booking.customerProfileId, text: booking.notes }] : [];
    const c = await prisma.jobCard.create({
      data: {
        ref: buildRef("JC"), bookingId: booking.id, bookingRef: booking.ref,
        assignedMechanicId: assignedMechanicId ?? null, slotIso: booking.slotIso,
        customerName: booking.customerName, customerPhone: booking.customerPhone,
        addressLine1: booking.addressLine1, suburb: booking.suburb, city: booking.city,
        serviceItemId: service.id ?? null, serviceName: booking.serviceNameSnapshot,
        durationMinsSnapshot: service.durationMins, status: "SCHEDULED",
        shopId: booking.shopId,
        checklistJson: {},
        notes: { create: noteData }
      },
      include: jobCardInclude
    });
    return mapJobCard(c);
  },
  async updateStatus(id: string, status: JobCardStatus) {
    try {
      const c = await prisma.jobCard.update({ where: { id }, data: { status: status as any }, include: jobCardInclude });
      return mapJobCard(c);
    } catch { return null; }
  },
  async reassignMechanic(id: string, assignedMechanicId?: string | null) {
    try {
      const c = await prisma.jobCard.update({
        where: { id },
        data: { assignedMechanicId: assignedMechanicId ?? null },
        include: jobCardInclude
      });
      return mapJobCard(c);
    } catch {
      return null;
    }
  },
  async reschedule(id: string, slotIso: string) {
    try {
      const c = await prisma.jobCard.update({
        where: { id },
        data: { slotIso },
        include: jobCardInclude
      });
      return mapJobCard(c);
    } catch {
      return null;
    }
  },
  async updateChecklist(id: string, checklist: JobCardChecklist) {
    try {
      const c = await prisma.jobCard.update({ where: { id }, data: { checklistJson: checklist as any }, include: jobCardInclude });
      return mapJobCard(c);
    } catch { return null; }
  },
  async addNote(id: string, note: JobCardNote) {
    try {
      const c = await prisma.jobCard.update({
        where: { id },
        data: { notes: { create: { authorProfileId: note.authorProfileId, text: note.text } } },
        include: jobCardInclude
      });
      return mapJobCard(c);
    } catch { return null; }
  },
  async addPart(id: string, part: JobCardPart) {
    try {
      const c = await prisma.jobCard.update({
        where: { id },
        data: { parts: { create: { location: part.location, name: part.name, brand: part.brand, qty: part.qty, unitPriceCents: part.unitPriceCents } } },
        include: jobCardInclude
      });
      return mapJobCard(c);
    } catch { return null; }
  },
  async addAdditionalCharge(id: string, charge: JobCardAdditionalCharge) {
    try {
      const c = await prisma.jobCard.update({
        where: { id },
        data: { additionalCharges: { create: { name: charge.name, amountCents: charge.amountCents, type: charge.type as any } } },
        include: jobCardInclude
      });
      return mapJobCard(c);
    } catch { return null; }
  },
  async decideAdditionalCharge(
    id: string,
    chargeId: string,
    decision: "APPROVED" | "REJECTED"
  ) {
    try {
      if (decision === "REJECTED") {
        await prisma.jobCardAdditionalCharge.delete({ where: { id: chargeId } }).catch(() => {});
      }
      const c = await prisma.jobCard.findUnique({
        where: { id },
        include: jobCardInclude
      });
      return c ? mapJobCard(c) : null;
    } catch {
      return null;
    }
  },
  async complete(id: string, completion: JobCardCompletion) {
    try {
      const c = await prisma.jobCard.update({
        where: { id },
        data: { status: "COMPLETED", completionJson: completion as any },
        include: jobCardInclude
      });
      return mapJobCard(c);
    } catch { return null; }
  }
};

// ─── Invoices ─────────────────────────────────────────────────────────────────

type PrismaInvoice = {
  id: string; ref: string; jobCardId: string; bookingId: string; bookingRef: string;
  customerName: string; customerPhone: string; issuedByProfileId: string;
  status: string; subtotalCents: number; totalCents: number; issuedAt: Date; shopId: string;
  lineItems: { id: string; label: string; amountCents: number; qty: number; type: string }[];
};

function mapInvoice(inv: PrismaInvoice): InvoiceRecord {
  return {
    id: inv.id, ref: inv.ref, jobCardId: inv.jobCardId, bookingId: inv.bookingId,
    bookingRef: inv.bookingRef, customerName: inv.customerName, customerPhone: inv.customerPhone,
    issuedByProfileId: inv.issuedByProfileId, status: inv.status as "ISSUED" | "PAID",
    shopId: inv.shopId,
    subtotalCents: inv.subtotalCents, totalCents: inv.totalCents, issuedAtIso: toIso(inv.issuedAt),
    lineItems: inv.lineItems.map((li) => ({
      id: li.id, label: li.label, amountCents: li.amountCents,
      qty: li.qty, type: li.type as InvoiceLineItem["type"]
    }))
  };
}

const invoiceInclude = { lineItems: true };

export const InvoicesRepo = {
  async list(shopId?: string) {
    if (!shopId) {
      console.warn("[SECURITY] InvoicesRepo.list() called without shopId - returning empty");
      return [];
    }
    return withShopContext(shopId, async (tx) => {
      const rows = await tx.invoice.findMany({ where: { shopId }, include: invoiceInclude, orderBy: { issuedAt: "desc" } });
      return rows.map(mapInvoice);
    });
  },
  async get(idOrRef: string) {
    const inv = await prisma.invoice.findFirst({ where: { OR: [{ id: idOrRef }, { ref: idOrRef }] }, include: invoiceInclude });
    return inv ? mapInvoice(inv) : null;
  },
  async getByJobCardId(jobCardId: string) {
    const inv = await prisma.invoice.findFirst({ where: { jobCardId }, include: invoiceInclude });
    return inv ? mapInvoice(inv) : null;
  },
  async create(input: Omit<InvoiceRecord, "id" | "ref">) {
    const inv = await prisma.invoice.create({
      data: {
        ref: buildRef("INV"), jobCardId: input.jobCardId, bookingId: input.bookingId,
        bookingRef: input.bookingRef, customerName: input.customerName,
        customerPhone: input.customerPhone, issuedByProfileId: input.issuedByProfileId,
        status: input.status as any, subtotalCents: input.subtotalCents, totalCents: input.totalCents,
        shopId: input.shopId,
        issuedAt: new Date(input.issuedAtIso),
        lineItems: { create: input.lineItems.map((li) => ({ label: li.label, amountCents: li.amountCents, qty: li.qty ?? 1, type: li.type as any })) }
      },
      include: invoiceInclude
    });
    return mapInvoice(inv);
  }
};

// ─── Ratings ──────────────────────────────────────────────────────────────────

function mapRating(r: { id: string; bookingId: string; customerProfileId: string; rating: number; comment: string | null; createdAt: Date }): RatingRecord {
  return {
    id: r.id, bookingId: r.bookingId, customerProfileId: r.customerProfileId,
    rating: r.rating, comment: r.comment ?? undefined, createdAtIso: toIso(r.createdAt)
  };
}

export const RatingsRepo = {
  async getByBookingId(bookingId: string) {
    const r = await prisma.rating.findUnique({ where: { bookingId } });
    return r ? mapRating(r) : null;
  },
  async create(input: { bookingId: string; customerProfileId: string; rating: number; comment?: string }) {
    const existing = await prisma.rating.findUnique({ where: { bookingId: input.bookingId } });
    if (existing) return mapRating(existing);
    const r = await prisma.rating.create({
      data: { bookingId: input.bookingId, customerProfileId: input.customerProfileId, rating: input.rating, comment: input.comment }
    });
    return mapRating(r);
  },
  async list(shopId?: string) {
    if (!shopId) {
      console.warn("[SECURITY] RatingsRepo.list() called without shopId - returning empty");
      return [];
    }
    return withShopContext(shopId, async (tx) => {
      const rows = await tx.rating.findMany({
        where: { booking: { shopId } },
        orderBy: { createdAt: "desc" }
      });
      return rows.map(mapRating);
    });
  }
};

// ─── Support Tickets ─────────────────────────────────────────────────────────

type PrismaSupportTicket = {
  id: string; subject: string; description: string;
  category: string; priority: string; status: string;
  bookingId: string | null; assigneeId: string | null;
  resolvedAt: Date | null; shopId: string;
  createdAt: Date; updatedAt: Date;
  notes: { id: string; authorName: string; text: string; createdAt: Date }[];
};

function mapSupportTicketNote(n: { id: string; authorName: string; text: string; createdAt: Date }): SupportTicketNoteRecord {
  return { id: n.id, authorName: n.authorName, text: n.text, createdAtIso: toIso(n.createdAt) };
}

function mapSupportTicket(t: PrismaSupportTicket): SupportTicketRecord {
  return {
    id: t.id, subject: t.subject, description: t.description,
    category: t.category.toLowerCase() as SupportTicketCategory,
    priority: t.priority.toLowerCase() as SupportTicketPriority,
    status: t.status.toLowerCase().replace("_", "_") as SupportTicketRecord["status"],
    bookingId: t.bookingId ?? undefined,
    assigneeId: t.assigneeId ?? undefined,
    shopId: t.shopId,
    notes: t.notes.map(mapSupportTicketNote),
    createdAtIso: toIso(t.createdAt),
    updatedAtIso: toIso(t.updatedAt),
    resolvedAtIso: t.resolvedAt ? toIso(t.resolvedAt) : undefined
  };
}

const supportTicketInclude = { notes: { orderBy: { createdAt: "asc" as const } } };

function toUpperEnum<T extends string>(val: T): string {
  return val.toUpperCase().replace(/ /g, "_");
}

// Map the localStore status "in_progress" → Prisma enum "IN_PROGRESS"
function toStatusEnum(status: string): string {
  return status.toUpperCase().replace(/ /g, "_");
}

export const SupportTicketsRepo = {
  async list(shopId?: string) {
    if (!shopId) {
      console.warn("[SECURITY] SupportTicketsRepo.list() called without shopId - returning empty");
      return [];
    }
    return withShopContext(shopId, async (tx) => {
      const rows = await tx.supportTicket.findMany({ where: { shopId }, include: supportTicketInclude, orderBy: { createdAt: "desc" } });
      return rows.map(mapSupportTicket);
    });
  },
  async get(id: string) {
    const t = await prisma.supportTicket.findUnique({ where: { id }, include: supportTicketInclude });
    return t ? mapSupportTicket(t) : null;
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
    const t = await prisma.supportTicket.create({
      data: {
        subject: input.subject,
        description: input.description,
        category: toUpperEnum(input.category) as any,
        priority: toUpperEnum(input.priority) as any,
        status: "OPEN",
        bookingId: input.bookingId,
        assigneeId: input.assigneeId,
        shopId: input.shopId
      },
      include: supportTicketInclude
    });
    return mapSupportTicket(t);
  },
  async update(id: string, updates: Partial<Pick<SupportTicketRecord, "status" | "priority" | "assigneeId" | "resolvedAtIso">>) {
    try {
      const data: any = {};
      if (updates.status !== undefined) data.status = toStatusEnum(updates.status);
      if (updates.priority !== undefined) data.priority = toUpperEnum(updates.priority);
      if (updates.assigneeId !== undefined) data.assigneeId = updates.assigneeId;
      if (updates.resolvedAtIso !== undefined) data.resolvedAt = new Date(updates.resolvedAtIso);
      const t = await prisma.supportTicket.update({ where: { id }, data, include: supportTicketInclude });
      return mapSupportTicket(t);
    } catch { return null; }
  },
  async addNote(id: string, note: { authorName: string; text: string }) {
    try {
      await prisma.supportTicketNote.create({
        data: { ticketId: id, authorName: note.authorName, text: note.text }
      });
      const t = await prisma.supportTicket.findUnique({ where: { id }, include: supportTicketInclude });
      return t ? mapSupportTicket(t) : null;
    } catch { return null; }
  }
};

import type { PricingRuleRecord, TravelBandRule, AvailabilityBlockRecord } from "./localStore";

function mapPricingRule(r: { id: string; shopId: string; calloutFeeCents: number; platformFeeCents: number; platformFeePercentBps: number | null; partsMarkupBps: number; travelBandRulesJson: unknown; afterHoursEnabled: boolean; afterHoursSurchargeBps: number; effectiveFrom: Date; isActive: boolean; createdAt: Date; updatedAt: Date }): PricingRuleRecord {
  return {
    id: r.id,
    shopId: r.shopId,
    calloutFeeCents: r.calloutFeeCents,
    platformFeeCents: r.platformFeeCents,
    platformFeePercentBps: r.platformFeePercentBps,
    partsMarkupBps: r.partsMarkupBps,
    travelBandRulesJson: (Array.isArray(r.travelBandRulesJson) ? r.travelBandRulesJson : []) as TravelBandRule[],
    afterHoursEnabled: r.afterHoursEnabled,
    afterHoursSurchargeBps: r.afterHoursSurchargeBps,
    effectiveFrom: r.effectiveFrom.toISOString(),
    isActive: r.isActive,
    createdAtIso: r.createdAt.toISOString(),
    updatedAtIso: r.updatedAt.toISOString()
  };
}

export const PricingRulesRepo = {
  async getActive(shopId?: string): Promise<PricingRuleRecord | null> {
    const sid = shopId || (await getDefaultShopId());
    const rule = await prisma.pricingRule.findFirst({
      where: { shopId: sid, isActive: true, effectiveFrom: { lte: new Date() } },
      orderBy: { effectiveFrom: "desc" }
    });
    return rule ? mapPricingRule(rule) : null;
  },
  async upsert(input: Omit<PricingRuleRecord, "createdAtIso" | "updatedAtIso">): Promise<PricingRuleRecord> {
    const data = {
      calloutFeeCents: input.calloutFeeCents,
      platformFeeCents: input.platformFeeCents,
      platformFeePercentBps: input.platformFeePercentBps,
      partsMarkupBps: input.partsMarkupBps,
      travelBandRulesJson: input.travelBandRulesJson as any,
      afterHoursEnabled: input.afterHoursEnabled,
      afterHoursSurchargeBps: input.afterHoursSurchargeBps,
      effectiveFrom: new Date(input.effectiveFrom),
      isActive: input.isActive,
      shopId: input.shopId
    };
    const result = await prisma.pricingRule.upsert({
      where: { id: input.id },
      update: data,
      create: { id: input.id, ...data }
    });
    return mapPricingRule(result);
  }
};

export const AvailabilityBlocksRepo = {
  async list(shopId?: string): Promise<AvailabilityBlockRecord[]> {
    const sid = shopId || (await getDefaultShopId());
    return withShopContext(sid, async (tx) => {
      const blocks = await tx.availabilityBlock.findMany({
        where: { shopId: sid },
        orderBy: { date: "asc" }
      });
      return blocks.map((b) => ({
        id: b.id,
        shopId: b.shopId,
        date: b.date.toISOString().slice(0, 10),
        reason: b.reason ?? undefined,
        isEmergency: b.isEmergency,
        createdAtIso: b.createdAt.toISOString()
      }));
    });
  },
  async create(input: { shopId: string; date: string; reason?: string; isEmergency?: boolean }): Promise<AvailabilityBlockRecord> {
    const created = await prisma.availabilityBlock.create({
      data: {
        date: new Date(`${input.date}T00:00:00.000Z`),
        reason: input.reason,
        isEmergency: input.isEmergency ?? false,
        shopId: input.shopId
      }
    });
    return {
      id: created.id,
      shopId: created.shopId,
      date: created.date.toISOString().slice(0, 10),
      reason: created.reason ?? undefined,
      isEmergency: created.isEmergency,
      createdAtIso: created.createdAt.toISOString()
    };
  },
  async remove(id: string): Promise<boolean> {
    try {
      await prisma.availabilityBlock.delete({ where: { id } });
      return true;
    } catch { return false; }
  }
};

// ─── Leads ───────────────────────────────────────────────────────────────────

export const LeadsRepo = {
  async create(input: { name: string; email: string; phone?: string | null; company?: string | null; formType: string; message?: string | null; utmSource?: string | null; utmMedium?: string | null; utmCampaign?: string | null }) {
    const lead = await prisma.lead.create({ data: { ...input } });
    return { ...lead, createdAtIso: lead.createdAt.toISOString(), updatedAtIso: lead.updatedAt.toISOString() };
  },
  async list() {
    const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" } });
    return leads.map(l => ({ ...l, createdAtIso: l.createdAt.toISOString(), updatedAtIso: l.updatedAt.toISOString() }));
  },
};

// ─── Convenience functions ────────────────────────────────────────────────────

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
  const count = await prisma.serviceItem.count();
  if (count > 0) return;
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

async function ensureComprehensiveDemoSeed() {
  const [bookingCount, cardCount, invoiceCount, supportCount] = await Promise.all([
    prisma.booking.count(),
    prisma.jobCard.count(),
    prisma.invoice.count(),
    prisma.supportTicket.count()
  ]);
  if (bookingCount || cardCount || invoiceCount || supportCount) return;

  const shopId = await getDefaultShopId();
  await ensureServiceSeed();

  const demoProfiles: Array<{ phone: string; name: string; role: ProfileRole; status?: ProfileStatus }> = [
    { phone: "+27110000003", name: "Kabelo Mokoena (Lead Mechanic)", role: "MECHANIC" },
    { phone: "+27610000035", name: "Ayesha Pillay (Wheel Specialist)", role: "MECHANIC" },
    { phone: "+27610000036", name: "Sipho Dlamini (Reserve Mechanic)", role: "MECHANIC", status: "INACTIVE" },
    { phone: "+27110000004", name: "Client User", role: "CUSTOMER" },
    { phone: "+27610010011", name: "Thabo Ndlovu", role: "CUSTOMER" },
    { phone: "+27610010012", name: "Lerato Maseko", role: "CUSTOMER" }
  ];
  for (const profile of demoProfiles) {
    const upserted = await ProfilesRepo.upsertByPhone({
      phone: profile.phone,
      name: profile.name,
      role: profile.role,
      status: "ACTIVE",
      shopId
    });
    if (profile.status && upserted.status !== profile.status) {
      await ProfilesRepo.setStatus(upserted.id, profile.status);
    }
  }

  const [leadMechanic, wheelMechanic, primaryClient, clientOne, clientTwo] = await Promise.all([
    ProfilesRepo.getByPhone("+27110000003"),
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

  const bikeCount = await prisma.bike.count();
  if (bikeCount === 0) {
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
    id: "",
    name: "Fork dust seals + fluid top-up",
    amountCents: 89000,
    type: "ADDITIONAL",
    approvalStatus: "PENDING"
  });
  await JobCardsRepo.addNote(cardC.id, {
    id: "",
    atIso: "",
    authorProfileId: wheelMechanic.id,
    text: "Found worn dust seals and requested customer approval."
  });

  const cardD = await JobCardsRepo.createFromBooking(
    bookingD,
    { id: bookingD.serviceItemId, durationMins: serviceDurationFor(bookingD) },
    wheelMechanic.id
  );
  await JobCardsRepo.updateStatus(cardD.id, "IN_PROGRESS");
  await JobCardsRepo.addPart(cardD.id, {
    id: "",
    name: "Shimano B05S Brake Pads",
    brand: "Shimano",
    qty: 1,
    unitPriceCents: 33900
  });
  await JobCardsRepo.addPart(cardD.id, {
    id: "",
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
      { id: "", label: majorService.name, amountCents: majorService.basePriceCents, qty: 1, type: "LABOUR" },
      { id: "", label: "Shimano B05S Brake Pads", amountCents: 33900, qty: 1, type: "PART" },
      { id: "", label: "Muc-Off Wet Chain Lube 120ml", amountCents: 19900, qty: 1, type: "CONSUMABLE" }
    ],
    subtotalCents: majorService.basePriceCents + 33900 + 19900,
    totalCents: majorService.basePriceCents + 33900 + 19900
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
      { id: "", label: suspensionService.name, amountCents: suspensionService.basePriceCents, qty: 1, type: "LABOUR" },
      { id: "", label: "Fork dust seals + fluid top-up", amountCents: 89000, qty: 1, type: "ADDITIONAL" }
    ],
    subtotalCents: suspensionService.basePriceCents + 89000,
    totalCents: suspensionService.basePriceCents + 89000
  });

  await RatingsRepo.create({
    bookingId: bookingD.id,
    customerProfileId: primaryClient.id,
    rating: 5,
    comment: "Bike felt race-ready immediately after collection."
  });

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

  const primaryThread = await ChatThreadsRepo.getOrCreateForCustomer(primaryClient.id);
  await ChatThreadsRepo.appendMessage(primaryThread.id, {
    id: "",
    atIso: slotIsoAt(-1, 16, 20),
    role: "USER",
    text: "Can you confirm my bike is ready for collection?"
  });
  await ChatThreadsRepo.appendMessage(primaryThread.id, {
    id: "",
    atIso: slotIsoAt(-1, 16, 24),
    role: "ASSISTANT",
    text: "Yes, your major service is complete and signed off. Collection is available until 17:30."
  });

  const mtbThread = await ChatThreadsRepo.getOrCreateForCustomer(clientOne.id);
  await ChatThreadsRepo.appendMessage(mtbThread.id, {
    id: "",
    atIso: slotIsoAt(0, 8, 5),
    role: "USER",
    text: "I might be 10 minutes late for today’s brake booking."
  });
  await ChatThreadsRepo.appendMessage(mtbThread.id, {
    id: "",
    atIso: slotIsoAt(0, 8, 8),
    role: "ASSISTANT",
    text: "No problem. The mechanic has been updated and your slot is still secured."
  });

  const inviteCount = await prisma.invite.count();
  if (inviteCount === 0) {
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

  void cardA;
}

export async function getJobCard(idOrRef: string) { return JobCardsRepo.get(idOrRef); }
export async function listJobCardsByDate(dateIso: string, shopId?: string) { return JobCardsRepo.listByDate(dateIso, shopId); }
export async function listJobCardsByMechanicAndDate(mechanicId: string, dateIso: string, shopId?: string) { return JobCardsRepo.listByMechanicAndDate(mechanicId, dateIso, shopId); }
export async function listJobCardsByMechanicInRange(mechanicId: string, from: string, to: string) { return JobCardsRepo.listByMechanicInRange(mechanicId, from, to); }
export async function listInProgressJobCardsByMechanic(mechanicId: string) { return JobCardsRepo.listInProgressByMechanic(mechanicId); }
export async function updateJobCardStatus(id: string, status: JobCardStatus) { return JobCardsRepo.updateStatus(id, status); }
export async function appendJobCardNote(id: string, text: string, authorProfileId?: string) { return JobCardsRepo.addNote(id, { id: "", atIso: "", authorProfileId, text }); }
export async function completeJobCard(id: string, payload: { customerName: string; approved: boolean; summary?: string }) {
  return JobCardsRepo.complete(id, { completedAtIso: new Date().toISOString(), summary: payload.summary, customerSignoffName: payload.customerName, customerSignoffAccepted: payload.approved });
}

export async function seedIfEmpty() { await ensureServiceSeed(); }
export async function ensureJourneyProfiles() {
  const shopId = await getDefaultShopId();
  const required = [
    { phone: "+27110000001", name: "Shop Owner", role: "ADMIN" as ProfileRole },
    { phone: "+27110000002", name: "Platform Owner", role: "ADMIN" as ProfileRole },
    { phone: "+27110000003", name: "Kabelo Mokoena (Lead Mechanic)", role: "MECHANIC" as ProfileRole },
    { phone: "+27110000004", name: "Client User", role: "CUSTOMER" as ProfileRole }
  ];
  for (const r of required) {
    await ProfilesRepo.upsertByPhone({ phone: r.phone, name: r.name, role: r.role, status: "ACTIVE", shopId });
  }
  await ensureComprehensiveDemoSeed();
}
