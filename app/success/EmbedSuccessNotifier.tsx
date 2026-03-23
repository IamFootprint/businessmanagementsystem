"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * When the success page loads inside the widget iframe,
 * notify the parent window so it can close the panel or show a confirmation.
 */
export default function EmbedSuccessNotifier() {
  const searchParams = useSearchParams();
  const isEmbedded = searchParams.get("embedded") === "true";

  useEffect(() => {
    if (isEmbedded && window.parent !== window) {
      const targetOrigin = document.referrer ? new URL(document.referrer).origin : "*";
      window.parent.postMessage({ type: "cycledesk:success" }, targetOrigin);
    }
  }, [isEmbedded]);

  return null;
}
