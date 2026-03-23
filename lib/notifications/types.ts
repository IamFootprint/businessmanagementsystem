export type NotificationEventType =
  | "BOOKING_CONFIRMED"
  | "BOOKING_CREATED_SHOP_OWNER"
  | "BOOKING_REMINDER"
  | "MECHANIC_EN_ROUTE"
  | "MECHANIC_ARRIVED"
  | "JOB_COMPLETE"
  | "INVOICE_ISSUED"
  | "BOOKING_CANCELLED"
  | "BOOKING_RESCHEDULED"
  | "ADDITIONAL_CHARGE_REQUESTED"
  | "PAYMENT_RECEIVED";

export type NotificationChannel = "WHATSAPP" | "EMAIL" | "SYSTEM";

export type NotificationStatus = "QUEUED" | "SENT" | "FAILED" | "OPTED_OUT";

export type TemplateVars = {
  customerName: string;
  profileId?: string;
  bookingRef?: string;
  shopName: string;
  date?: string;
  time?: string;
  mechanicName?: string;
  amount?: string;
  invoiceRef?: string;
  chargeDescription?: string;
  chargeAmount?: string;
  unsubscribeUrl?: string;
  serviceName?: string;
  address?: string;
};

export type RenderedMessage = {
  subject?: string;
  body: string;
};

export type NotificationPreferences = {
  whatsappOptOut: boolean;
  emailOptOut: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  updatedAtIso: string;
};

/** Which channels each event type should be dispatched to */
export const EVENT_CHANNELS: Record<NotificationEventType, NotificationChannel[]> = {
  BOOKING_CONFIRMED: ["WHATSAPP", "EMAIL"],
  BOOKING_CREATED_SHOP_OWNER: ["WHATSAPP", "EMAIL"],
  BOOKING_REMINDER: ["WHATSAPP"],
  MECHANIC_EN_ROUTE: ["WHATSAPP"],
  MECHANIC_ARRIVED: ["WHATSAPP"],
  JOB_COMPLETE: ["WHATSAPP", "EMAIL"],
  INVOICE_ISSUED: ["EMAIL"],
  BOOKING_CANCELLED: ["WHATSAPP", "EMAIL"],
  BOOKING_RESCHEDULED: ["WHATSAPP"],
  ADDITIONAL_CHARGE_REQUESTED: ["WHATSAPP"],
  PAYMENT_RECEIVED: ["WHATSAPP", "EMAIL"],
};
