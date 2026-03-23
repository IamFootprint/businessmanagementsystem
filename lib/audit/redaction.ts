const SECRET_KEY_PATTERN = /(password|passcode|otp|token|secret|authorization|cookie|session|pin|cvv|cvc|api[-_]?key|access[-_]?token|refresh[-_]?token)/i;
const CONTACT_KEY_PATTERN = /(phone|mobile|email)/i;

export function maskPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "***";
  if (digits.length <= 4) return `${hasPlus ? "+" : ""}***${digits.slice(-1)}`;
  const head = digits.slice(0, 3);
  const tail = digits.slice(-2);
  return `${hasPlus ? "+" : ""}${head}${"*".repeat(Math.max(3, digits.length - 5))}${tail}`;
}

export function maskEmail(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = String(input).trim().toLowerCase();
  const [local, domain] = value.split("@");
  if (!local || !domain) return "***";
  const localMasked = local.length <= 2 ? `${local[0] || "*"}*` : `${local[0]}${"*".repeat(local.length - 2)}${local.slice(-1)}`;
  const [domainName, ...rest] = domain.split(".");
  const domainMasked = domainName.length <= 2
    ? `${domainName[0] || "*"}*`
    : `${domainName[0]}${"*".repeat(domainName.length - 2)}${domainName.slice(-1)}`;
  return `${localMasked}@${domainMasked}${rest.length ? `.${rest.join(".")}` : ""}`;
}

function normalizePrimitive(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  return value;
}

function redactScalarForKey(key: string, value: unknown) {
  if (value == null) return value;
  if (SECRET_KEY_PATTERN.test(key)) return "[REDACTED]";
  if (CONTACT_KEY_PATTERN.test(key) && typeof value === "string") {
    if (key.toLowerCase().includes("email")) {
      return maskEmail(value);
    }
    return maskPhone(value);
  }
  return value;
}

export function redactAuditValue(input: unknown): unknown {
  const seen = new WeakSet<object>();

  function walk(value: unknown, parentKey?: string): unknown {
    const normalized = normalizePrimitive(value);
    if (normalized == null) return normalized;

    if (typeof normalized !== "object") {
      if (!parentKey) return normalized;
      return redactScalarForKey(parentKey, normalized);
    }

    if (Array.isArray(normalized)) {
      return normalized.map((item) => walk(item, parentKey));
    }

    if (seen.has(normalized as object)) {
      return "[CIRCULAR]";
    }
    seen.add(normalized as object);

    const output: Record<string, unknown> = {};
    for (const [key, rawValue] of Object.entries(normalized as Record<string, unknown>)) {
      if (typeof rawValue === "undefined") continue;
      const nextValue = walk(rawValue, key);
      output[key] = redactScalarForKey(key, nextValue);
    }
    return output;
  }

  return walk(input);
}
