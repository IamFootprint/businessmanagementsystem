import { getDefaultShopId, ShopRepo } from "@/src/lib/store";
import { DEFAULT_SESSION_POLICY, normalizeSessionPolicy, type SessionPolicy } from "./sessionPolicyShared";

function readThemeTokenPolicy(themeTokens?: Record<string, unknown> | null) {
  if (!themeTokens || typeof themeTokens !== "object") return DEFAULT_SESSION_POLICY;
  const raw = (themeTokens.sessionSecurity || null) as Partial<SessionPolicy> | null;
  return normalizeSessionPolicy(raw);
}

export async function getSessionPolicyFromStore(): Promise<SessionPolicy> {
  const defaultShopId = await getDefaultShopId();
  const shop = await ShopRepo.getById(defaultShopId);
  if (!shop) return { ...DEFAULT_SESSION_POLICY };
  return readThemeTokenPolicy(shop.themeTokens || undefined);
}

export async function updateSessionPolicyInStore(input: SessionPolicy) {
  const defaultShopId = await getDefaultShopId();
  const shop = await ShopRepo.getById(defaultShopId);
  if (!shop) return null;
  const nextPolicy = normalizeSessionPolicy(input);
  const themeTokens = {
    ...(shop.themeTokens || {}),
    sessionSecurity: nextPolicy
  };
  const updated = await ShopRepo.update(shop.id, { themeTokens });
  if (!updated) return null;
  return nextPolicy;
}
