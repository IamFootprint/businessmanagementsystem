"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type ToastTone = "success" | "error" | "info" | "warning";

type ToastPayload = {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
  hint?: string;
  code?: string;
  requestId?: string;
};

type NotifyApi = {
  success: (title: string, message?: string) => void;
  error: (title: string, message: string, hint?: string, details?: { code?: string; requestId?: string }) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
};

const ToastContext = createContext<NotifyApi | null>(null);

let emitToast: ((payload: Omit<ToastPayload, "id">) => void) | null = null;

function buildId() {
  return `toast_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function copyErrorDetails(code?: string, requestId?: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  const text = [code, requestId].filter(Boolean).join(" · ");
  if (!text) return;
  navigator.clipboard.writeText(text).catch(() => undefined);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ToastPayload[]>([]);
  const active = queue[0] || null;
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    emitToast = (payload) => {
      setQueue((current) => [...current, { id: buildId(), ...payload }]);
    };
    return () => {
      emitToast = null;
    };
  }, []);

  const dismiss = useCallback(() => {
    setQueue((current) => current.slice(1));
  }, []);

  useEffect(() => {
    if (!active) return;
    timeoutRef.current = window.setTimeout(() => {
      dismiss();
    }, active.tone === "error" ? 5200 : 3400);
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [active, dismiss]);

  const api = useMemo<NotifyApi>(
    () => ({
      success(title, message) {
        emitToast?.({ tone: "success", title, message });
      },
      error(title, message, hint, details) {
        emitToast?.({ tone: "error", title, message, hint, code: details?.code, requestId: details?.requestId });
      },
      info(title, message) {
        emitToast?.({ tone: "info", title, message });
      },
      warning(title, message) {
        emitToast?.({ tone: "warning", title, message });
      }
    }),
    []
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="true">
        {active ? (
          <div className={`toast toast-${active.tone}`} role="status">
            <div className="toast-content">
              <strong>{active.title}</strong>
              {active.message ? <div>{active.message}</div> : null}
              {active.hint ? <div className="toast-hint">{active.hint}</div> : null}
              {active.code || active.requestId ? (
                <button
                  type="button"
                  className="toast-copy"
                  onClick={() => copyErrorDetails(active.code, active.requestId)}
                >
                  Copy error details
                </button>
              ) : null}
            </div>
            <button type="button" className="toast-close" onClick={dismiss} aria-label="Dismiss notification">
              ×
            </button>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useNotify() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useNotify must be used inside ToastProvider.");
  }
  return context;
}

export const notify: NotifyApi = {
  success(title, message) {
    emitToast?.({ tone: "success", title, message });
  },
  error(title, message, hint, details) {
    emitToast?.({ tone: "error", title, message, hint, code: details?.code, requestId: details?.requestId });
  },
  info(title, message) {
    emitToast?.({ tone: "info", title, message });
  },
  warning(title, message) {
    emitToast?.({ tone: "warning", title, message });
  }
};
