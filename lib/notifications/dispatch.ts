import type { NotificationEventType, NotificationChannel, TemplateVars } from "./types";
import { EVENT_CHANNELS } from "./types";
import { renderTemplate } from "./templates";
import {
  logNotificationEvent,
  getNotificationByIdempotencyKey,
} from "@/src/lib/workshop/notifications";
import { BookingsRepo, ProfilesRepo, ShopRepo, JobCardsRepo, InvoicesRepo } from "@/src/lib/store";
import { buildUnsubscribeUrl } from "./unsubscribe";

type DispatchContext = {
  bookingId?: string;
  jobCardId?: string;
  invoiceId?: string;
  recipientProfileId?: string;
  actorProfileId?: string;
  idempotencyDateSuffix?: string;
  extraVars?: Partial<TemplateVars>;
};

function buildIdempotencyKey(
  eventType: NotificationEventType,
  entityId: string,
  channel: NotificationChannel,
  dateSuffix?: string
): string {
  const parts = [eventType, entityId, channel];
  if (dateSuffix) parts.push(dateSuffix);
  return parts.join(":");
}

function formatDateSAST(isoString: string): { date: string; time: string } {
  const d = new Date(isoString);
  const formatter = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { date: formatter.format(d), time: timeFormatter.format(d) };
}

function formatCentsZAR(cents: number): string {
  return `R${(cents / 100).toFixed(2)}`;
}

export async function dispatchNotification(
  eventType: NotificationEventType,
  context: DispatchContext
): Promise<void> {
  try {
    const booking = context.bookingId
      ? await BookingsRepo.get(context.bookingId)
      : null;

    let recipientProfile = context.recipientProfileId
      ? await ProfilesRepo.getById(context.recipientProfileId)
      : null;
    if (!recipientProfile && booking?.customerProfileId) {
      recipientProfile = await ProfilesRepo.getById(booking.customerProfileId);
    }
    if (!recipientProfile && booking?.customerPhone) {
      recipientProfile = await ProfilesRepo.getByPhone(booking.customerPhone);
    }

    const recipientPhone = recipientProfile?.phone || booking?.customerPhone || "";
    const recipientEmail = recipientProfile?.email || undefined;
    const customerName = recipientProfile?.name || booking?.customerName || "Customer";

    if (!recipientPhone && !recipientEmail) {
      console.warn(`[Notification] No recipient for ${eventType}, skipping.`);
      return;
    }

    const shopId = booking?.shopId || recipientProfile?.shopId;
    const shop = shopId ? await ShopRepo.getById(shopId) : null;
    const shopName = shop?.name || "CycleDesk";

    const jobCard = context.jobCardId
      ? await JobCardsRepo.get(context.jobCardId)
      : null;
    const invoice = context.invoiceId
      ? await InvoicesRepo.get(context.invoiceId)
      : null;

    const slotFormatted = booking?.slotIso ? formatDateSAST(booking.slotIso) : undefined;
    const unsubscribeUrl = recipientProfile?.id
      ? buildUnsubscribeUrl(recipientProfile.id, "EMAIL")
      : undefined;
    const vars: TemplateVars = {
      customerName,
      profileId: recipientProfile?.id,
      bookingRef: booking?.ref || jobCard?.bookingRef,
      shopName,
      date: slotFormatted?.date,
      time: slotFormatted?.time,
      mechanicName: context.extraVars?.mechanicName,
      amount: invoice?.totalCents ? formatCentsZAR(invoice.totalCents) : context.extraVars?.amount,
      invoiceRef: invoice?.ref || context.extraVars?.invoiceRef,
      chargeDescription: context.extraVars?.chargeDescription,
      chargeAmount: context.extraVars?.chargeAmount,
      unsubscribeUrl,
      ...context.extraVars,
    };

    const prefs = recipientProfile?.notificationPreferences;
    const entityId = context.bookingId || context.jobCardId || context.invoiceId || recipientPhone;

    const channels = EVENT_CHANNELS[eventType] || [];
    for (const channel of channels) {
      if (channel === "WHATSAPP" && prefs?.whatsappOptOut) {
        await logNotificationEvent({
          eventType,
          channel,
          status: "OPTED_OUT",
          recipientPhone,
          recipientEmail,
          target: customerName,
          actorProfileId: context.actorProfileId,
          message: `Opted out of ${channel}`,
          bookingId: booking?.id,
          bookingRef: booking?.ref,
          jobCardId: jobCard?.id,
          jobCardRef: jobCard?.ref,
          invoiceId: invoice?.id,
          attempts: 0,
          idempotencyKey: buildIdempotencyKey(eventType, entityId, channel),
        });
        continue;
      }
      if (channel === "EMAIL" && (prefs?.emailOptOut || !recipientEmail)) {
        if (prefs?.emailOptOut) {
          await logNotificationEvent({
            eventType,
            channel,
            status: "OPTED_OUT",
            recipientPhone,
            recipientEmail,
            target: customerName,
            actorProfileId: context.actorProfileId,
            message: `Opted out of ${channel}`,
            bookingId: booking?.id,
            bookingRef: booking?.ref,
            jobCardId: jobCard?.id,
            jobCardRef: jobCard?.ref,
            invoiceId: invoice?.id,
            attempts: 0,
            idempotencyKey: buildIdempotencyKey(eventType, entityId, channel),
          });
        }
        continue;
      }

      const idempotencyKey = buildIdempotencyKey(eventType, entityId, channel, context.idempotencyDateSuffix);
      const existing = await getNotificationByIdempotencyKey(idempotencyKey);
      if (existing && existing.status === "SENT") continue;

      const rendered = renderTemplate(eventType, channel, vars);
      if (!rendered) continue;

      await logNotificationEvent({
        eventType,
        channel,
        status: "QUEUED",
        recipientPhone,
        recipientEmail,
        target: customerName,
        actorProfileId: context.actorProfileId,
        subject: rendered.subject,
        message: rendered.body,
        bookingId: booking?.id,
        bookingRef: booking?.ref,
        jobCardId: jobCard?.id,
        jobCardRef: jobCard?.ref,
        invoiceId: invoice?.id,
        attempts: 0,
        idempotencyKey,
      });
    }
  } catch (err) {
    console.error(`[Notification] Failed to dispatch ${eventType}:`, err);
  }
}
