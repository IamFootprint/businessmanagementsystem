const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown }

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: isFormData
      ? { ...(headers as Record<string, string>) }
      : { 'Content-Type': 'application/json', ...(headers as Record<string, string>) },
    body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error((error as { message?: string }).message ?? res.statusText)
  }

  return res.json() as Promise<T>
}
