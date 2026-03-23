const COUNTRY_PREFIXES: Record<string, string[]> = {
  ZA: ["+27"],
};

export function normalizePhone(input: string) {
  return input.replace(/\s+/g, "").replace(/-/g, "");
}

export function validateE164(phone: string) {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

function parseList(value: string | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isAllowedPhone(phone: string) {
  const prefixesEnv = parseList(process.env.STATIC_OTP_ALLOWED_PHONE_PREFIXES);
  if (prefixesEnv.length) {
    return prefixesEnv.some((prefix) => phone.startsWith(prefix));
  }

  const countriesEnv = parseList(process.env.STATIC_OTP_ALLOWED_COUNTRIES);
  const countries = countriesEnv.length ? countriesEnv : ["ZA"];
  const prefixes = countries.flatMap((code) => COUNTRY_PREFIXES[code] || []);
  if (!prefixes.length) return false;
  return prefixes.some((prefix) => phone.startsWith(prefix));
}

export function maskPhone(phone: string) {
  if (phone.length <= 4) return "****";
  const tail = phone.slice(-3);
  return `${phone.slice(0, 3)}******${tail}`;
}

export function shouldRequireE164() {
  const raw = process.env.STATIC_OTP_REQUIRE_E164;
  if (raw === undefined) return true;
  return raw.toLowerCase() === "true";
}
