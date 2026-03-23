import { requireRole } from "@/src/lib/auth/localSession";
import { BookingsRepo, ChatThreadsRepo } from "@/src/lib/store";
import { listNotificationEvents } from "@/src/lib/workshop/notifications";
import { ok } from "@/lib/api/responses";

type AppNotification = {
  id: string;
  type: "booking" | "status" | "payment" | "message" | "system";
  title: string;
  body: string;
  createdAtIso: string;
  read: boolean;
  bookingId?: string;
  bookingRef?: string;
};

function mapBookingStatus(status: string) {
  const normalized = status.trim().toUpperCase();
  if (normalized === "COMPLETED") return { type: "status" as const, title: "Service completed" };
  if (normalized === "CANCELLED") return { type: "status" as const, title: "Booking cancelled" };
  if (normalized === "CONFIRMED") return { type: "booking" as const, title: "Booking confirmed" };
  return { type: "booking" as const, title: "Booking update" };
}

function mapEventType(eventType: string): AppNotification["type"] {
  const key = eventType.toLowerCase();
  if (key.includes("payment")) return "payment";
  if (key.includes("booking") || key.includes("job")) return "booking";
  if (key.includes("message") || key.includes("support")) return "message";
  return "system";
}

export async function GET() {
  const auth = await requireRole(["CLIENT"]);
  if (!auth.ok) return auth.response!;

  const [bookings, events, threads] = await Promise.all([
    BookingsRepo.listByCustomer(auth.profile.id),
    listNotificationEvents(400),
    ChatThreadsRepo.listByCustomer(auth.profile.id),
  ]);

  const bookingIds = new Set(bookings.map((booking) => booking.id));

  const bookingNotifications: AppNotification[] = bookings.map((booking) => {
    const mapped = mapBookingStatus(booking.status);
    return {
      id: `booking_${booking.id}`,
      type: mapped.type,
      title: mapped.title,
      body: `${booking.serviceNameSnapshot} • ${booking.ref}`,
      createdAtIso: booking.updatedAtIso || booking.slotIso,
      read: false,
      bookingId: booking.id,
      bookingRef: booking.ref,
    };
  });

  const eventNotifications: AppNotification[] = events
    .filter(
      (event) =>
        event.actorProfileId === auth.profile.id ||
        event.customerPhone === auth.profile.phone ||
        event.target === auth.profile.phone ||
        (event.bookingId ? bookingIds.has(event.bookingId) : false)
    )
    .map((event) => ({
      id: `event_${event.id}`,
      type: mapEventType(event.eventType),
      title: event.eventType.replace(/[._]/g, " "),
      body: event.message,
      createdAtIso: event.createdAtIso,
      read: false,
      bookingId: event.bookingId,
      bookingRef: event.bookingRef,
    }));

  const chatNotifications: AppNotification[] = threads
    .flatMap((thread) => thread.messages || [])
    .filter((message) => message.role === "ASSISTANT")
    .map((message) => ({
      id: `chat_${message.id}`,
      type: "message",
      title: "Support reply",
      body: message.text,
      createdAtIso: message.atIso,
      read: false,
    }));

  const merged = [...eventNotifications, ...bookingNotifications, ...chatNotifications]
    .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso))
    .slice(0, 100);

  return ok({ notifications: merged });
}
