export type StudentOnboardingStepKey =
  | "profile"
  | "integrations"
  | "bookLesson"
  | "chat"
  | "placement"
  | "materials";

export type StudentOnboardingNextItem = {
  key: StudentOnboardingStepKey;
  href: string;
  disabled?: boolean;
  completed: boolean;
};

export type StudentOnboardingCompletionFlags = Partial<
  Record<StudentOnboardingStepKey, boolean>
>;

const STUDENT_CHECKLIST_BASE: Array<{
  key: StudentOnboardingStepKey;
  basePath: string;
  /** Extra query params appended to the href (before onboardingNext/onboardingStep). */
  extraQuery?: Record<string, string>;
}> = [
  { key: "profile", basePath: "/dashboard/profile" },
  { key: "integrations", basePath: "/dashboard/integrations" },
  { key: "bookLesson", basePath: "/book" },
  { key: "chat", basePath: "/dashboard", extraQuery: { openChat: "1" } },
  { key: "placement", basePath: "/placement" },
  { key: "materials", basePath: "/learn/study" },
];

export function buildStudentOnboardingChecklist(params: {
  locale: string;
  canStartPlacement: boolean;
  onboardingReturnHref?: string;
  completion?: StudentOnboardingCompletionFlags;
}): StudentOnboardingNextItem[] {
  const { locale, canStartPlacement, completion } = params;
  const returnHref = params.onboardingReturnHref ?? "/onboarding/next";
  return STUDENT_CHECKLIST_BASE.map((item) => {
    const localizedBase = `/${locale}${item.basePath}`;
    const qs = new URLSearchParams();
    if (item.extraQuery) {
      for (const [k, v] of Object.entries(item.extraQuery)) {
        qs.set(k, v);
      }
    }
    qs.set("onboardingNext", returnHref);
    qs.set("onboardingStep", item.key);
    const href = `${localizedBase}?${qs.toString()}`;
    return {
      key: item.key,
      href,
      disabled: item.key === "placement" ? !canStartPlacement : false,
      completed: Boolean(completion?.[item.key]),
    };
  });
}

export function summarizeStudentOnboardingProgress(
  items: ReadonlyArray<{ completed: boolean }>,
): { completed: number; total: number; percent: number } {
  const total = items.length;
  const completed = items.reduce((acc, item) => (item.completed ? acc + 1 : acc), 0);
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}

export type StudentOnboardingSignals = {
  profileShortBio: string | null | undefined;
  userName: string | null | undefined;
  userImage: string | null | undefined;
  googleCalendarConnected: boolean | null | undefined;
  googleDriveConnected: boolean | null | undefined;
  hasAnyBooking: boolean;
  hasAnyChatThread: boolean;
  placementCompletedAt: Date | null | undefined;
  hasStudiedAny: boolean;
};

export function computeStudentOnboardingCompletion(
  signals: StudentOnboardingSignals,
  options?: { skippedSteps?: ReadonlyArray<string> },
): StudentOnboardingCompletionFlags {
  const profileDone =
    Boolean((signals.profileShortBio ?? "").trim()) ||
    Boolean((signals.userName ?? "").trim()) ||
    Boolean(signals.userImage);
  const integrationsDone = Boolean(
    signals.googleCalendarConnected || signals.googleDriveConnected,
  );
  const signalFlags: StudentOnboardingCompletionFlags = {
    profile: profileDone,
    integrations: integrationsDone,
    bookLesson: signals.hasAnyBooking,
    chat: signals.hasAnyChatThread,
    placement: Boolean(signals.placementCompletedAt),
    materials: signals.hasStudiedAny,
  };
  const skipped = new Set(options?.skippedSteps ?? []);
  const merged: StudentOnboardingCompletionFlags = {};
  for (const key of Object.keys(signalFlags) as StudentOnboardingStepKey[]) {
    merged[key] = Boolean(signalFlags[key]) || skipped.has(key);
  }
  return merged;
}
