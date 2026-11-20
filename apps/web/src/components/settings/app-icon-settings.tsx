"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { FormStatus } from "@/components/ui/form-status";
import { Section } from "@/components/ui/section";
import { APP_ICON_COLORS, APP_ICON_COOKIE, appIconPath, type AppIconColor } from "@/lib/app-icon";

export function AppIconSettings({ icon, defaultIcon }: { icon: AppIconColor; defaultIcon: AppIconColor }) {
  const t = useTranslations("dashboard.settingsPage.appIcon");
  const [selected, setSelected] = useState(icon);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected === icon || saveState === "saving") return;

    const value = selected === defaultIcon ? "" : selected;
    const key = `${APP_ICON_COOKIE}=`;
    try {
      document.cookie = `${key}${value}; Path=/; Max-Age=${value ? 31_536_000 : 0}; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
      const saved = document.cookie.split("; ").find(cookie => cookie.startsWith(key))?.slice(key.length) ?? "";
      if (saved !== value) {
        setSaveState("error");
        return;
      }
    } catch {
      setSaveState("error");
      return;
    }

    setSaveState("saving");
    // A fresh document lets the browser reread the same manifest URL and the
    // updated Apple touch icon before offering to install or update the app.
    window.location.reload();
  }

  return (
    <Section title={t("title")} description={t("description")} ruled={false}>
      <form onSubmit={save} className="max-w-xl">
        <fieldset disabled={saveState === "saving"}>
          <legend className="sr-only">{t("choose")}</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {APP_ICON_COLORS.map(color => (
              <label key={color} className="relative block cursor-pointer">
                <input
                  type="radio" name="app-icon" value={color} checked={selected === color}
                  onChange={() => { setSelected(color); setSaveState("idle"); }}
                  className="peer sr-only"
                />
                <span className="flex h-full flex-col items-center rounded-xl border border-border bg-surface px-2 py-4 text-center hover:bg-[var(--app-hover)] peer-checked:border-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-foreground">
                  <Image src={appIconPath(color, "icon-96.png")} alt="" width={64} height={64} unoptimized />
                  <span className="mt-2 text-sm font-semibold">{t(color)}</span>
                  {color === defaultIcon ? <span className="text-xs text-muted">{t("default")}</span> : null}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={selected === icon || saveState === "saving"}>{t("save")}</Button>
          <FormStatus state={saveState} savingLabel={t("saving")} savedLabel="" errorLabel={t("error")} />
        </div>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted">{t("installed")}</p>
      </form>
    </Section>
  );
}
