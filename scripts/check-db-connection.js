const fs = require("node:fs");
const path = require("node:path");
const net = require("node:net");
const { PrismaClient } = require("@prisma/client");

function loadEnvFile() {
  const fullPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(fullPath)) {
    console.error("[db-check] ERROR: .env file not found in apps/web.");
    console.error("[db-check] Create apps/web/.env and set DATABASE_URL, DIRECT_URL, SHADOW_DATABASE_URL.");
    process.exit(1);
  }
  const content = fs.readFileSync(fullPath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    if (!line || line.trim().startsWith("#")) return;
    const idx = line.indexOf("=");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

function parseDbUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const port = Number(parsed.port || "5432");
    const dbname = parsed.pathname.replace("/", "") || "postgres";
    return { host, port, dbname };
  } catch {
    return { host: "", port: 0, dbname: "" };
  }
}

function tcpCheck(host, port, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port, timeout: timeoutMs }, () => {
      socket.end();
      resolve();
    });
    socket.on("error", reject);
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("timeout"));
    });
  });
}

async function main() {
  loadEnvFile();
  const url = process.env.DATABASE_URL || "";
  if (!url) {
    console.error("[db-check] ERROR: DATABASE_URL is missing.");
    process.exit(1);
  }

  const { host, port, dbname } = parseDbUrl(url);
  if (!host || !port) {
    console.error("[db-check] ERROR: DATABASE_URL is invalid.");
    process.exit(1);
  }

  try {
    console.log(`[db-check] Target: ${host}:${port}/${dbname}`);
    await tcpCheck(host, port);
  } catch (error) {
    const err = error;
    console.error("[db-check] ERROR: Unable to reach database host.");
    console.error(`[db-check] Host: ${host}:${port} DB: ${dbname}`);

    if (err.code === "ENOTFOUND" || err.code === "EAI_AGAIN") {
      console.error("[db-check] Reason: DNS lookup failed.");
    } else if (err.code === "ETIMEDOUT" || err.message === "timeout") {
      console.error("[db-check] Reason: Connection timed out.");
    } else if (err.code === "ECONNREFUSED") {
      console.error("[db-check] Reason: Connection refused.");
    } else if (err.code) {
      console.error(`[db-check] Reason: ${err.code}.`);
    }

    if (host.includes("supabase.co")) {
      console.error(
        "[db-check] Next: use the DIRECT Postgres URL (not pooler), check allow-listing, and network access."
      );
    }
    if (host === "localhost" || host === "127.0.0.1") {
      console.error(
        "[db-check] Next: start local Postgres with `brew services start postgresql@14` or `pnpm db:up`."
      );
    }
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const shopCount = await prisma.shop.count();
    const serviceCount = await prisma.serviceItem.count();
    const packageCount = await prisma.servicePackage.count();
    const pricingCount = await prisma.pricingRule.count();
    console.log("[db-check] OK: Prisma connected.");
    console.log(
      `[db-check] Counts: shops=${shopCount}, service_items=${serviceCount}, service_packages=${packageCount}, pricing_rules=${pricingCount}`
    );

    const bookingColumns = await prisma.$queryRawUnsafe(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'bookings'`
    );
    const existingColumns = new Set(
      bookingColumns
        .map((row) => row?.column_name)
        .filter((name) => typeof name === "string")
    );
    const requiredBookingColumns = [
      "id",
      "ref",
      "customerProfileId",
      "customerName",
      "customerPhone",
      "serviceItemId",
      "selectedPackageId",
      "serviceNameSnapshot",
      "addressLine1",
      "suburb",
      "city",
      "notes",
      "slotIso",
      "status",
      "shopId",
      "pricingSnapshotJson",
      "cancelReason",
      "amendedAt",
      "createdAt",
      "updatedAt"
    ];
    const missingBookingColumns = requiredBookingColumns.filter((name) => !existingColumns.has(name));
    if (missingBookingColumns.length > 0) {
      const hasLegacySnapshot = existingColumns.has("pricing_snapshot_json");
      console.error(
        `[db-check] ERROR: bookings schema drift detected. Missing columns: ${missingBookingColumns.join(", ")}`
      );
      if (hasLegacySnapshot) {
        console.error(
          "[db-check] Legacy column detected: pricing_snapshot_json. Run migrations to repair drift."
        );
      }
      console.error("[db-check] Next: run `pnpm db:migrate:deploy` from repo root.");
      process.exit(1);
    }
  } catch (error) {
    const e = error;
    console.error("[db-check] ERROR: Prisma query failed.");
    console.error("[db-check] Details:", {
      name: e?.name,
      code: e?.code,
      message: e?.message,
      meta: e?.meta
    });
    console.error("[db-check] Hint: run `pnpm db:migrate` then `pnpm db:seed`.");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[db-check] ERROR:", error);
  process.exit(1);
});
