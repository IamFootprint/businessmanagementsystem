import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requirePlatformOwner } from "@/lib/admin/guard";

export default async function AdminPlatformLayout({ children }: { children: ReactNode }) {
  const auth = await requirePlatformOwner();
  if (!auth.ok) {
    redirect("/admin");
  }
  return <>{children}</>;
}
