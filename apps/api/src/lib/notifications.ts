import { sendTextMessage } from './whatsapp'

export async function sendImportCompleteNotification(
  to: string,
  data: { rowCount: number; duplicateCount: number }
): Promise<{ success: boolean }> {
  const body =
    `✅ Import complete: ${data.rowCount} transactions imported` +
    ` (${data.duplicateCount} duplicates skipped).` +
    ` Review pending transactions at your BMS dashboard.`
  return sendTextMessage(to, body)
}

export async function sendCloseReminderNotification(
  to: string,
  data: { businessName: string; month: string; year: number }
): Promise<{ success: boolean }> {
  const body =
    `⏰ Month-close reminder: ${data.month} ${data.year} period` +
    ` for ${data.businessName} is still open.` +
    ` Please review and lock it before end of month.`
  return sendTextMessage(to, body)
}

export async function sendStaleReceiptNotification(
  to: string,
  data: { count: number }
): Promise<{ success: boolean }> {
  const body =
    `⚠️ ${data.count} receipt(s) have been unmatched for 90+ days.` +
    ` Please review them in the BMS receipt inbox.`
  return sendTextMessage(to, body)
}
