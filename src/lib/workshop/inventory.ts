import { ensureDir, getDataDir, readJson, resolveDataFile, writeJsonAtomic } from "@/src/lib/store/fsStore";

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  unitPriceCents: number;
  costCents?: number;
  stockOnHand?: number;
  isActive: boolean;
  createdAtIso: string;
  updatedAtIso: string;
};

const FILE = "inventoryItems.json";

function buildId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function readItems() {
  const filePath = resolveDataFile(FILE);
  return readJson<InventoryItem[]>(filePath, []);
}

async function writeItems(items: InventoryItem[]) {
  const dir = await ensureDir(getDataDir());
  if (!dir) return;
  const filePath = resolveDataFile(FILE);
  await writeJsonAtomic(filePath, items);
}

export async function listInventoryItems() {
  return readItems();
}

export async function seedInventoryIfEmpty() {
  const existing = await readItems();
  if (existing.length > 0) return existing;

  const now = new Date().toISOString();
  const seedRows = [
    ["Muc-Off Wet Chain Lube 120ml", "Consumables", 19900, 12900, 28],
    ["Muc-Off Nano Tech Bike Cleaner 1L", "Consumables", 22900, 14900, 22],
    ["Stan's Tubeless Sealant 500ml", "Tubeless", 41900, 28900, 20],
    ["Shimano B05S Disc Brake Pads", "Brakes", 33900, 22900, 34],
    ["Jagwire Pro Brake Cable Set", "Brakes", 32900, 21900, 18],
    ["Shimano RT66 180mm Rotor", "Brakes", 57900, 41900, 14],
    ["SRAM GX Eagle 10-52 Cassette", "Drivetrain", 599900, 489900, 6],
    ["KMC X10 Chain", "Drivetrain", 54900, 39900, 19],
    ["Shimano CN-HG601 11-Speed Chain", "Drivetrain", 74900, 57900, 15],
    ["Shimano Deore XT 12-Speed Shifter Cable Set", "Drivetrain", 28900, 18900, 12],
    ["Maxxis Minion DHF 29x2.5 WT Tyre", "Tyres", 159500, 129500, 8],
    ["Continental GP5000 700x25 Tyre", "Tyres", 129900, 99900, 10],
    ["Vittoria Corsa N.EXT 700x28 Tyre", "Tyres", 139900, 112900, 9],
    ["29in Presta Tube 48mm", "Tubes", 11900, 7900, 40],
    ["700x25-32c Presta Tube 60mm", "Tubes", 12900, 8500, 36],
    ["Ceramic BB Bearing Kit", "Bearings", 179900, 139900, 4],
    ["Shimano SM-BB52 Bottom Bracket", "Bearings", 54900, 41900, 11],
    ["Park Tool PolyLube 1000", "Workshop", 23900, 15900, 17],
    ["Schwalbe Tubeless Valve Set 60mm", "Tubeless", 29900, 19900, 16],
    ["Finish Line Citrus Degreaser 600ml", "Consumables", 27900, 18900, 21]
  ] as const;

  const seeded: InventoryItem[] = seedRows.map(([name, category, unitPriceCents, costCents, stockOnHand]) => ({
    id: buildId("inv"),
    name,
    category,
    unitPriceCents,
    costCents,
    stockOnHand,
    isActive: true,
    createdAtIso: now,
    updatedAtIso: now
  }));
  await writeItems(seeded);
  return seeded;
}

export async function createInventoryItem(input: Omit<InventoryItem, "id" | "createdAtIso" | "updatedAtIso">) {
  const all = await readItems();
  const now = new Date().toISOString();
  const next: InventoryItem = {
    ...input,
    id: buildId("inv"),
    createdAtIso: now,
    updatedAtIso: now
  };
  all.unshift(next);
  await writeItems(all);
  return next;
}

export async function updateInventoryItem(id: string, updates: Partial<Omit<InventoryItem, "id" | "createdAtIso">>) {
  const all = await readItems();
  const idx = all.findIndex((item) => item.id === id);
  if (idx < 0) return null;
  all[idx] = {
    ...all[idx],
    ...updates,
    updatedAtIso: new Date().toISOString()
  };
  await writeItems(all);
  return all[idx];
}

export async function applyInventoryUsage(usage: Array<{ inventoryItemId?: string; qty?: number }>) {
  if (!usage.length) return;
  const all = await readItems();
  let changed = false;
  for (const part of usage) {
    if (!part.inventoryItemId) continue;
    const idx = all.findIndex((item) => item.id === part.inventoryItemId);
    if (idx < 0) continue;
    const qty = Math.max(1, part.qty || 1);
    if (typeof all[idx].stockOnHand !== "number") continue;
    all[idx].stockOnHand = Math.max(0, (all[idx].stockOnHand || 0) - qty);
    all[idx].updatedAtIso = new Date().toISOString();
    changed = true;
  }
  if (changed) {
    await writeItems(all);
  }
}
