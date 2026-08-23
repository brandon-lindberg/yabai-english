"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { TeacherPlatformTier } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

/**
 * The tier tab answers "what tier am I on" but never answered "why", so a
 * teacher could read their fee without knowing what moves it. This is the
 * reference for that: the fee ladder, the averages that set a tier, and the
 * promote-fast / demote-slow asymmetry that is the least guessable rule in the
 * system.
 *
 * It is a modal rather than an inline panel because it is a document read once
 * and then not again — folding it into the tab would push the teacher's actual
 * numbers, which they came for, below a screen of policy.
 */

const TIERS: TeacherPlatformTier[] = ["TIER_1", "TIER_2", "TIER_3"];

const TIER_LABEL: Record<TeacherPlatformTier, string> = {
  TIER_1: "Tier 1",
  TIER_2: "Tier 2",
  TIER_3: "Tier 3",
};

/**
 * The fee schedule is already written and translated for the marketplace
 * economics notice. Same fact, same keys — restating it here is how the two
 * would drift the next time a rate changes.
 */
const TIER_SCHEDULE_KEY: Record<
  TeacherPlatformTier,
  "tier1Schedule" | "tier2Schedule" | "tier3Schedule"
> = {
  TIER_1: "tier1Schedule",
  TIER_2: "tier2Schedule",
  TIER_3: "tier3Schedule",
};

function Rule({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-4">
      <h3 className="text-sm font-bold tracking-[-0.01em] text-foreground">{title}</h3>
      <div className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export function TierExplainer() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("dashboard.settingsPage.tierExplainer");
  const te = useTranslations("dashboard.settingsPage.marketplaceEconomics");

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {t("trigger")}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("title")}
        description={t("intro")}
        actions={
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            {t("close")}
          </Button>
        }
      >
        {/* The dialog is centred by `m-auto`, so unbounded content would run off
            both ends of a short viewport with nothing able to scroll. Capping
            the body keeps the title and the close action reachable. */}
        <div className="max-h-[min(60vh,30rem)] space-y-5 overflow-y-auto overscroll-contain pr-1">
          <Rule title={t("whyTitle")}>
            <p>{t("whyBody")}</p>
          </Rule>

          <Rule title={t("feesTitle")}>
            <p>{t("feesIntro")}</p>
            <dl className="mt-3 space-y-0">
              {TIERS.map((tier) => (
                <div
                  key={tier}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-t border-border py-2"
                >
                  <dt className="font-semibold text-foreground">{TIER_LABEL[tier]}</dt>
                  <dd className="tabular-nums">{te(TIER_SCHEDULE_KEY[tier])}</dd>
                </div>
              ))}
            </dl>
          </Rule>

          <Rule title={t("resetTitle")}>
            <p>{t("resetBody")}</p>
          </Rule>

          <Rule title={t("calcTitle")}>
            <p>{t("calcIntro")}</p>
            <ul className="mt-1 list-none space-y-1 p-0">
              <li>{t("calcTier1")}</li>
              <li>{t("calcTier2")}</li>
              <li>{t("calcTier3")}</li>
            </ul>
          </Rule>

          <Rule title={t("improveTitle")}>
            <p>{t("improveIntro")}</p>
            <ul className="mt-1 list-none space-y-1 p-0">
              <li>{t("improveQuarterly")}</li>
              <li>{t("improveApplies")}</li>
              <li>{t("improveRefunds")}</li>
            </ul>
          </Rule>

          <Rule title={t("countsTitle")}>
            <p>{t("countsBody")}</p>
          </Rule>

          <Rule title={t("reviewsTitle")}>
            <p>{t("reviewsClock")}</p>
            <ul className="mt-1 list-none space-y-1 p-0">
              <li>{t("reviewsQuarterly")}</li>
              <li>{t("reviewsAnnual")}</li>
            </ul>
          </Rule>

          <Rule title={t("movementTitle")}>
            <ul className="list-none space-y-1 p-0">
              <li>{t("movementUp")}</li>
              <li>{t("movementQuarterly")}</li>
              <li>{t("movementAnnual")}</li>
            </ul>
          </Rule>

          <Rule title={t("overrideTitle")}>
            <p>{t("overrideBody")}</p>
          </Rule>
        </div>
      </Modal>
    </>
  );
}
