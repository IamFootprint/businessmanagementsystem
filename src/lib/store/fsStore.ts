import fs from "node:fs/promises";
import path from "node:path";

// On Vercel serverless, the filesystem is ephemeral — proactively use memory-only mode
// to avoid write errors and unnecessary filesystem calls.
let useMemoryOnly = Boolean(process.env.VERCEL);

export function getDataDir() {
  const cwd = process.cwd();
  if (cwd.endsWith(path.join("apps", "web"))) {
    return path.join(cwd, ".local-data");
  }
  return path.join(cwd, "apps", "web", ".local-data");
}

export async function ensureDir(dirPath: string) {
  if (useMemoryOnly) return null;
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return dirPath;
  } catch {
    useMemoryOnly = true;
    return null;
  }
}

export async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonAtomic<T>(filePath: string, data: T) {
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tempPath, filePath);
}

export function isMemoryOnly() {
  return useMemoryOnly;
}

export function setMemoryOnly() {
  useMemoryOnly = true;
}

export function resolveDataFile(fileName: string) {
  return path.join(getDataDir(), fileName);
}
