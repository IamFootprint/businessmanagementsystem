"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "cycledesk-theme";

function applyTheme(nextTheme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(nextTheme);
  localStorage.setItem(STORAGE_KEY, nextTheme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
      applyTheme(stored);
      return;
    }
    applyTheme("light");
  }, []);

  return (
    <button
      className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      type="button"
      onClick={() => {
        const next = theme === "light" ? "dark" : "light";
        setTheme(next);
        applyTheme(next);
      }}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      title={theme === "light" ? "Dark mode" : "Light mode"}
    >
      {theme === "light" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M21 12.79A9 9 0 0 1 11.21 3c0-.34.02-.68.05-1.01A9 9 0 1 0 22 13.74c-.34.03-.68.05-1 .05z" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 4.5a1 1 0 0 1 1 1v1.25a1 1 0 1 1-2 0V5.5a1 1 0 0 1 1-1zm0 12.5a1 1 0 0 1 1 1v1.25a1 1 0 1 1-2 0V18a1 1 0 0 1 1-1zm7.5-5a1 1 0 0 1-1 1h-1.25a1 1 0 1 1 0-2H18.5a1 1 0 0 1 1 1zm-12.5 0a1 1 0 0 1-1 1H4.75a1 1 0 1 1 0-2H7a1 1 0 0 1 1 1zm9.36-5.36a1 1 0 0 1 0 1.41l-.88.88a1 1 0 1 1-1.41-1.41l.88-.88a1 1 0 0 1 1.41 0zM9.93 14.69a1 1 0 0 1 0 1.41l-.88.88a1 1 0 1 1-1.41-1.41l.88-.88a1 1 0 0 1 1.41 0zm6.55 2.29a1 1 0 0 1-1.41 0l-.88-.88a1 1 0 1 1 1.41-1.41l.88.88a1 1 0 0 1 0 1.41zM9.93 9.31a1 1 0 0 1-1.41 0l-.88-.88a1 1 0 0 1 1.41-1.41l.88.88a1 1 0 0 1 0 1.41zM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
        </svg>
      )}
    </button>
  );
}
