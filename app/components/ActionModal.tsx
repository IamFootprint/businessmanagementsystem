"use client";

import { useCallback, useEffect, type ReactNode } from "react";

type ActionModalProps = {
  open: boolean;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  onClose: () => void;
  children: ReactNode;
};

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl"
};

export default function ActionModal({
  open,
  title,
  description,
  size = "md",
  onClose,
  children
}: ActionModalProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`w-full ${sizeClasses[size]} bg-card rounded-xl border border-border shadow-lg`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-display font-bold text-foreground">{title}</h3>
          <button
            type="button"
            className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        {description ? <p className="text-sm text-muted-foreground px-5 pt-3">{description}</p> : null}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
