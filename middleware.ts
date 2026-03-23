import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCAL_SESSION_COOKIE = "cd_session";
const REQUEST_ID_HEADER = "x-request-id";
const REQUEST_PATH_HEADER = "x-request-path";
const REQUEST_METHOD_HEADER = "x-request-method";
const REVAMP_ENTRY_PATH = "/revamp-shell";

const SKIP_LOG_PREFIXES = ["/_next/", "/favicon.ico", "/icons/", "/manifest"];

function shouldLog(pathname: string) {
  return !SKIP_LOG_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function buildRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseTraceparent(value: string | null): { traceId?: string; spanId?: string } {
  if (!value) return {};
  const [version, traceId, spanId] = value.split("-");
  if (!version || !traceId || !spanId) return {};
  if (traceId.length !== 32 || spanId.length !== 16) return {};
  return { traceId, spanId };
}

function buildForwardHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);
  const requestId = headers.get(REQUEST_ID_HEADER) || buildRequestId();
  headers.set(REQUEST_ID_HEADER, requestId);
  headers.set(REQUEST_PATH_HEADER, request.nextUrl.pathname);
  headers.set(REQUEST_METHOD_HEADER, request.method.toUpperCase());

  const { traceId, spanId } = parseTraceparent(headers.get("traceparent"));
  if (traceId && !headers.get("x-trace-id")) headers.set("x-trace-id", traceId);
  if (spanId && !headers.get("x-span-id")) headers.set("x-span-id", spanId);

  return { headers, requestId };
}

function withForwardedContext(response: NextResponse, requestId: string) {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

// Domains that belong to the CycleDesk platform itself
const PLATFORM_DOMAINS = ["cycledesk.co.za", "www.cycledesk.co.za", "localhost", "127.0.0.1"];
const PLATFORM_SUFFIXES = [".cycledesk.co.za", ".vercel.app", ".localhost"];

function isPlatformDomain(hostname: string): boolean {
  const bare = hostname.split(":")[0].toLowerCase();
  if (PLATFORM_DOMAINS.includes(bare)) return true;
  return PLATFORM_SUFFIXES.some((s) => bare.endsWith(s));
}

const REVAMP_EXACT_PATHS = new Set<string>([]);
const REVAMP_PREFIXES: string[] = [];

function isRevampPath(pathname: string): boolean {
  if (REVAMP_EXACT_PATHS.has(pathname)) return true;
  return REVAMP_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const start = Date.now();
  const { method } = request;
  const pathname = request.nextUrl.pathname;
  const { headers: forwardedHeaders, requestId } = buildForwardHeaders(request);

  // ── /api/public/* — public API routes (no auth, shop resolution) ─────────
  if (pathname.startsWith("/api/public")) {
    const host = request.headers.get("host") || "localhost";
    const bare = host.split(":")[0].toLowerCase();

    if (!isPlatformDomain(bare)) {
      forwardedHeaders.set("x-shop-hostname", bare);
    } else {
      const subMatch = bare.match(/^([a-z0-9-]+)\.cycledesk\.co\.za$/);
      if (subMatch && subMatch[1] !== "www" && subMatch[1] !== "book") {
        forwardedHeaders.set("x-shop-slug", subMatch[1]);
      }
    }

    // Support ?shopSlug= query param for embedded widget / cross-origin iframes
    const shopSlugParam = request.nextUrl.searchParams.get("shopSlug");
    if (shopSlugParam && !forwardedHeaders.has("x-shop-slug") && !forwardedHeaders.has("x-shop-hostname")) {
      forwardedHeaders.set("x-shop-slug", shopSlugParam);
    }

    const response = NextResponse.next({ request: { headers: forwardedHeaders } });
    if (forwardedHeaders.get("x-shop-hostname")) {
      response.headers.set("x-shop-hostname", forwardedHeaders.get("x-shop-hostname") || "");
    }
    if (forwardedHeaders.get("x-shop-slug")) {
      response.headers.set("x-shop-slug", forwardedHeaders.get("x-shop-slug") || "");
    }
    if (shouldLog(pathname)) {
      console.log(`[middleware] ${method} ${pathname} 200 ${Date.now() - start}ms`);
    }
    return withForwardedContext(response, requestId);
  }

  // ── All API routes use handler-level auth/authorization, never browser redirect.
  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next({ request: { headers: forwardedHeaders } });
    if (shouldLog(pathname)) {
      console.log(`[middleware] ${method} ${pathname} 200 ${Date.now() - start}ms`);
    }
    return withForwardedContext(response, requestId);
  }

  // ── /services — data-source header passthrough ───────────────────────────
  if (pathname.startsWith("/services")) {
    const source = process.env.USE_FAKE_DB === "true" ? "fixtures" : "db";
    const response = NextResponse.next({ request: { headers: forwardedHeaders } });
    response.headers.set("x-cycledesk-data-source", source);
    response.headers.set("x-data-source", source);
    if (shouldLog(pathname)) {
      console.log(`[middleware] ${method} ${pathname} 200 ${Date.now() - start}ms`);
    }
    return withForwardedContext(response, requestId);
  }

  // ── /book/* and /success — preserve shop resolution headers for public flows
  if (pathname.startsWith("/book") || pathname.startsWith("/success")) {
    const host = request.headers.get("host") || "localhost";
    const bare = host.split(":")[0].toLowerCase();

    if (!isPlatformDomain(bare)) {
      forwardedHeaders.set("x-shop-hostname", bare);
    } else {
      const subMatch = bare.match(/^([a-z0-9-]+)\.cycledesk\.co\.za$/);
      if (subMatch && subMatch[1] !== "www" && subMatch[1] !== "book") {
        forwardedHeaders.set("x-shop-slug", subMatch[1]);
      }
    }

    // Support ?shopSlug= query param for embedded widget / cross-origin iframes
    const shopSlugParam = request.nextUrl.searchParams.get("shopSlug");
    if (shopSlugParam && !forwardedHeaders.has("x-shop-slug") && !forwardedHeaders.has("x-shop-hostname")) {
      forwardedHeaders.set("x-shop-slug", shopSlugParam);
    }

    // Allow embedding in iframes for the widget
    const response = NextResponse.next({ request: { headers: forwardedHeaders } });
    response.headers.set("Content-Security-Policy", "frame-ancestors *");
    response.headers.set("X-Frame-Options", "ALLOWALL");
    if (forwardedHeaders.get("x-shop-hostname")) {
      response.headers.set("x-shop-hostname", forwardedHeaders.get("x-shop-hostname") || "");
    }
    if (forwardedHeaders.get("x-shop-slug")) {
      response.headers.set("x-shop-slug", forwardedHeaders.get("x-shop-slug") || "");
    }
    if (shouldLog(pathname)) {
      console.log(`[middleware] ${method} ${pathname} 200 ${Date.now() - start}ms`);
    }
    return withForwardedContext(response, requestId);
  }

  // ── Protected web routes — require session cookie ─────────────────────────
  const isProtectedPage =
    pathname.startsWith("/app") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/mech") ||
    pathname.startsWith("/platform");

  if (isProtectedPage) {
    const localSession = request.cookies.get(LOCAL_SESSION_COOKIE)?.value;
    if (!localSession) {
      const response = redirectToLogin(request);
      if (shouldLog(pathname)) {
        console.log(`[middleware] ${method} ${pathname} 302 ${Date.now() - start}ms`);
      }
      return withForwardedContext(response, requestId);
    }
  }

  if (isRevampPath(pathname)) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = REVAMP_ENTRY_PATH;
    const response = NextResponse.rewrite(rewriteUrl, { request: { headers: forwardedHeaders } });
    if (forwardedHeaders.get("x-shop-hostname")) {
      response.headers.set("x-shop-hostname", forwardedHeaders.get("x-shop-hostname") || "");
    }
    if (forwardedHeaders.get("x-shop-slug")) {
      response.headers.set("x-shop-slug", forwardedHeaders.get("x-shop-slug") || "");
    }
    if (shouldLog(pathname)) {
      console.log(`[middleware] ${method} ${pathname} 200 ${Date.now() - start}ms`);
    }
    return withForwardedContext(response, requestId);
  }

  const response = NextResponse.next({ request: { headers: forwardedHeaders } });
  if (shouldLog(pathname)) {
    console.log(`[middleware] ${method} ${pathname} 200 ${Date.now() - start}ms`);
  }
  return withForwardedContext(response, requestId);
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  const returnTo = request.nextUrl.pathname + request.nextUrl.search;
  url.searchParams.set("returnTo", returnTo);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/start",
    "/success",
    "/api/:path*",
    "/services/:path*",
    "/book/:path*",
    "/app/:path*",
    "/admin/:path*",
    "/mech/:path*",
    "/platform/:path*",
  ],
};
