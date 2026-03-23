"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function EmbedWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const isEmbedded = searchParams.get("embedded") === "true";

  useEffect(() => {
    if (isEmbedded) {
      document.body.classList.add("cd-embedded");
    }
    return () => {
      document.body.classList.remove("cd-embedded");
    };
  }, [isEmbedded]);

  return <>{children}</>;
}
