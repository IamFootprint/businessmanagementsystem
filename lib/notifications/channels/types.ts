export type SendResult = {
  success: boolean;
  error?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
};

export interface ChannelSender {
  send(params: {
    recipientPhone?: string;
    recipientEmail?: string;
    subject?: string;
    body: string;
  }): Promise<SendResult>;
}
