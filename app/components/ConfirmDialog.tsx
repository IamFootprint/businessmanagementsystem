"use client";

import { useEffect, useCallback, useState } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  loading?: boolean;
  confirmationText?: string;
  confirmationLabel?: string;
  confirmationValue?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  detail,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  confirmationText,
  confirmationLabel = "Type to confirm",
  confirmationValue = "DELETE",
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState("");
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    },
    [onCancel, loading]
  );

  useEffect(() => {
    if (!open) return;
    setTypedValue("");
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="w-full max-w-md bg-card rounded-xl border border-border shadow-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display font-bold text-foreground text-lg mb-2">{title}</h3>
        <p className="text-sm text-foreground mb-1">{message}</p>
        {detail ? <p className="text-sm text-muted-foreground mb-3">{detail}</p> : null}
        {confirmationText ? (
          <div className="space-y-1.5 mb-4">
            <label className="text-sm font-medium text-foreground">{confirmationLabel}</label>
            <input
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={typedValue}
              onChange={(event) => setTypedValue(event.target.value)}
              placeholder={confirmationValue}
              disabled={loading}
            />
            <span className="text-xs text-muted-foreground">Type {confirmationValue} to continue.</span>
          </div>
        ) : null}
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-input bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            onClick={onCancel}
            disabled={loading}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`inline-flex items-center justify-center h-10 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              variant === "danger"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
            onClick={onConfirm}
            disabled={loading || Boolean(confirmationText && typedValue !== confirmationValue)}
            type="button"
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
