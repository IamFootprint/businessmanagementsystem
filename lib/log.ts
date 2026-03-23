export function logRequest(req: Request) {
  const url = new URL(req.url);
  const method = req.method.toUpperCase();
  console.log(`[api] ${method} ${url.pathname}`);
}

export function logApiAccess(req: Request, dataSource: string, role?: string | null) {
  if (process.env.NODE_ENV === "test") return;
  const url = new URL(req.url);
  const method = req.method.toUpperCase();
  const userRole = role || "anonymous";
  console.log(`[api] ${method} ${url.pathname} source=${dataSource} role=${userRole}`);
}

export function logInfo(event: string, data?: Record<string, unknown>) {
  console.log(`[api] ${event}`, data || {});
}

export function logError(event: string, error: unknown) {
  console.error(`[api] ${event}`, error);
}
