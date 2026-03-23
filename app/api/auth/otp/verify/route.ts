import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizePhone, shouldRequireE164, validateE164, isAllowedPhone } from "@/lib/auth/phone";
import { LOCAL_SESSION_COOKIE } from "@/src/lib/auth/localSession";
import { rateLimit, getClientIp, RATE_LIMIT_WINDOW_MS } from "@/lib/auth/rate-limit";
import {
  getMaxAttemptsPerHour,
  getMaxAttemptsPerIpPerHour,
  isStaticOtpEnabled
} from "@/lib/auth/config";
import { resolveWorkshopRole } from "@/src/lib/auth/roles";
import { ProfilesRepo, ShopRepo, createSession, getDefaultShopId, ensureJourneyProfiles } from "@/src/lib/store";
import { getRoleHomePath } from "@/src/lib/auth/roleRouting";
import type { ProfileRecord } from "@/src/lib/store";
import { conflict, notFound, tooManyRequests, unauthorized } from "@/lib/api/responses";
import { matchesDeterministicDevOtp } from "@/lib/auth/devOtp";
import { logAuditEvent } from "@/lib/audit/service";

function logInvalidOtp(reason: string, context: Record<string, unknown>) {
  const requestId = `otp_verify_${Math.random().toString(36).slice(2, 8)}`;
  console.warn(`[auth:${requestId}] ${reason}`, context);
  return requestId;
}

async function logOtpVerified(request: Request, payload: {
  phone?: string;
  intent?: string;
  outcome: "success" | "failure";
  reasonCode?: string;
  role?: string | null;
  profileId?: string | null;
  eventName?: string;
}) {
  const eventName = payload.eventName || "auth.otp.verified";
  await logAuditEvent({
    eventName,
    eventCategory: "auth",
    action: "verify",
    outcome: payload.outcome,
    severity: payload.outcome === "failure" ? "warning" : "info",
    actor: payload.phone
      ? {
          type: "user",
          id: payload.profileId || payload.phone,
          display: payload.phone,
          role: payload.role || null
        }
      : { type: "system", display: "anonymous" },
    target: {
      type: "auth_session",
      id: payload.profileId || payload.phone || null,
      display: payload.phone || "anonymous"
    },
    reasonCode: payload.reasonCode || null,
    contextJson: {
      intent: payload.intent || "LOGIN",
      reasonCode: payload.reasonCode || null
    },
    isSensitive: true,
    retentionClass: "security"
  }, request);
}

function invalidOtpResponse(reason: string, context: Record<string, unknown> = {}) {
  const response = unauthorized("INVALID_OTP", "Invalid OTP");
  response.headers.set("x-request-id", logInvalidOtp(reason, context));
  return response;
}

function invalidOtpRateLimit(reason: string, context: Record<string, unknown> = {}) {
  const response = tooManyRequests("INVALID_OTP", "Invalid OTP");
  response.headers.set("x-request-id", logInvalidOtp(reason, context));
  return response;
}

function userNotFoundResponse() {
  return unauthorized("USER_NOT_FOUND", "User not found. Please contact your administrator or register.");
}

function accountExistsResponse() {
  return conflict("ACCOUNT_EXISTS", "Account exists, please log in.", "Use the login flow for this phone number.");
}

function buildAuthResponse(params: {
  session: { id: string };
  profile: ProfileRecord;
  shopStatus?: string | null;
  redirect?: string;
}) {
  const role = resolveWorkshopRole({
    role: params.profile.role,
    phone: params.profile.phone,
    name: params.profile.name,
    shopId: params.profile.shopId
  });
  const response = NextResponse.json({
    ok: true,
    redirect:
      params.redirect ||
      getRoleHomePath(role, {
        phone: params.profile.phone,
        name: params.profile.name,
        profileStatus: params.profile.status,
        onboardingStatus: params.profile.onboardingStatus,
        shopStatus: params.shopStatus || null
      }),
    profile: {
      id: params.profile.id,
      role,
      name: params.profile.name,
      phone: params.profile.phone,
      status: params.profile.status,
      onboardingStatus: params.profile.onboardingStatus || null,
      shopStatus: params.shopStatus || null
    }
  });
  response.cookies.set(LOCAL_SESSION_COOKIE, params.session.id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    secure: process.env.NODE_ENV === "production"
  });
  return response;
}

export async function POST(request: Request) {
  if (!isStaticOtpEnabled()) {
    await logOtpVerified(request, { outcome: "failure", reasonCode: "OTP_DISABLED" });
    return notFound("NOT_FOUND", "Not found.");
  }

  const ip = getClientIp(request.headers);
  const ipCheck = rateLimit(`otp-verify:ip:${ip}`, getMaxAttemptsPerIpPerHour(), RATE_LIMIT_WINDOW_MS);
  if (!ipCheck.allowed) {
    await logOtpVerified(request, { outcome: "failure", reasonCode: "RATE_LIMIT_IP" });
    await logOtpVerified(request, { eventName: "auth.login.failure", outcome: "failure", reasonCode: "RATE_LIMIT_IP" });
    return invalidOtpRateLimit("otp_verify_rate_limited_ip", { ip });
  }

  const schema = z.object({
    phone: z.string().min(6),
    otp: z.string().min(4),
    intent: z.enum(["LOGIN", "CLIENT_SIGNUP", "SHOP_SIGNUP"]).optional()
  });

  const payload = await request.json().catch(() => ({ phone: "", otp: "", intent: "LOGIN" }));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    await logOtpVerified(request, { outcome: "failure", reasonCode: "INVALID_PAYLOAD" });
    await logOtpVerified(request, { eventName: "auth.login.failure", outcome: "failure", reasonCode: "INVALID_PAYLOAD" });
    return invalidOtpResponse("otp_verify_invalid_payload");
  }

  const phone = normalizePhone(parsed.data.phone);
  const intent = parsed.data.intent || "LOGIN";
  const phoneCheck = rateLimit(`otp-verify:phone:${phone}`, getMaxAttemptsPerHour(), RATE_LIMIT_WINDOW_MS);
  if (!phoneCheck.allowed) {
    await logOtpVerified(request, { phone, intent, outcome: "failure", reasonCode: "RATE_LIMIT_PHONE" });
    if (intent === "LOGIN") {
      await logOtpVerified(request, { eventName: "auth.login.failure", phone, intent, outcome: "failure", reasonCode: "RATE_LIMIT_PHONE" });
    }
    return invalidOtpRateLimit("otp_verify_rate_limited_phone", { phone });
  }
  const requiresE164 = shouldRequireE164();
  const validFormat = !requiresE164 || validateE164(phone);
  if (!validFormat || !isAllowedPhone(phone)) {
    await logOtpVerified(request, { phone, intent, outcome: "failure", reasonCode: "INVALID_PHONE" });
    if (intent === "LOGIN") {
      await logOtpVerified(request, { eventName: "auth.login.failure", phone, intent, outcome: "failure", reasonCode: "INVALID_PHONE" });
    }
    return invalidOtpResponse("otp_verify_invalid_phone", { phone });
  }
  if (!matchesDeterministicDevOtp(phone, parsed.data.otp)) {
    await logOtpVerified(request, { phone, intent, outcome: "failure", reasonCode: "OTP_MISMATCH" });
    if (intent === "LOGIN") {
      await logOtpVerified(request, { eventName: "auth.login.failure", phone, intent, outcome: "failure", reasonCode: "OTP_MISMATCH" });
    }
    return invalidOtpResponse("otp_verify_code_mismatch", { phone });
  }

  // Ensure dev/test profiles are seeded (no-op in production with real DB)
  await ensureJourneyProfiles();

  const existing = await ProfilesRepo.getByPhone(phone);

  if (intent === "LOGIN") {
    if (!existing || existing.status !== "ACTIVE") {
      await logOtpVerified(request, { phone, intent, outcome: "failure", reasonCode: "USER_NOT_FOUND" });
      await logOtpVerified(request, { eventName: "auth.login.failure", phone, intent, outcome: "failure", reasonCode: "USER_NOT_FOUND" });
      return userNotFoundResponse();
    }
    const session = await createSession(existing.id, 60 * 24 * 7);
    const shop = existing.shopId ? await ShopRepo.getById(existing.shopId) : null;
    const role = resolveWorkshopRole({
      role: existing.role,
      phone: existing.phone,
      name: existing.name,
      shopId: existing.shopId
    });
    await logOtpVerified(request, {
      phone,
      intent,
      outcome: "success",
      role,
      profileId: existing.id
    });
    await logOtpVerified(request, {
      eventName: "auth.login.success",
      phone,
      intent,
      outcome: "success",
      role,
      profileId: existing.id
    });
    return buildAuthResponse({
      session,
      profile: existing,
      shopStatus: shop?.shopStatus || null
    });
  }

  if (intent === "CLIENT_SIGNUP") {
    const defaultShopId = await getDefaultShopId();
    const existingRole = existing
      ? resolveWorkshopRole({ role: existing.role, phone: existing.phone, name: existing.name, shopId: existing.shopId })
      : null;
    if (existing && existing.status !== "ACTIVE") {
      await logOtpVerified(request, { phone, intent, outcome: "failure", reasonCode: "USER_NOT_FOUND" });
      return userNotFoundResponse();
    }
    if (existing && (existingRole !== "CLIENT" || existing.onboardingStatus === "NONE")) {
      await logOtpVerified(request, { phone, intent, outcome: "failure", reasonCode: "ACCOUNT_EXISTS" });
      return accountExistsResponse();
    }

    const profile = await ProfilesRepo.upsertByPhone({
      phone,
      name: existing?.name,
      role: "CLIENT",
      status: "ACTIVE",
      shopId: existing?.shopId || defaultShopId,
      onboardingStatus: existing?.onboardingStatus || "CLIENT_PROFILE_INCOMPLETE"
    });
    const session = await createSession(profile.id, 60 * 24 * 7);
    const shop = profile.shopId ? await ShopRepo.getById(profile.shopId) : null;
    await logOtpVerified(request, {
      phone,
      intent,
      outcome: "success",
      role: "CLIENT",
      profileId: profile.id
    });
    return buildAuthResponse({
      session,
      profile,
      shopStatus: shop?.shopStatus || null
    });
  }

  if (intent === "SHOP_SIGNUP") {
    const existingRole = existing
      ? resolveWorkshopRole({ role: existing.role, phone: existing.phone, name: existing.name, shopId: existing.shopId })
      : null;
    if (existing && existing.status !== "ACTIVE" && existing.status !== "PENDING_APPROVAL") {
      await logOtpVerified(request, { phone, intent, outcome: "failure", reasonCode: "USER_NOT_FOUND" });
      return userNotFoundResponse();
    }
    if (existing && (existingRole !== "SHOP_OWNER" || existing.onboardingStatus === "SHOP_ACTIVE")) {
      await logOtpVerified(request, { phone, intent, outcome: "failure", reasonCode: "ACCOUNT_EXISTS" });
      return accountExistsResponse();
    }
    const profile = await ProfilesRepo.upsertByPhone({
      phone,
      name: existing?.name,
      role: "SHOP_OWNER",
      status: existing?.status === "ACTIVE" ? "ACTIVE" : "PENDING_APPROVAL",
      shopId: existing?.shopId,
      onboardingStatus: existing?.onboardingStatus || "SHOP_REGISTRATION_STARTED"
    });
    const session = await createSession(profile.id, 60 * 24 * 7);
    const shop = profile.shopId ? await ShopRepo.getById(profile.shopId) : null;
    await logOtpVerified(request, {
      phone,
      intent,
      outcome: "success",
      role: "SHOP_OWNER",
      profileId: profile.id
    });
    return buildAuthResponse({
      session,
      profile,
      shopStatus: shop?.shopStatus || null
    });
  }
  await logOtpVerified(request, { phone, intent, outcome: "failure", reasonCode: "USER_NOT_FOUND" });
  return userNotFoundResponse();
}
