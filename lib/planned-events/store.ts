import { ensureDir, getDataDir, readJson, resolveDataFile, writeJsonAtomic } from "@/src/lib/store/fsStore";

type AppLocationRecord = {
  id: string;
  profileId: string;
  label?: string;
  addressLine1: string;
  suburb?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  createdAtIso: string;
  updatedAtIso: string;
};

type JobPhotoRecord = {
  id: string;
  jobCardId: string;
  shopId: string;
  addedByProfileId: string;
  caption?: string;
  mediaUrl?: string;
  createdAtIso: string;
};

type RefundStatus = "REQUESTED" | "APPROVED" | "PROCESSED";

type RefundRecord = {
  id: string;
  shopId: string;
  bookingId?: string;
  invoiceId?: string;
  paymentReference?: string;
  amountCents?: number;
  currency: string;
  reasonText: string;
  status: RefundStatus;
  requestedByProfileId: string;
  approvedByProfileId?: string;
  processedByProfileId?: string;
  createdAtIso: string;
  updatedAtIso: string;
};

type PaymentInitiationRecord = {
  id: string;
  bookingId: string;
  shopId: string;
  actorProfileId: string;
  provider: "PAYFAST" | "YOCO" | "EFT";
  amountCents: number;
  currency: string;
  status: "INITIATED";
  createdAtIso: string;
};

const FILES = {
  locations: "appLocations.json",
  jobPhotos: "jobCardPhotos.json",
  refunds: "refunds.json",
  paymentInitiations: "paymentInitiations.json"
} as const;

const inMemory = {
  locations: [] as AppLocationRecord[],
  jobPhotos: [] as JobPhotoRecord[],
  refunds: [] as RefundRecord[],
  paymentInitiations: [] as PaymentInitiationRecord[]
};

function buildId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readCollection<K extends keyof typeof FILES>(key: K): Promise<(typeof inMemory)[K]> {
  const filePath = resolveDataFile(FILES[key]);
  const diskRows = await readJson<(typeof inMemory)[K]>(filePath, inMemory[key]);
  inMemory[key] = diskRows as (typeof inMemory)[K];
  return inMemory[key];
}

async function writeCollection<K extends keyof typeof FILES>(key: K, rows: (typeof inMemory)[K]) {
  inMemory[key] = rows as (typeof inMemory)[K];
  try {
    const dir = await ensureDir(getDataDir());
    if (!dir) return;
    const filePath = resolveDataFile(FILES[key]);
    await writeJsonAtomic(filePath, rows);
  } catch {
    // Memory fallback is sufficient for MVP-local stub flows.
  }
}

export const AppLocationsRepo = {
  async listByProfile(profileId: string) {
    const rows = await readCollection("locations");
    return rows.filter((row) => row.profileId === profileId);
  },
  async getById(id: string) {
    const rows = await readCollection("locations");
    return rows.find((row) => row.id === id) || null;
  },
  async create(input: {
    profileId: string;
    label?: string;
    addressLine1: string;
    suburb?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const now = new Date().toISOString();
    const rows = await readCollection("locations");
    const created: AppLocationRecord = {
      id: buildId("loc"),
      profileId: input.profileId,
      label: input.label,
      addressLine1: input.addressLine1,
      suburb: input.suburb,
      city: input.city,
      latitude: input.latitude,
      longitude: input.longitude,
      createdAtIso: now,
      updatedAtIso: now
    };
    rows.unshift(created);
    await writeCollection("locations", rows);
    return created;
  },
  async update(id: string, updates: Partial<Omit<AppLocationRecord, "id" | "profileId" | "createdAtIso" | "updatedAtIso">>) {
    const rows = await readCollection("locations");
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) return null;
    const updated: AppLocationRecord = {
      ...rows[index],
      ...updates,
      updatedAtIso: new Date().toISOString()
    };
    rows[index] = updated;
    await writeCollection("locations", rows);
    return updated;
  },
  async remove(id: string) {
    const rows = await readCollection("locations");
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) return null;
    const [removed] = rows.splice(index, 1);
    await writeCollection("locations", rows);
    return removed;
  }
};

export const JobPhotosRepo = {
  async listByJobCard(jobCardId: string) {
    const rows = await readCollection("jobPhotos");
    return rows.filter((row) => row.jobCardId === jobCardId);
  },
  async create(input: {
    jobCardId: string;
    shopId: string;
    addedByProfileId: string;
    caption?: string;
    mediaUrl?: string;
  }) {
    const rows = await readCollection("jobPhotos");
    const created: JobPhotoRecord = {
      id: buildId("photo"),
      jobCardId: input.jobCardId,
      shopId: input.shopId,
      addedByProfileId: input.addedByProfileId,
      caption: input.caption,
      mediaUrl: input.mediaUrl,
      createdAtIso: new Date().toISOString()
    };
    rows.unshift(created);
    await writeCollection("jobPhotos", rows);
    return created;
  },
  async remove(jobCardId: string, photoId: string) {
    const rows = await readCollection("jobPhotos");
    const index = rows.findIndex((row) => row.jobCardId === jobCardId && row.id === photoId);
    if (index === -1) return null;
    const [removed] = rows.splice(index, 1);
    await writeCollection("jobPhotos", rows);
    return removed;
  }
};

export const RefundsRepo = {
  async list(shopId: string) {
    const rows = await readCollection("refunds");
    return rows.filter((row) => row.shopId === shopId);
  },
  async getById(id: string) {
    const rows = await readCollection("refunds");
    return rows.find((row) => row.id === id) || null;
  },
  async create(input: {
    shopId: string;
    bookingId?: string;
    invoiceId?: string;
    paymentReference?: string;
    amountCents?: number;
    reasonText: string;
    requestedByProfileId: string;
  }) {
    const now = new Date().toISOString();
    const rows = await readCollection("refunds");
    const created: RefundRecord = {
      id: buildId("refund"),
      shopId: input.shopId,
      bookingId: input.bookingId,
      invoiceId: input.invoiceId,
      paymentReference: input.paymentReference,
      amountCents: input.amountCents,
      currency: "ZAR",
      reasonText: input.reasonText,
      status: "REQUESTED",
      requestedByProfileId: input.requestedByProfileId,
      createdAtIso: now,
      updatedAtIso: now
    };
    rows.unshift(created);
    await writeCollection("refunds", rows);
    return created;
  },
  async updateStatus(id: string, status: RefundStatus, actorProfileId: string) {
    const rows = await readCollection("refunds");
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) return null;
    const updated: RefundRecord = {
      ...rows[index],
      status,
      updatedAtIso: new Date().toISOString(),
      approvedByProfileId: status === "APPROVED" ? actorProfileId : rows[index].approvedByProfileId,
      processedByProfileId: status === "PROCESSED" ? actorProfileId : rows[index].processedByProfileId
    };
    rows[index] = updated;
    await writeCollection("refunds", rows);
    return updated;
  }
};

export const PaymentInitiationsRepo = {
  async create(input: {
    bookingId: string;
    shopId: string;
    actorProfileId: string;
    provider: "PAYFAST" | "YOCO" | "EFT";
    amountCents: number;
  }) {
    const rows = await readCollection("paymentInitiations");
    const created: PaymentInitiationRecord = {
      id: buildId("pay"),
      bookingId: input.bookingId,
      shopId: input.shopId,
      actorProfileId: input.actorProfileId,
      provider: input.provider,
      amountCents: input.amountCents,
      currency: "ZAR",
      status: "INITIATED",
      createdAtIso: new Date().toISOString()
    };
    rows.unshift(created);
    await writeCollection("paymentInitiations", rows);
    return created;
  }
};

export type {
  AppLocationRecord,
  JobPhotoRecord,
  RefundRecord,
  PaymentInitiationRecord
};
