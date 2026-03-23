export function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL;
  if (typeof window === "undefined") {
    // Vercel provides VERCEL_URL for server-side requests
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    const port = process.env.PORT || "3000";
    return `http://localhost:${port}`;
  }
  return "";
}

export async function apiFetch<T>(path: string, init?: RequestInit) {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${normalizedPath}`;
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`API ${res.status}`);
  }
  return (await res.json()) as T;
}
