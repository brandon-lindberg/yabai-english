"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";

const STORAGE_KEY = "english-platform-theme";
const CHANGE_EVENT = "english-platform-theme-change";

type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch { /* The theme still works when browser storage is unavailable. */ }
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const t = useTranslations("common");
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const sync = () => setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    queueMicrotask(() => {
      setTheme(readTheme());
    });
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  function setMode(next: Theme) {
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Keep this visit usable without storage. */ }
    document.documentElement.dataset.theme = next;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  const next = theme === "dark" ? "light" : "dark";
  const label = theme === null ? t("themeToggle") : t(next === "dark" ? "switchToDark" : "switchToLight");
  return (
    <button type="button" aria-label={label} title={label} disabled={theme === null} onClick={() => setMode(next)}
      className={buttonClasses({ variant: "ghost", size: "icon", className: "text-muted hover:text-foreground" })}>
      <InterfaceIcon name={theme === "dark" ? "moon" : "sun"} />
    </button>
  );
}
