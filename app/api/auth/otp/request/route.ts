import { z } from "zod";
import { normalizePhone, shouldRequireE164, validateE164, isAllowedPhone } from "@/lib/auth/phone";
import { rateLimit, getClientIp, RATE_LIMIT_WINDOW_MS } from "@/lib/auth/rate-limit";
import { isKillSwitchActive, KILL_SWITCHES } from "@/src/lib/db/feature-flags";
import {
  getMaxRequestsPerHour,
  getMaxAttemptsPerIpPerHour,
  isStaticOtpEnabled
} from "@/lib/auth/config";
import { ok, notFound, tooManyRequests, serviceUnavailable } from "@/lib/api/responses";
import { logAuditEvent } from "@/lib/audit/service";

const schema = z.object({
  phone: z.string().min(1),
  intent: z.enum(["LOGIN", "CLIENT_SIGNUP", "SHOP_SIGNUP"]).optional()
});

function logInvalidOtp(reason: string, context: Record<string, unknown>) {
  const requestId = `otp_req_${Math.random().toString(36).slice(2, 8)}`;
  console.warn(`[auth:${requestId}] ${reason}`, context);
  return requestId;
}

async function logOtpRequested(request: Request, payload: {
  phone?: string;
  intent?: string;
  outcome: "success" | "failure";
  reasonCode?: string;
}) {
  await logAuditEvent({
    eventName: "auth.otp.requested",
    eventCategory: "auth",
    action: "request",
    outcome: payload.outcome,
    severity: payload.outcome === "failure" ? "warning" : "info",
    actor: payload.phone
      ? {
          type: "user",
          id: payload.phone,
          display: payload.phone
        }
      : { type: "system", display: "anonymous" },
    target: {
      type: "auth_otp",
      id: payload.phone || null,
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

export async function POST(request: Request) {
  if (await isKillSwitchActive(KILL_SWITCHES.OTP_AUTH)) {
    return serviceUnavailable('Authentication is temporarily unavailable')
  }

  if (!isStaticOtpEnabled()) {
    await logOtpRequested(request, { outcome: "failure", reasonCode: "OTP_DISABLED" });
    const response = notFound("NOT_FOUND", "Not found.");
    response.headers.set("x-request-id", logInvalidOtp("otp_request_disabled", {}));
    return response;
  }

  const ip = getClientIp(request.headers);
  const ipCheck = rateLimit(`otp-request:ip:${ip}`, getMaxAttemptsPerIpPerHour(), RATE_LIMIT_WINDOW_MS);
  if (!ipCheck.allowed) {
    await logOtpRequested(request, { outcome: "failure", reasonCode: "RATE_LIMIT_IP" });
    return tooManyRequests("RATE_LIMITED", "Too many attempts. Please try again later.");
  }

  const payload = await request.json().catch(() => ({ phone: "" }));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    await logOtpRequested(request, { outcome: "failure", reasonCode: "INVALID_PAYLOAD" });
    logInvalidOtp("otp_request_invalid_payload", {});
    return ok({
      requested: true,
      message: "If your account is eligible, you will receive an OTP."
    });
  }

  const normalized = normalizePhone(parsed.data.phone);
  const intent = parsed.data.intent || "LOGIN";

  const requiresE164 = shouldRequireE164();
  if (requiresE164 && !validateE164(normalized)) {
    await logOtpRequested(request, { phone: normalized, intent, outcome: "failure", reasonCode: "INVALID_PHONE_FORMAT" });
    logInvalidOtp("otp_request_invalid_phone_format", { phone: normalized });
    return ok({
      requested: true,
      message: "If your account is eligible, you will receive an OTP."
    });
  }

  if (!isAllowedPhone(normalized)) {
    await logOtpRequested(request, { phone: normalized, intent, outcome: "failure", reasonCode: "PHONE_NOT_ALLOWED" });
    logInvalidOtp("otp_request_phone_not_allowed", { phone: normalized });
    return ok({
      requested: true,
      message: "If your account is eligible, you will receive an OTP."
    });
  }

  const phoneCheck = rateLimit(`otp-request:phone:${normalized}`, getMaxRequestsPerHour(), RATE_LIMIT_WINDOW_MS);
  if (!phoneCheck.allowed) {
    await logOtpRequested(request, { phone: normalized, intent, outcome: "failure", reasonCode: "RATE_LIMIT_PHONE" });
    logInvalidOtp("otp_request_rate_limited_phone", { phone: normalized });
    return ok({
      requested: true,
      message: "If your account is eligible, you will receive an OTP."
    });
  }

  await logOtpRequested(request, { phone: normalized, intent, outcome: "success" });
  return ok({
    requested: true,
    message: "If your account is eligible, you will receive an OTP."
  });
}
