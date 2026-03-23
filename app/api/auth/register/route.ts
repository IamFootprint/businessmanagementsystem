import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizePhone, isAllowedPhone } from "@/lib/auth/phone";
import { rateLimit, getClientIp, RATE_LIMIT_WINDOW_MS } from "@/lib/auth/rate-limit";
import { getMaxAttemptsPerIpPerHour } from "@/lib/auth/config";
import { ProfilesRepo, createSession, getDefaultShopId } from "@/src/lib/store";
import { LOCAL_SESSION_COOKIE } from "@/src/lib/auth/localSession";
import { resolveWorkshopRole } from "@/src/lib/auth/roles";

const schema = z.object({
  phone: z.string().min(6),
  name: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const ipCheck = rateLimit(`register:ip:${ip}`, getMaxAttemptsPerIpPerHour(), RATE_LIMIT_WINDOW_MS);
  if (!ipCheck.allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many attempts. Please try again later." } },
      { status: 429 }
    );
  }

  const payload = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Please provide a valid name and phone number." } },
      { status: 400 }
    );
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!isAllowedPhone(phone)) {
    return NextResponse.json(
      { error: { code: "INVALID_PHONE", message: "This phone number is not allowed." } },
      { status: 400 }
    );
  }

  const existing = await ProfilesRepo.getByPhone(phone);
  if (existing) {
    return NextResponse.json(
      { error: { code: "ALREADY_EXISTS", message: "An account with this number already exists. Please login instead." } },
      { status: 409 }
    );
  }

  const shopId = await getDefaultShopId();
  const profile = await ProfilesRepo.upsertByPhone({
    phone,
    name: parsed.data.name.trim(),
    role: "CLIENT",
    status: "ACTIVE",
    shopId,
  });

  const session = await createSession(profile.id, 60 * 24 * 7);
  const response = NextResponse.json({
    ok: true,
    redirect: "/app/bookings",
    profile: {
      id: profile.id,
      role: resolveWorkshopRole({
        role: profile.role,
        phone: profile.phone,
        name: profile.name,
        shopId: profile.shopId
      }),
      name: profile.name,
      phone: profile.phone,
    },
  });

  response.cookies.set(LOCAL_SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
