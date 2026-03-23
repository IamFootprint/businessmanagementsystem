"use client";

import { createContext, ReactNode, useContext } from "react";
import type { WorkshopRole } from "@/src/lib/auth/roles";

type AdminUiContextValue = {
  canEdit: boolean;
  reason?: string;
  role?: WorkshopRole;
};

const AdminUiContext = createContext<AdminUiContextValue>({ canEdit: true });

export function AdminUiProvider({
  canEdit,
  reason,
  role,
  children,
}: AdminUiContextValue & { children: ReactNode }) {
  return (
    <AdminUiContext.Provider value={{ canEdit, reason, role }}>
      {children}
    </AdminUiContext.Provider>
  );
}

export function useAdminUi() {
  return useContext(AdminUiContext);
}
