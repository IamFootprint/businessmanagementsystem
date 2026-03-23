import type { ChannelSender, SendResult } from "./types";

export const emailSender: ChannelSender = {
  async send({ recipientEmail, subject, body }): Promise<SendResult> {
    if (!recipientEmail) {
      return { success: false, error: "No recipient email address" };
    }

    const apiKey = process.env.RESEND_API_KEY;

    // If no Resend API key, fall back to stub (log to console)
    if (!apiKey) {
      console.log(`[Email STUB] To: ${recipientEmail}`);
      console.log(`[Email STUB] Subject: ${subject || "(no subject)"}`);
      console.log(`[Email STUB] Body: ${body.slice(0, 120)}...`);

      return {
        success: true,
        metadata: { stub: true },
      };
    }

    const from =
      process.env.EMAIL_FROM || "CycleDesk <notifications@cycledesk.co.za>";

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: recipientEmail,
          subject: subject || "(no subject)",
          text: body,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        console.error(
          `[Email] Resend API error ${res.status}: ${errorBody}`,
        );
        return {
          success: false,
          error: `Resend API error ${res.status}: ${errorBody}`,
        };
      }

      const data = (await res.json()) as { id?: string };
      return {
        success: true,
        externalId: data.id,
        metadata: { provider: "resend" },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Email] Failed to send via Resend: ${message}`);
      return {
        success: false,
        error: `Resend send failed: ${message}`,
      };
    }
  },
};
