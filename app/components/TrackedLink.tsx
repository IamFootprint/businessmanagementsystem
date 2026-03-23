"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { event } from "@/lib/analytics/ga4";

type TrackedLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> & {
  eventName: string;
  eventParams?: Record<string, string | number | boolean | undefined>;
  children: ReactNode;
};

export default function TrackedLink({
  eventName,
  eventParams,
  onClick,
  children,
  ...props
}: TrackedLinkProps) {
  return (
    <a
      {...props}
      onClick={(e) => {
        event(eventName, eventParams);
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}

