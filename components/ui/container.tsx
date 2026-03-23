import type { ReactNode } from "react";

export function Container({ children }: { children: ReactNode }) {
  return <div className="max-w-5xl mx-auto px-4 lg:px-6">{children}</div>;
}
