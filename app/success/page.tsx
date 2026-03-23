import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { apiFetch } from "@/lib/api";
import PublicHeroBanner from "@/app/components/PublicHeroBanner";
import Stepper from "../book/components/Stepper";
import TrackedLink from "@/app/components/TrackedLink";
import EmbedSuccessNotifier from "./EmbedSuccessNotifier";
export const dynamic = "force-dynamic";

type Shop = {
  name: string;
  whatsapp?: string | null;
};

type Booking = {
  referenceCode: string;
  itemName?: string | null;
  itemType?: string | null;
  addressText: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  timeZone: string;
};

function normalizeWhatsApp(phone?: string | null) {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

function formatSlot(iso: string, timeZone: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone
  }).format(date);
}

export default async function SuccessPage({
  searchParams
}: {
  searchParams: { ref?: string };
}) {
  const reference = searchParams.ref || "";
  let shop: Shop = { name: "ServiceMyBike" };
  let booking: Booking | null = null;
  try {
    shop = await apiFetch<Shop>("/api/public/shop");
  } catch {
    // Use default shop name
  }
  if (reference) {
    try {
      booking = await apiFetch<Booking>(`/api/public/bookings/${reference}`);
    } catch {
      // Booking details unavailable — show fallback
    }
  }

  const whatsappNumber = normalizeWhatsApp(shop.whatsapp);
  const message = booking
    ? `Hi, I just booked ${booking.itemName || "a service"}. Booking ref: ${booking.referenceCode}. Address: ${booking.addressText}. Slot: ${formatSlot(
        booking.scheduledStartAt,
        booking.timeZone
      )} (${booking.timeZone}).`
    : "Hi, I just made a booking.";
  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
    : "";

  return (
    <Container>
      <Suspense>
        <EmbedSuccessNotifier />
      </Suspense>
      <PublicHeroBanner
        eyebrow="Booking Complete"
        title="Your service request is in"
        description="We'll follow up with final confirmation and next steps."
      />
      <Stepper
        current={4}
        steps={["Select service", "Your details", "Choose slot", "Review", "Confirmation"]}
      />
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="font-display font-bold text-foreground text-lg mb-1">Booking confirmed</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Thanks for booking with {shop.name}. We will review your details and confirm the final
          slot shortly.
        </p>
        {booking ? (
          <div className="space-y-2 text-sm mb-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-semibold text-foreground">{booking.referenceCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service</span>
              <span className="font-medium text-foreground">{booking.itemName || "Service"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address</span>
              <span className="font-medium text-foreground">{booking.addressText}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slot</span>
              <span className="font-medium text-foreground">
                {formatSlot(booking.scheduledStartAt, booking.timeZone)} ({booking.timeZone})
              </span>
            </div>
            <p className="text-muted-foreground pt-2">
              What happens next: we will confirm your slot, finalize any extras, and reach out on
              WhatsApp or phone.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-4">We are processing your booking.</p>
        )}
        {whatsappLink ? (
          <TrackedLink
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            eventName="whatsapp_click"
            eventParams={{ location: "booking_success" }}
          >
            <Button>Message us on WhatsApp</Button>
          </TrackedLink>
        ) : null}
        <div className="mt-4">
          <a href="/book/start" className="text-sm text-primary hover:underline font-medium">
            Back to booking start
          </a>
        </div>
      </div>
    </Container>
  );
}
