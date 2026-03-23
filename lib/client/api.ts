"use client";

export type ApiErrorShape = {
  code: string;
  message: string;
  hint?: string;
  fields?: Record<string, string>;
  requestId?: string;
};

export class ApiClientError extends Error {
  status: number;
  code: string;
  hint?: string;
  fields?: Record<string, string>;
  requestId?: string;
  retryAfterSeconds?: number;

  constructor(status: number, error: ApiErrorShape, retryAfterSeconds?: number) {
    super(error.message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = error.code;
    this.hint = error.hint;
    this.fields = error.fields;
    this.requestId = error.requestId;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function isApiClientError(value: unknown): value is ApiClientError {
  return value instanceof ApiClientError;
}

export async function readApiResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (response.ok) {
    if (payload?.ok === true) {
      return payload.data as T;
    }
    return payload as T;
  }

  const retryAfterHeader = response.headers.get("Retry-After");
  const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
  const error = payload?.error
    ? (payload.error as ApiErrorShape)
    : {
        code: "REQUEST_FAILED",
        message: "We could not complete your request.",
        hint: "Try again."
      };
  throw new ApiClientError(response.status, error, Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined);
}

export async function apiFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  return readApiResponse<T>(response);
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function getErrorHint(error: unknown, fallback?: string) {
  if (isApiClientError(error)) return error.hint || fallback;
  return fallback;
}
