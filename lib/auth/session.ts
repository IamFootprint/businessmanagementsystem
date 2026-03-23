const encoder = new TextEncoder();

function base64FromBytes(bytes: Uint8Array) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function bytesFromBase64(base64: string) {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlEncode(data: Uint8Array) {
  const base64 = base64FromBytes(data);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLength);
  return bytesFromBase64(base64);
}

async function hmacSha256(secret: string, data: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64UrlEncode(new Uint8Array(signature));
}

function safeEqual(a: string, b: string) {
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  const length = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (aBytes[i] || 0) ^ (bBytes[i] || 0);
  }
  return diff === 0;
}

export async function createSessionToken(phone: string, ttlMinutes: number, secret: string) {
  if (!secret || secret.length < 32) {
    throw new Error("STATIC_OTP_SESSION_SECRET must be at least 32 characters");
  }
  const exp = Date.now() + ttlMinutes * 60 * 1000;
  const payload = base64UrlEncode(encoder.encode(JSON.stringify({ phone, exp })));
  const signature = await hmacSha256(secret, payload);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string | undefined, secret: string) {
  if (!token) return { valid: false };
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false };
  const [payload, signature] = parts;
  const expected = await hmacSha256(secret, payload);
  if (!safeEqual(signature, expected)) return { valid: false };
  const decoded = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
  if (typeof decoded?.exp !== "number" || Date.now() > decoded.exp) return { valid: false };
  return { valid: true, phone: decoded.phone };
}
