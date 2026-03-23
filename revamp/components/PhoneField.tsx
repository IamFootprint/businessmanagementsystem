import { useEffect, useMemo, useState } from "react";
import { validateE164 } from "@/lib/auth/phone";

type CountryOption = {
  code: string;
  flag: string;
  label: string;
  dial: string;
  maxDigits: number;
  format: (value: string) => string;
  normalize: (value: string) => string;
  placeholder: string;
};

type PhoneFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  helperText?: string;
  error?: string | null;
  disabled?: boolean;
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
  placeholder = "555 123 4567"
): CountryOption {
  return {
    code,
    flag,
    label,
    dial,
    maxDigits,
    placeholder,
    format: (value) => formatGrouped(value.replace(/\D/g, "").slice(0, maxDigits)),
    normalize: (value) => value.replace(/\D/g, "").slice(0, maxDigits),
  };
}

const COUNTRIES: CountryOption[] = [
  {
    code: "ZA",
    flag: "🇿🇦",
    label: "South Africa",
    dial: "+27",
    maxDigits: 9,
    placeholder: "82 123 4567",
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
  buildGenericCountry("US", "🇺🇸", "United States", "+1", 10, "415 555 1234"),
  buildGenericCountry("GB", "🇬🇧", "United Kingdom", "+44", 10, "7700 900123"),
  buildGenericCountry("AU", "🇦🇺", "Australia", "+61", 9, "412 345 678"),
  buildGenericCountry("NZ", "🇳🇿", "New Zealand", "+64", 9, "21 123 4567"),
];

function parseInitial(value: string) {
  const fallback = COUNTRIES[0];
  if (!fallback) return { countryCode: "ZA", local: "" };
  if (!value) return { countryCode: fallback.code, local: "" };
  const match = COUNTRIES.find((item) => value.startsWith(item.dial));
  if (!match) return { countryCode: fallback.code, local: "" };
  const local = value.slice(match.dial.length);
  return { countryCode: match.code, local };
}

export function PhoneField({
  value,
  onChange,
  label = "Phone number",
  helperText,
  error,
  disabled,
}: PhoneFieldProps) {
  const initial = useMemo(() => parseInitial(value), [value]);
  const [countryCode, setCountryCode] = useState(initial.countryCode);
  const [localNumber, setLocalNumber] = useState(initial.local);

  useEffect(() => {
    const next = parseInitial(value);
    setCountryCode(next.countryCode);
    setLocalNumber(next.local);
  }, [value]);

  const fallback = COUNTRIES[0];
  const country = COUNTRIES.find((item) => item.code === countryCode) || fallback;
  if (!country) {
    return null;
  }

  function emit(nextLocal: string, nextCountry = country) {
    const normalized = nextCountry.normalize(nextLocal);
    const e164 = normalized ? `${nextCountry.dial}${normalized}` : "";
    onChange(e164);
  }

  const formatError = value && !validateE164(value) ? "Enter a valid phone number." : null;

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <select
          className="h-12 w-[92px] shrink-0 rounded-md border border-input bg-background px-2 py-2 text-sm"
          value={countryCode}
          onChange={(event) => {
            const nextCode = event.target.value;
            const nextCountry = COUNTRIES.find((item) => item.code === nextCode) || fallback;
            if (!nextCountry) return;
            setCountryCode(nextCountry.code);
            emit(localNumber, nextCountry);
          }}
          aria-label="Country code"
          disabled={disabled}
        >
          {COUNTRIES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.flag} {item.dial}
            </option>
          ))}
        </select>
        <input
          className="h-12 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={country.format(localNumber)}
          inputMode="tel"
          autoComplete="tel"
          placeholder={country.placeholder}
          onChange={(event) => {
            const normalized = country.normalize(event.target.value);
            setLocalNumber(normalized);
            emit(normalized);
          }}
          aria-invalid={error || formatError ? "true" : "false"}
          disabled={disabled}
        />
      </div>
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
      {error ? <p className="text-xs text-status-cancelled">{error}</p> : null}
      {formatError ? <p className="text-xs text-status-cancelled">{formatError}</p> : null}
    </div>
  );
}
