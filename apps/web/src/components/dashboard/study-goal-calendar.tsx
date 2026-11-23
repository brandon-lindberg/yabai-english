"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StudyDayStamp } from "./study-day-stamp";
import styles from "./study-streak.module.css";

const pageSize = 7;

export function StudyGoalCalendar({ period, goal, studied, claim }: {
  period: string;
  goal: number;
  studied: number;
  claim?: { account: string; day: string };
}) {
  const t = useTranslations("dashboard.studyStreak");
  const lastPage = Math.ceil(goal / pageSize) - 1;
  const [page, setPage] = useState(() => Math.min(Math.floor(studied / pageSize), lastPage));
  const first = page * pageSize + 1;
  const last = Math.min(first + pageSize - 1, goal);
  const columns = last - first + 1;

  return (
    <div data-study-streak-calendar="">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium tabular-nums text-muted">{period}</p>
        {lastPage > 0 && (
          <div className="flex gap-1">
            <Button size="icon" variant="secondary" disabled={page === 0} aria-label={t("previousGoalDays")} onClick={() => setPage(page - 1)}>
              <span className="rotate-90"><InterfaceIcon name="chevron" /></span>
            </Button>
            <Button size="icon" variant="secondary" disabled={page === lastPage} aria-label={t("nextGoalDays")} onClick={() => setPage(page + 1)}>
              <span className="-rotate-90"><InterfaceIcon name="chevron" /></span>
            </Button>
            <span role="status" className="sr-only">{t("goalPage", { first, last, goal })}</span>
          </div>
        )}
      </div>
      <ol
        start={first} aria-label={t("goalCalendar")}
        className="grid divide-x divide-border border-y border-border"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, maxWidth: `${columns * 4}rem` }}
      >
        {Array.from({ length: columns }, (_, index) => {
          const day = first + index;
          const complete = day <= studied;
          const next = day === studied + 1;
          return (
            <li key={day} data-studied={complete ? "" : undefined} aria-current={next ? "step" : undefined}
              className="grid justify-items-center gap-1 py-2 aria-[current=step]:bg-surface">
              <span className="sr-only">{t(complete ? "goalDayComplete" : "goalDayOpen", { day })}</span>
              <span aria-hidden="true" className={`whitespace-nowrap text-xs tabular-nums ${next ? "font-bold" : "text-muted"}`}>
                {t("goalDay", { day })}
              </span>
              {complete && day === studied && claim
                ? <StudyDayStamp claim={claim} />
                : <span aria-hidden="true" className="grid size-8 place-items-center">
                  <span className={complete ? styles.stamp : next ? `${styles.guide} text-muted` : "size-1 rounded-full bg-border"} />
                </span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
