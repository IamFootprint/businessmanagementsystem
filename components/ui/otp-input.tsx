"use client";

import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export function OtpInput({
  value,
  onChange,
  length = 6,
  autoFocus = false,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  return (
    <InputOTP
      maxLength={length}
      value={value}
      onChange={onChange}
      autoFocus={autoFocus}
      disabled={disabled}
    >
      <InputOTPGroup>
        {Array.from({ length }, (_, i) => (
          <InputOTPSlot key={i} index={i} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
