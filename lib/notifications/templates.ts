import type { NotificationEventType, NotificationChannel, TemplateVars, RenderedMessage } from "./types";

type TemplateMap = Record<NotificationEventType, Partial<Record<NotificationChannel, (vars: TemplateVars) => RenderedMessage>>>;

const STOP_FOOTER = "\n\nReply STOP to opt out.";

function emailFooter(vars: TemplateVars): string {
  if (vars.unsubscribeUrl) {
    return `\n\n---\nTo unsubscribe from email notifications: ${vars.unsubscribeUrl}`;
  }
  return "";
}

const templates: TemplateMap = {
  BOOKING_CONFIRMED: {
    WHATSAPP: (v) => ({
      body: `Hi ${v.customerName}, your booking ${v.bookingRef || ""} is confirmed for ${v.date || "your selected date"} at ${v.time || "your selected time"}. We'll send you a reminder the day before. — ${v.shopName}${STOP_FOOTER}`,
    }),
    EMAIL: (v) => ({
      subject: `Booking ${v.bookingRef || ""} confirmed — ${v.shopName}`,
      body: `Hi ${v.customerName},\n\nYour booking ${v.bookingRef || ""} has been confirmed for ${v.date || "your selected date"} at ${v.time || "your selected time"}.\n\nWe'll send you a reminder the day before your appointment.\n\nThanks,\n${v.shopName}${emailFooter(v)}`,
    }),
  },
  BOOKING_CREATED_SHOP_OWNER: {
    WHATSAPP: (v) => ({
      body: `New booking from ${v.customerName} for ${v.serviceName || "a service"} on ${v.date || "TBC"} at ${v.time || "TBC"}.${v.address ? ` ${v.address}.` : ""} Ref: ${v.bookingRef || "N/A"} — ${v.shopName}`,
    }),
    EMAIL: (v) => ({
      subject: `New Booking: ${v.customerName} — ${v.serviceName || "a service"} on ${v.date || "TBC"}`,
      body: `Hi,\n\nNew booking received:\n\nCustomer: ${v.customerName}\nService: ${v.serviceName || "a service"}\nDate: ${v.date || "TBC"} at ${v.time || "TBC"}\nAddress: ${v.address || "N/A"}\nRef: ${v.bookingRef || "N/A"}\n\nView in CycleDesk to manage this booking.\n\n— CycleDesk`,
    }),
  },
  BOOKING_REMINDER: {
    WHATSAPP: (v) => ({
      body: `Reminder: Your booking ${v.bookingRef || ""} is tomorrow${v.time ? ` at ${v.time}` : ""}. See you then! — ${v.shopName}${STOP_FOOTER}`,
    }),
  },
  MECHANIC_EN_ROUTE: {
    WHATSAPP: (v) => ({
      body: `${v.mechanicName || "Your mechanic"} is on the way to you for booking ${v.bookingRef || ""}. — ${v.shopName}${STOP_FOOTER}`,
    }),
  },
  MECHANIC_ARRIVED: {
    WHATSAPP: (v) => ({
      body: `${v.mechanicName || "Your mechanic"} has arrived for booking ${v.bookingRef || ""}. — ${v.shopName}${STOP_FOOTER}`,
    }),
  },
  JOB_COMPLETE: {
    WHATSAPP: (v) => ({
      body: `Good news! Your service for booking ${v.bookingRef || ""} is complete.${v.invoiceRef ? ` Invoice ${v.invoiceRef} has been issued.` : ""} — ${v.shopName}${STOP_FOOTER}`,
    }),
    EMAIL: (v) => ({
      subject: `Service complete — ${v.bookingRef || ""} — ${v.shopName}`,
      body: `Hi ${v.customerName},\n\nYour service for booking ${v.bookingRef || ""} has been completed.${v.invoiceRef ? `\n\nInvoice ${v.invoiceRef} has been issued.` : ""}\n\nThanks for choosing ${v.shopName}!${emailFooter(v)}`,
    }),
  },
  INVOICE_ISSUED: {
    EMAIL: (v) => ({
      subject: `Invoice ${v.invoiceRef || ""} — ${v.shopName}`,
      body: `Hi ${v.customerName},\n\nInvoice ${v.invoiceRef || ""} has been issued for booking ${v.bookingRef || ""}.${v.amount ? ` Total: ${v.amount}.` : ""}\n\nThanks,\n${v.shopName}${emailFooter(v)}`,
    }),
  },
  BOOKING_CANCELLED: {
    WHATSAPP: (v) => ({
      body: `Your booking ${v.bookingRef || ""} has been cancelled. Contact us if you'd like to rebook. — ${v.shopName}${STOP_FOOTER}`,
    }),
    EMAIL: (v) => ({
      subject: `Booking ${v.bookingRef || ""} cancelled — ${v.shopName}`,
      body: `Hi ${v.customerName},\n\nYour booking ${v.bookingRef || ""} has been cancelled.\n\nIf this was a mistake or you'd like to rebook, please contact us.\n\nThanks,\n${v.shopName}${emailFooter(v)}`,
    }),
  },
  BOOKING_RESCHEDULED: {
    WHATSAPP: (v) => ({
      body: `Your booking ${v.bookingRef || ""} has been rescheduled to ${v.date || "a new date"}${v.time ? ` at ${v.time}` : ""}. — ${v.shopName}${STOP_FOOTER}`,
    }),
  },
  ADDITIONAL_CHARGE_REQUESTED: {
    WHATSAPP: (v) => ({
      body: `Your mechanic has proposed an additional charge for booking ${v.bookingRef || ""}${v.chargeDescription ? `: ${v.chargeDescription}` : ""}${v.chargeAmount ? ` (${v.chargeAmount})` : ""}. Please approve or reject. — ${v.shopName}${STOP_FOOTER}`,
    }),
  },
  PAYMENT_RECEIVED: {
    WHATSAPP: (v) => ({
      body: `Payment received${v.amount ? ` of ${v.amount}` : ""} for booking ${v.bookingRef || ""}. Thank you! — ${v.shopName}${STOP_FOOTER}`,
    }),
    EMAIL: (v) => ({
      subject: `Payment received — ${v.bookingRef || ""} — ${v.shopName}`,
      body: `Hi ${v.customerName},\n\nWe've received your payment${v.amount ? ` of ${v.amount}` : ""} for booking ${v.bookingRef || ""}.\n\nThanks,\n${v.shopName}${emailFooter(v)}`,
    }),
  },
};

export function renderTemplate(
  eventType: NotificationEventType,
  channel: NotificationChannel,
  vars: TemplateVars
): RenderedMessage | null {
  const channelTemplates = templates[eventType];
  if (!channelTemplates) return null;
  const fn = channelTemplates[channel];
  if (!fn) return null;
  return fn(vars);
}
