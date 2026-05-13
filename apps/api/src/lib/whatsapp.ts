export async function sendTextMessage(to: string, body: string): Promise<{ success: boolean }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const apiVersion = process.env.WHATSAPP_API_VERSION ?? 'v19.0'

  if (!phoneNumberId || !accessToken) {
    console.warn('[whatsapp] WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not set — skipping send')
    return { success: false }
  }

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body },
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const error = await res.text()
      console.error(`[whatsapp] Send failed: ${res.status} ${error}`)
      return { success: false }
    }

    return { success: true }
  } catch (err) {
    console.error('[whatsapp] Network error:', err)
    return { success: false }
  }
}
