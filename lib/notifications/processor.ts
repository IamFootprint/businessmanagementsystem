import {
  listQueuedEvents,
  updateNotificationEvent,
} from "@/src/lib/workshop/notifications";
import { ProfilesRepo, BookingsRepo } from "@/src/lib/store";
import { whatsappSender } from "./channels/whatsapp";
import { emailSender } from "./channels/email";
import { dispatchNotification } from "./dispatch";
import type { NotificationChannel } from "./types";

const MAX_ATTEMPTS = 3;

function isInQuietHours(profile: { notificationPreferences?: { quietHoursStart?: string; quietHoursEnd?: string } } | null): boolean {
  if (!profile?.notificationPreferences?.quietHoursStart || !profile?.notificationPreferences?.quietHoursEnd) {
    return false;
  }
  const now = new Date();
  const sast = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  const [hh, mm] = sast.split(":").map(Number);
  const currentMinutes = hh * 60 + mm;

  const [startH, startM] = profile.notificationPreferences.quietHoursStart.split(":").map(Number);
  const startMinutes = startH * 60 + startM;

  const [endH, endM] = profile.notificationPreferences.quietHoursEnd.split(":").map(Number);
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

function getSender(channel: NotificationChannel | string) {
  switch (channel) {
    case "WHATSAPP":
      return whatsappSender;
    case "EMAIL":
      return emailSender;
    default:
      return null;
  }
}

export async function processNotificationQueue(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  remindersQueued: number;
}> {
  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  const remindersQueued = await queueBookingReminders();

  const queued = await listQueuedEvents(50);

  for (const event of queued) {
    processed++;

    const profile = event.recipientPhone
      ? await ProfilesRepo.getByPhone(event.recipientPhone)
      : null;
    if (isInQuietHours(profile)) {
      skipped++;
      continue;
    }

    const sender = getSender(event.channel);
    if (!sender) {
      await updateNotificationEvent(event.id, {
        status: "SENT",
        sentAtIso: new Date().toISOString(),
      });
      sent++;
      continue;
    }

    const result = await sender.send({
      recipientPhone: event.recipientPhone,
      recipientEmail: event.recipientEmail,
      subject: event.subject,
      body: event.message,
    });

    if (result.success) {
      await updateNotificationEvent(event.id, {
        status: "SENT",
        sentAtIso: new Date().toISOString(),
      });
      sent++;
    } else {
      const newAttempts = event.attempts + 1;
      await updateNotificationEvent(event.id, {
        attempts: newAttempts,
        lastError: result.error || "Send failed",
        status: newAttempts >= MAX_ATTEMPTS ? "FAILED" : "QUEUED",
      });
      if (newAttempts >= MAX_ATTEMPTS) failed++;
    }
  }

  return { processed, sent, failed, skipped, remindersQueued };
}

async function queueBookingReminders(): Promise<number> {
  let count = 0;
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Africa/Johannesburg",
    }).format(tomorrow);

    const allBookings = await BookingsRepo.list();
    const confirmedForTomorrow = allBookings.filter((b) => {
      if (b.status !== "CONFIRMED" || !b.slotIso) return false;
      const bookingDate = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Africa/Johannesburg",
      }).format(new Date(b.slotIso));
      return bookingDate === tomorrowDate;
    });

    for (const booking of confirmedForTomorrow) {
      await dispatchNotification("BOOKING_REMINDER", {
        bookingId: booking.id,
        idempotencyDateSuffix: tomorrowDate,
      });
      count++;
    }
  } catch (err) {
    console.error("[Processor] Failed to queue booking reminders:", err);
  }
  return count;
}
