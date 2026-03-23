"use client";

import { useEffect, useMemo, useState } from "react";
import { validateE164 } from "@/lib/auth/phone";
import { Label } from "@/components/ui/label";

type CountryOption = {
  code: string;
  flag: string;
  label: string;
  dial: string;
  maxDigits: number;
  format: (value: string) => string;
  normalize: (value: string) => string;
};

function formatGrouped(value: string) {
  const chunks = value.match(/.{1,3}/g) || [];
  return chunks.join(" ");
}

function buildGenericCountry(
  code: string,
  flag: string,
  label: string,
  dial: string,
  maxDigits = 12,
): CountryOption {
  return {
    code,
    flag,
    label,
    dial,
    maxDigits,
    format: (value) => formatGrouped(value.replace(/\D/g, "").slice(0, maxDigits)),
    normalize: (value) => value.replace(/\D/g, "").slice(0, maxDigits),
  };
}

const COUNTRIES: CountryOption[] = [
  {
    code: "ZA",
    flag: "\u{1F1FF}\u{1F1E6}",
    label: "South Africa",
    dial: "+27",
    maxDigits: 9,
    format: (value) => {
      const digits = value.replace(/\D/g, "").slice(0, 9);
      const part1 = digits.slice(0, 2);
      const part2 = digits.slice(2, 5);
      const part3 = digits.slice(5, 9);
      return [part1, part2, part3].filter(Boolean).join(" ");
    },
    normalize: (value) => {
      let digits = value.replace(/\D/g, "");
      if (digits.startsWith("0")) digits = digits.slice(1);
      return digits.slice(0, 9);
    },
  },
  buildGenericCountry("US", "\u{1F1FA}\u{1F1F8}", "United States", "+1", 10),
  buildGenericCountry("GB", "\u{1F1EC}\u{1F1E7}", "United Kingdom", "+44", 10),
  buildGenericCountry("AU", "\u{1F1E6}\u{1F1FA}", "Australia", "+61", 9),
  buildGenericCountry("NZ", "\u{1F1F3}\u{1F1FF}", "New Zealand", "+64", 9),
];

type PhoneInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  error?: string | null;
};

function parseInitial(value: string) {
  const country = COUNTRIES[0];
  if (!value) return { countryCode: country.code, local: "" };
  const match = COUNTRIES.find((item) => value.startsWith(item.dial));
  if (!match) return { countryCode: country.code, local: "" };
  const local = value.slice(match.dial.length);
  return { countryCode: match.code, local };
}

export function PhoneInput({ label, value, onChange, helperText, error }: PhoneInputProps) {
  const initial = useMemo(() => parseInitial(value), [value]);
  const [countryCode, setCountryCode] = useState(initial.countryCode);
  const [localNumber, setLocalNumber] = useState(initial.local);

  useEffect(() => {
    const next = parseInitial(value);
    setCountryCode(next.countryCode);
    setLocalNumber(next.local);
  }, [value]);

  const country = COUNTRIES.find((item) => item.code === countryCode) || COUNTRIES[0];

  function emit(nextLocal: string, nextCountry = country) {
    const normalized = nextCountry.normalize(nextLocal);
    const e164 = normalized ? `${nextCountry.dial}${normalized}` : "";
    onChange(e164);
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <select
          className="h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={countryCode}
          onChange={(event) => {
            const nextCode = event.target.value;
            const next = COUNTRIES.find((item) => item.code === nextCode) || COUNTRIES[0];
            setCountryCode(next.code);
            emit(localNumber, next);
          }}
          aria-label="Country code"
        >
          {COUNTRIES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.flag} {item.dial}
            </option>
          ))}
        </select>
        <input
          className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={country.format(localNumber)}
          inputMode="tel"
          autoComplete="tel"
          placeholder="82 123 4567"
          onChange={(event) => {
            const raw = event.target.value;
            const normalized = country.normalize(raw);
            setLocalNumber(normalized);
            emit(normalized);
          }}
          aria-invalid={error ? "true" : "false"}
        />
      </div>
      {helperText ? <span className="text-xs text-muted-foreground">{helperText}</span> : null}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
      {value && !validateE164(value) ? (
        <span className="text-xs text-destructive">Enter a valid phone number.</span>
      ) : null}
    </div>
  );
}

export default PhoneInput;
