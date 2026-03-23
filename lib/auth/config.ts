function parseNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback;
  // Strip whitespace and literal \n artifacts (common in Vercel env var entries)
  const cleaned = value.replace(/\\n/g, "").trim().toLowerCase();
  return cleaned === "true" || cleaned === "1";
}

function parseList(value: string | undefined) {
  if (!value) return [];
  return value
    .replace(/\\n/g, "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function isStaticOtpEnabled() {
  const enabled = parseBoolean(process.env.STATIC_OTP_ENABLED, false);
  if (!enabled) return false;
  if (process.env.NODE_ENV === "production") {
    // In production, require explicit opt-in (staging/beta only — replace with real OTP provider before GA)
    return parseBoolean(process.env.STATIC_OTP_ALLOW_IN_PRODUCTION, false);
  }
  return true;
}

export function isStaticOtpProdAllowlistedPhone(phone: string) {
  if (process.env.NODE_ENV !== "production") return true;
  const allowlist = getStaticOtpProdAllowlist();
  return allowlist.includes(phone);
}

export function getStaticOtpProdAllowlist() {
  return parseList(process.env.STATIC_OTP_PROD_ALLOWLIST);
}

export function getSessionSecret() {
  return process.env.STATIC_OTP_SESSION_SECRET || "";
}

export function getStaticOtpCode() {
  return process.env.STATIC_OTP_CODE || "";
}

export function getSessionTtlMinutes() {
  return parseNumber(process.env.STATIC_OTP_SESSION_TTL_MINUTES, 1440);
}

export function getMaxAttemptsPerHour() {
  return parseNumber(process.env.STATIC_OTP_MAX_ATTEMPTS_PER_HOUR, 10);
}

export function getMaxRequestsPerHour() {
  return parseNumber(process.env.STATIC_OTP_MAX_REQUESTS_PER_HOUR, 5);
}

export function getMaxAttemptsPerIpPerHour() {
  return parseNumber(process.env.STATIC_OTP_MAX_ATTEMPTS_PER_IP_PER_HOUR, 30);
}
