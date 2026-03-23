import { timingSafeEqual } from "crypto";

function digitsOnly(input: string) {
  return input.replace(/\D/g, "");
}

export function normalizeOtp(input: string) {
  return digitsOnly(input).slice(0, 6);
}

export function getDeterministicDevOtp(phone: string) {
  const digits = digitsOnly(phone);
  const suffix = digits.slice(-3).padStart(3, "0");
  return `246${suffix}`;
}

export function matchesDeterministicDevOtp(phone: string, submittedOtp: string) {
  const expected = getDeterministicDevOtp(phone);
  const submitted = normalizeOtp(submittedOtp);
  if (expected.length !== submitted.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(submitted));
}
