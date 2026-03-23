import { cookies, headers } from "next/headers";
import { LOCAL_SESSION_COOKIE } from "@/src/lib/auth/localSession";
import type { AuditRequestContext } from "./types";

function firstDefined(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (value && value.trim()) return value.trim();
  }
  return null;
}

export function buildRequestId() {
  const random = Math.random().toString(36).slice(2, 10);
  return `req_${Date.now().toString(36)}_${random}`;
}

function parseTraceparent(traceparent: string | null): { traceId?: string | null; spanId?: string | null } {
  if (!traceparent) return {};
  const [version, traceId, spanId] = traceparent.split("-");
  if (!version || !traceId || !spanId) return {};
  if (traceId.length !== 32 || spanId.length !== 16) return {};
  return { traceId, spanId };
}

function inferChannel(route: string | null) {
  if (!route) return "unknown";
  if (route.startsWith("/api/admin")) return "admin_api";
  if (route.startsWith("/api/mech")) return "mechanic_api";
  if (route.startsWith("/api/public")) return "public_api";
  if (route.startsWith("/api/app")) return "client_api";
  if (route.startsWith("/api/auth")) return "auth_api";
  if (route.startsWith("/api/platform")) return "platform_api";
  if (route.startsWith("/admin")) return "admin_web";
  if (route.startsWith("/mech")) return "mechanic_web";
  if (route.startsWith("/app")) return "client_web";
  return "web";
}

function parseSessionFromCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  const segments = cookieHeader.split(";").map((part) => part.trim());
  const entry = segments.find((part) => part.startsWith(`${LOCAL_SESSION_COOKIE}=`));
  if (!entry) return null;
  const [, value] = entry.split("=");
  return value || null;
}

function resolveHeadersFromRequest(request?: Request) {
  if (request) return request.headers;
  try {
    return headers();
  } catch {
    return new Headers();
  }
}

export function resolveAuditRequestContext(request?: Request): AuditRequestContext {
  const headerBag = resolveHeadersFromRequest(request);
  const route = request
    ? new URL(request.url).pathname
    : firstDefined(headerBag.get("x-request-path"), headerBag.get("x-middleware-pathname"));
  const method = request?.method || firstDefined(headerBag.get("x-request-method"), headerBag.get("x-http-method"));
  const requestId = firstDefined(headerBag.get("x-request-id"), headerBag.get("x-correlation-id")) || buildRequestId();

  const traceContext = parseTraceparent(headerBag.get("traceparent"));
  const forwarded = firstDefined(headerBag.get("x-forwarded-for"), headerBag.get("x-real-ip"));
  const ipAddress = forwarded?.split(",")[0]?.trim() || null;

  let sessionId: string | null = null;
  try {
    sessionId = cookies().get(LOCAL_SESSION_COOKIE)?.value || null;
  } catch {
    sessionId = null;
  }
  if (!sessionId) {
    sessionId = parseSessionFromCookieHeader(headerBag.get("cookie"));
  }

  return {
    requestId,
    traceId: firstDefined(headerBag.get("x-trace-id"), traceContext.traceId),
    spanId: firstDefined(headerBag.get("x-span-id"), traceContext.spanId),
    sessionId,
    ipAddress,
    userAgent: firstDefined(headerBag.get("user-agent")),
    deviceId: firstDefined(headerBag.get("x-device-id"), headerBag.get("x-client-device-id")),
    channel: inferChannel(route),
    route,
    httpMethod: method ? method.toUpperCase() : null
  };
}
