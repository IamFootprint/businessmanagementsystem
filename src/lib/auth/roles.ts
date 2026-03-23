export const WORKSHOP_ROLES = [
  "PLATFORM_OWNER",
  "SHOP_OWNER",
  "MECHANIC",
  "CLIENT"
] as const;

export type WorkshopRole = (typeof WORKSHOP_ROLES)[number];

export type LegacyRole = "ADMIN" | "MECHANIC" | "CUSTOMER";
export type AnyRole = WorkshopRole | LegacyRole;

const PLATFORM_OWNER_DEFAULT_PHONES = ["+27110000002"];

function normalizedPhone(input?: string | null) {
  return (input || "").replace(/\s+/g, "");
}

function platformOwnerPhones() {
  const env = (process.env.PLATFORM_OWNER_PHONES || "")
    .split(",")
    .map((value) => normalizedPhone(value))
    .filter(Boolean);
  return new Set([...PLATFORM_OWNER_DEFAULT_PHONES, ...env].map((value) => normalizedPhone(value)));
}

function normalizeRoleKey(input?: string | null) {
  return (input || "").trim().toUpperCase();
}

export function isWorkshopRole(input?: string | null): input is WorkshopRole {
  const key = normalizeRoleKey(input);
  return WORKSHOP_ROLES.includes(key as WorkshopRole);
}

export function resolveWorkshopRole(params: {
  role?: string | null;
  phone?: string | null;
  name?: string | null;
  shopId?: string | null;
}): WorkshopRole {
  const role = normalizeRoleKey(params.role);
  if (role === "PLATFORM_OWNER") return "PLATFORM_OWNER";
  if (role === "SHOP_OWNER") return "SHOP_OWNER";
  if (role === "MECHANIC") return "MECHANIC";
  if (role === "CLIENT") return "CLIENT";

  if (role === "CUSTOMER") return "CLIENT";

  if (role === "ADMIN") {
    const phone = normalizedPhone(params.phone);
    if (platformOwnerPhones().has(phone)) return "PLATFORM_OWNER";
    if (!params.shopId) return "SHOP_OWNER";
    const byName = (params.name || "").toLowerCase().includes("platform owner");
    return byName ? "PLATFORM_OWNER" : "SHOP_OWNER";
  }

  return "CLIENT";
}

export function toLegacyRole(role: WorkshopRole): LegacyRole {
  if (role === "MECHANIC") return "MECHANIC";
  if (role === "CLIENT") return "CUSTOMER";
  return "ADMIN";
}

export function toWorkshopRoleSet(roles: ReadonlyArray<AnyRole>) {
  const normalized = new Set<WorkshopRole>();
  for (const role of roles) {
    const key = normalizeRoleKey(role);
    if (key === "ADMIN") {
      normalized.add("SHOP_OWNER");
      normalized.add("PLATFORM_OWNER");
      continue;
    }
    normalized.add(resolveWorkshopRole({ role }));
  }
  return normalized;
}

export function isOwnerRole(role: WorkshopRole) {
  return role === "SHOP_OWNER" || role === "PLATFORM_OWNER";
}
