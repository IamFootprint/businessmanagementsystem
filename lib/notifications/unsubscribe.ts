import { createHmac } from "node:crypto";

function getSecret(): string {
  return process.env.NOTIFICATION_SECRET || process.env.SESSION_SECRET || "cycledesk-notifications-default-key";
}

export function signUnsubscribeToken(profileId: string, channel: string): string {
  const payload = `${profileId}:${channel}`;
  const hmac = createHmac("sha256", getSecret()).update(payload).digest("hex");
  const token = Buffer.from(`${payload}:${hmac}`).toString("base64url");
  return token;
}

export function verifyUnsubscribeToken(token: string): { profileId: string; channel: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length < 3) return null;
    const hmac = parts.pop()!;
    const payload = parts.join(":");
    const expected = createHmac("sha256", getSecret()).update(payload).digest("hex");
    if (hmac !== expected) return null;
    const [profileId, channel] = payload.split(":");
    if (!profileId || !channel) return null;
    return { profileId, channel };
  } catch {
    return null;
  }
}

export function buildUnsubscribeUrl(profileId: string, channel: string, baseUrl?: string): string {
  const token = signUnsubscribeToken(profileId, channel);
  const base = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || "";
  return `${base}/api/public/notifications/unsubscribe?token=${token}`;
}
