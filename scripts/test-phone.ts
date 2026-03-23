import assert from "node:assert/strict";
import { isAllowedPhone, maskPhone, normalizePhone, shouldRequireE164, validateE164 } from "../lib/auth/phone";

process.env.STATIC_OTP_REQUIRE_E164 = "true";
process.env.STATIC_OTP_ALLOWED_COUNTRIES = "ZA";
process.env.STATIC_OTP_ALLOWED_PHONE_PREFIXES = "";

const normalized = normalizePhone(" +27 82-123-4567 ");
assert.equal(normalized, "+27821234567");
assert.equal(validateE164(normalized), true);
assert.equal(shouldRequireE164(), true);
assert.equal(isAllowedPhone(normalized), true);

const nonZa = "+12025550123";
assert.equal(validateE164(nonZa), true);
assert.equal(isAllowedPhone(nonZa), false);

process.env.STATIC_OTP_ALLOWED_PHONE_PREFIXES = "+27,+44";
assert.equal(isAllowedPhone("+447911123456"), true);

const masked = maskPhone(normalized);
assert.match(masked, /^\+27\*{6}\d{3}$/);

console.log("phone tests: OK");
