"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "english-platform-theme";

type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "light";
}

export function ThemeToggle() {
  const t = useTranslations("common");
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setTheme(readTheme());
    });
  }, []);

  function setMode(next: Theme) {
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.dataset.theme = next;
    setTheme(next);
  }

  if (theme === null) {
    return (
      <span
        className="inline-block h-9 w-full rounded-full bg-border"
        aria-hidden
      />
    );
  }

  return (
    <div
      className="grid w-full grid-cols-2 items-center rounded-full border border-border bg-surface p-0.5"
      role="group"
      aria-label={t("themeToggle")}
    >
      <button
        type="button"
        onClick={() => setMode("light")}
        aria-pressed={theme === "light"}
        className={`rounded-full px-3 py-1 text-center text-xs font-semibold transition ${
          theme === "light"
            ? "bg-primary text-primary-foreground"
            : "text-muted hover:text-foreground"
        }`}
      >
        {t("themeLight")}
      </button>
      <button
        type="button"
        onClick={() => setMode("dark")}
        aria-pressed={theme === "dark"}
        className={`rounded-full px-3 py-1 text-center text-xs font-semibold transition ${
          theme === "dark"
            ? "bg-primary text-primary-foreground"
            : "text-muted hover:text-foreground"
        }`}
      >
        {t("themeDark")}
      </button>
    </div>
  );
}
