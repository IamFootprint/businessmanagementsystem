"use client";

import type { ChangeEvent, HTMLInputTypeAttribute, InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/src/lib/utils";

export function LabeledInput({
  label,
  value,
  type,
  placeholder,
  min,
  max,
  step,
  helperText,
  error,
  onChange,
  inputMode,
  autoComplete,
  disabled,
  className,
}: {
  label: string;
  value: string;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  helperText?: string;
  error?: string | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <Input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        inputMode={inputMode}
        autoComplete={autoComplete}
        disabled={disabled}
        className={cn(
          error && "border-destructive",
          className
        )}
      />
      {helperText ? <span className="text-xs text-muted-foreground">{helperText}</span> : null}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
