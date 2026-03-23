import type { ChannelSender, SendResult } from "./types";

function formatPhoneForWaMe(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

export const whatsappSender: ChannelSender = {
  async send({ recipientPhone, body }): Promise<SendResult> {
    if (!recipientPhone) {
      return { success: false, error: "No recipient phone number" };
    }
    const waNumber = formatPhoneForWaMe(recipientPhone);
    const deepLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(body)}`;

    console.log(`[WhatsApp STUB] To: ${recipientPhone}`);
    console.log(`[WhatsApp STUB] Body: ${body.slice(0, 120)}...`);
    console.log(`[WhatsApp STUB] Link: ${deepLink}`);

    return {
      success: true,
      metadata: { deepLink, stub: true },
    };
  },
};
