function parseDbUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const port = Number(parsed.port || "5432");
    return { host, port };
  } catch {
    return { host: "", port: 0 };
  }
}

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
