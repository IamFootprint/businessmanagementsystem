const fs = require("node:fs");
const path = require("node:path");

function loadEnvFile() {
  const fullPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(fullPath)) {
    console.error("[db-migrate] ERROR: .env file not found in apps/web.");
    console.error("[db-migrate] Create apps/web/.env and set DATABASE_URL, DIRECT_URL, SHADOW_DATABASE_URL.");
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
    return { host, port };
  } catch {
    return { host: "", port: 0 };
  }
}

loadEnvFile();

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
if (!directUrl) {
  console.error("[db-migrate] ERROR: DIRECT_URL or DATABASE_URL is required.");
  process.exit(1);
}

const { host, port } = parseDbUrl(directUrl);
const isPooler = host.includes("pooler") || port === 6543;

if (isPooler) {
  console.error("[db-migrate] ERROR: Migration URL points at the Supabase pooler.");
  console.error("[db-migrate] Use the direct Postgres connection string instead.");
  process.exit(1);
}
