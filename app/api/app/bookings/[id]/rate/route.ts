import { cookies } from "next/headers";
import { z } from "zod";
import { LOCAL_SESSION_COOKIE, getProfileForSession } from "@/src/lib/auth/localSession";
import { BookingsRepo, RatingsRepo } from "@/src/lib/store";
import { ok, badRequest, notFound, unauthorized } from "@/lib/api/responses";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional()
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const sessionId = cookies().get(LOCAL_SESSION_COOKIE)?.value;
  if (!sessionId) {
    return unauthorized("UNAUTHORIZED", "Unauthorized");
  }
  const profile = await getProfileForSession(sessionId);
  if (!profile) {
    return unauthorized("UNAUTHORIZED", "Unauthorized");
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest("INVALID_INPUT", "Rating must be 1-5 stars.");
  }

  const booking = await BookingsRepo.get(params.id);
  if (!booking) {
    return notFound("NOT_FOUND", "Booking not found");
  }
  if (booking.status !== "COMPLETED") {
    return badRequest("NOT_COMPLETED", "You can only rate completed bookings.");
  }

  const existing = await RatingsRepo.getByBookingId(booking.id);
  if (existing) {
    return ok({ rating: existing });
  }

  const rating = await RatingsRepo.create({
    bookingId: booking.id,
    customerProfileId: profile.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment
  });

  return ok({ rating });
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const rating = await RatingsRepo.getByBookingId(params.id);
  return ok({ rating: rating || null });
}
