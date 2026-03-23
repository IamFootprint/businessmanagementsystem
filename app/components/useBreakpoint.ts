"use client";

import { useEffect, useState } from "react";

export const BREAKPOINTS = {
  mobileMax: 639,
  tabletMin: 640,
  tabletMax: 1024,
  desktopMin: 1025
} as const;

export type BreakpointName = "mobile" | "tablet" | "desktop";

function resolveBreakpoint(width: number): BreakpointName {
  if (width <= BREAKPOINTS.mobileMax) return "mobile";
  if (width <= BREAKPOINTS.tabletMax) return "tablet";
  return "desktop";
}

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<BreakpointName>("mobile");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setBreakpoint(resolveBreakpoint(window.innerWidth));
    sync();
    setReady(true);
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return {
    ready,
    breakpoint,
    isMobile: !ready || breakpoint === "mobile",
    isTablet: breakpoint === "tablet",
    isDesktop: breakpoint === "desktop"
  };
}
