import fs from "node:fs/promises";
import path from "node:path";
import { logInfo } from "./log";

const FIXTURES_DIR = path.join(process.cwd(), "fixtures");

let cachedShop: Record<string, unknown> | null = null;
let cachedCatalog: { services: unknown[]; packages: unknown[] } | null = null;
let cachedPricingRule: Record<string, unknown> | null = null;

function logFakeDbOnce() {
  const key = "__fakeDbLogged";
  const globalState = globalThis as unknown as { [key: string]: boolean };
  if (!globalState[key]) {
    logInfo("FAKE_DB mode enabled");
    globalState[key] = true;
  }
}

async function readJson<T>(filename: string): Promise<T> {
  const filePath = path.join(FIXTURES_DIR, filename);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export function isFakeDbEnabled() {
  return process.env.USE_FAKE_DB === "true";
}

export async function getFakeShop() {
  if (!isFakeDbEnabled()) return null;
  logFakeDbOnce();
  if (!cachedShop) {
    cachedShop = await readJson<Record<string, unknown>>("shop_settings.json");
  }
  return cachedShop;
}

export async function getFakeCatalog() {
  if (!isFakeDbEnabled()) return null;
  logFakeDbOnce();
  if (!cachedCatalog) {
    cachedCatalog = await readJson<{ services: unknown[]; packages: unknown[] }>("catalog.json");
  }
  return cachedCatalog;
}

export async function getFakePricingRule() {
  if (!isFakeDbEnabled()) return null;
  logFakeDbOnce();
  if (!cachedPricingRule) {
    cachedPricingRule = await readJson<Record<string, unknown>>("pricing_rules.json");
  }
  return cachedPricingRule;
}
