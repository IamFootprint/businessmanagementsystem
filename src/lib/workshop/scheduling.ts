import { ProfilesRepo, ShopRepo, type ProfileRecord } from "@/src/lib/store";

export type AssignmentMode = "AUTO" | "MANUAL";

export type SchedulingPolicy = {
  defaultNoticeHours: number;
  assignmentMode: AssignmentMode;
  shopHours?: Record<string, { open: boolean; start: string; end: string }>;
  blackoutDates?: string[];
};

const DEFAULT_POLICY: SchedulingPolicy = {
  defaultNoticeHours: 24,
  assignmentMode: "AUTO",
  blackoutDates: []
};

function normalizePolicy(input?: Partial<SchedulingPolicy> | null): SchedulingPolicy {
  return {
    defaultNoticeHours:
      typeof input?.defaultNoticeHours === "number" && input.defaultNoticeHours >= 0
        ? Math.floor(input.defaultNoticeHours)
        : DEFAULT_POLICY.defaultNoticeHours,
    assignmentMode: input?.assignmentMode === "MANUAL" ? "MANUAL" : "AUTO",
    shopHours: input?.shopHours,
    blackoutDates: Array.isArray(input?.blackoutDates) ? input?.blackoutDates : DEFAULT_POLICY.blackoutDates
  };
}

export async function getSchedulingPolicy(shopId: string) {
  const shop = await ShopRepo.getById(shopId);
  const tokens = (shop?.themeTokens || {}) as Record<string, unknown>;
  const existing = tokens.schedulingPolicy as Partial<SchedulingPolicy> | undefined;
  return normalizePolicy(existing);
}

export async function saveSchedulingPolicy(shopId: string, updates: Partial<SchedulingPolicy>) {
  const shop = await ShopRepo.getById(shopId);
  const tokens = (shop?.themeTokens || {}) as Record<string, unknown>;
  const nextPolicy = normalizePolicy({
    ...((tokens.schedulingPolicy as Partial<SchedulingPolicy>) || {}),
    ...updates
  });
  await ShopRepo.update(shopId, {
    themeTokens: {
      ...tokens,
      schedulingPolicy: nextPolicy
    }
  });
  return nextPolicy;
}

async function getActiveMechanicById(mechanicId?: string | null, shopId?: string) {
  if (!mechanicId) return null;
  const profile = await ProfilesRepo.getById(mechanicId);
  if (!profile) return null;
  if (profile.role !== "MECHANIC") return null;
  if (profile.status !== "ACTIVE") return null;
  if (shopId && profile.shopId && profile.shopId !== shopId) return null;
  return profile;
}

export async function pickAssignedMechanic(params: {
  shopId: string;
  preferredMechanicId?: string | null;
}) {
  const preferred = await getActiveMechanicById(params.preferredMechanicId, params.shopId);
  if (preferred) {
    return {
      mechanic: preferred,
      reason: "preferred_mechanic"
    };
  }

  const policy = await getSchedulingPolicy(params.shopId);
  if (policy.assignmentMode === "MANUAL") {
    return {
      mechanic: null,
      reason: "manual_assignment"
    };
  }

  const firstAvailable = await ProfilesRepo.getDefaultMechanic(params.shopId);
  if (!firstAvailable || firstAvailable.status !== "ACTIVE") {
    return {
      mechanic: null,
      reason: "no_active_mechanic"
    };
  }
  return {
    mechanic: firstAvailable as ProfileRecord,
    reason: "auto_first_available"
  };
}

export function isSlotOutsideNoticeWindow(slotIso: string, noticeHours: number) {
  const slotTs = new Date(slotIso).getTime();
  const minTs = Date.now() + noticeHours * 60 * 60 * 1000;
  return slotTs >= minTs;
}
