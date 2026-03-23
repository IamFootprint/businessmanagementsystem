import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ZodError } from "zod";

type Meta = Record<string, unknown> | undefined;
type Fields = Record<string, string> | undefined;

type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta?: Meta;
};

type ApiErrorBody = {
  ok: false;
  error: {
    code: string;
    message: string;
    hint?: string;
    fields?: Fields;
    requestId?: string;
  };
};

function buildRequestId() {
  try {
    const requestId = headers().get("x-request-id");
    if (requestId) return requestId;
  } catch {
    // Some test contexts may not have request-scoped headers.
  }
  return `req_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

function success<T>(status: number, data: T, meta?: Meta) {
  const body: ApiSuccess<T> = meta ? { ok: true, data, meta } : { ok: true, data };
  return NextResponse.json(body, { status });
}

function failure(
  status: number,
  code: string,
  message: string,
  hint?: string,
  fields?: Fields,
  requestId?: string
) {
  const body: ApiErrorBody = {
    ok: false,
    error: {
      code,
      message,
      hint,
      fields,
      requestId
    }
  };
  return NextResponse.json(body, { status });
}

export function ok<T>(data: T, meta?: Meta) {
  return success(200, data, meta);
}

export function created<T>(data: T, meta?: Meta) {
  return success(201, data, meta);
}

export function badRequest(code: string, message: string, hint?: string, fields?: Fields) {
  return failure(400, code, message, hint, fields);
}

export function unauthorized(code: string, message: string, hint?: string) {
  return failure(401, code, message, hint);
}

export function forbidden(code: string, message: string, hint?: string) {
  return failure(403, code, message, hint);
}

export function notFound(code: string, message: string, hint?: string) {
  return failure(404, code, message, hint);
}

export function conflict(code: string, message: string, hint?: string, fields?: Fields) {
  return failure(409, code, message, hint, fields);
}

export function tooManyRequests(
  code: string,
  message: string,
  retryAfterSeconds?: number,
  hint?: string
) {
  const response = failure(429, code, message, hint);
  if (retryAfterSeconds) {
    response.headers.set("Retry-After", String(retryAfterSeconds));
  }
  return response;
}

export function serviceUnavailable(message = 'Service temporarily unavailable') {
  return failure(503, 'SERVICE_UNAVAILABLE', message)
}

export function serverError(code: string, message: string, hint?: string, error?: unknown) {
  const requestId = buildRequestId();
  console.error(`[api:${requestId}] ${code}: ${message}`, error);
  return failure(500, code, message, hint, undefined, requestId);
}

export function zodFieldErrors(error: ZodError) {
  const fields: Record<string, string> = {};
  const flattened = error.flatten().fieldErrors;
  for (const [key, messages] of Object.entries(flattened)) {
    if (messages && messages.length > 0) {
      fields[key] = messages[0] || "Invalid value.";
    }
  }
  return fields;
}

export function badRequestFromZod(
  code: string,
  message: string,
  error: ZodError,
  hint?: string
) {
  return badRequest(code, message, hint, zodFieldErrors(error));
}

export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error) {
      return serverError(
        "INTERNAL_SERVER_ERROR",
        "Something went wrong while processing this request.",
        "Try again. If the problem continues, contact support with the error details.",
        error
      );
    }
  };
}
