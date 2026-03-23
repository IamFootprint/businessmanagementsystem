import net from "node:net";

type PrismaCtor = new () => any;

function getPrismaClientCtor(): PrismaCtor | null {
  try {
    const prismaModule = require("@prisma/client") as { PrismaClient?: PrismaCtor };
    return prismaModule?.PrismaClient ?? null;
  } catch {
    return null;
  }
}

function parseDbUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const port = Number(parsed.port || "5432");
    const dbname = parsed.pathname.replace("/", "") || "postgres";
    return { host, port, dbname };
  } catch (error) {
    return { host: "", port: 0, dbname: "" };
  }
}

function tcpCheck(host: string, port: number, timeoutMs = 2000) {
  return new Promise<void>((resolve, reject) => {
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
    const err = error as NodeJS.ErrnoException;
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
      console.error("[db-check] Next: use the DIRECT Postgres URL (not pooler), check allow-listing, and network access.");
    }
    if (host === "localhost" || host === "127.0.0.1") {
      console.error("[db-check] Next: run `pnpm db:up` to start local Postgres.");
    }
    process.exit(1);
  }

  const PrismaClient = getPrismaClientCtor();
  if (!PrismaClient) {
    console.error("[db-check] ERROR: Prisma client is unavailable.");
    console.error("[db-check] Next: run `pnpm -C apps/web db:generate`.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const shopCount = await prisma.shop.count();
    const serviceCount = await prisma.serviceItem.count();
    const packageCount = await prisma.servicePackage.count();
    console.log("[db-check] OK: Prisma connected.");
    console.log(`[db-check] Counts: shops=${shopCount}, service_items=${serviceCount}, service_packages=${packageCount}`);
  } catch (error) {
    const e = error as any;
    console.error("[db-check] ERROR: Prisma query failed.");
    console.error("[db-check] Details:", {
      name: e?.name,
      code: e?.code,
      message: e?.message,
      meta: e?.meta,
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
