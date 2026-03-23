import { describe, it, expect, vi } from "vitest";
import {
  ok,
  created,
  badRequest,
  notFound,
  unauthorized,
  forbidden,
  conflict,
  serverError,
  tooManyRequests,
  zodFieldErrors,
  badRequestFromZod,
  withErrorHandling,
} from "./responses";
import { ZodError, ZodIssueCode } from "zod";
import { NextRequest } from "next/server";

describe("ok", () => {
  it("returns status 200 with ok=true and data", async () => {
    const response = ok({ hello: "world" });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data).toEqual({ hello: "world" });
  });

  it("includes meta when provided", async () => {
    const response = ok({ id: "1" }, { page: 1 });
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.meta).toEqual({ page: 1 });
  });
});

describe("created", () => {
  it("returns status 201 with ok=true and data", async () => {
    const response = created({ id: "1" });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data).toEqual({ id: "1" });
  });
});

describe("badRequest", () => {
  it("returns status 400 with error details", async () => {
    const response = badRequest("CODE", "msg");
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("CODE");
    expect(body.error.message).toBe("msg");
  });
});

describe("notFound", () => {
  it("returns status 404", async () => {
    const response = notFound("NF", "not found");
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("NF");
    expect(body.error.message).toBe("not found");
  });
});

describe("unauthorized", () => {
  it("returns status 401", async () => {
    const response = unauthorized("UNAUTH", "no");
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTH");
  });
});

describe("forbidden", () => {
  it("returns status 403", async () => {
    const response = forbidden("FORBIDDEN", "no");
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});

describe("conflict", () => {
  it("returns status 409", async () => {
    const response = conflict("DUP", "dup");
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("DUP");
  });
});

describe("serverError", () => {
  it("returns status 500 with a requestId starting with req_", async () => {
    // Suppress console.error output during this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = serverError("ERR", "msg");
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("ERR");
    expect(body.error.message).toBe("msg");
    expect(body.error.requestId).toMatch(/^req_/);
    consoleSpy.mockRestore();
  });
});

describe("tooManyRequests", () => {
  it("returns status 429 with Retry-After header", async () => {
    const response = tooManyRequests("RATE", "slow", 60);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("RATE");
    expect(body.error.message).toBe("slow");
  });

  it("omits Retry-After header when retryAfterSeconds is not provided", () => {
    const response = tooManyRequests("RATE", "slow");
    expect(response.headers.get("Retry-After")).toBeNull();
  });
});

describe("zodFieldErrors", () => {
  it("extracts field-level error messages from a ZodError", () => {
    const error = new ZodError([
      {
        code: ZodIssueCode.too_small,
        minimum: 1,
        type: "string",
        inclusive: true,
        message: "Name is required",
        path: ["name"],
      },
      {
        code: ZodIssueCode.invalid_type,
        expected: "string",
        received: "number",
        message: "Email must be a string",
        path: ["email"],
      },
    ]);
    const fields = zodFieldErrors(error);
    expect(fields.name).toBe("Name is required");
    expect(fields.email).toBe("Email must be a string");
  });
});

describe("badRequestFromZod", () => {
  it("returns 400 with field errors from ZodError", async () => {
    const error = new ZodError([
      {
        code: ZodIssueCode.too_small,
        minimum: 1,
        type: "string",
        inclusive: true,
        message: "Required",
        path: ["phone"],
      },
    ]);
    const response = badRequestFromZod("VALIDATION", "Validation failed", error);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("VALIDATION");
    expect(body.error.fields?.phone).toBe("Required");
  });
});

describe("withErrorHandling", () => {
  it("returns the handler result when no error is thrown", async () => {
    const handler = vi.fn(async () => ok({ success: true }));
    const wrapped = withErrorHandling(handler);
    const response = await wrapped();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
  });

  it("catches thrown errors and returns a 500 response", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = vi.fn(async () => {
      throw new Error("boom");
    });
    const wrapped = withErrorHandling(handler);
    const response = await wrapped();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(body.error.requestId).toMatch(/^req_/);
    consoleSpy.mockRestore();
  });
});
