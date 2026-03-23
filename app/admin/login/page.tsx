"use client";

import { useEffect } from "react";

export default function AdminLoginPage() {
  useEffect(() => {
    window.location.href = "/login?returnTo=/admin";
  }, []);

  return null;
}
