import { getTranslations } from "next-intl/server";
import { Avatar } from "@/components/ui/avatar";

/**
 * Who this student is: photo, name, level, timezone, goals, bio.
 *
 * A teacher reaches it from two directions — opening a booking, or opening the
 * student from their roster — and both pages had built the panel out
 * character-for-character, sixty-five lines each, differing only in whether
 * they wrote `&&` or a ternary. `jscpd` counted it as four separate clones.
 *
 * Both also hand-rolled the avatar, which is what `ui/avatar` exists for; that
 * was the ninth and tenth copy of "their photo, or their initials in a circle".
 */

export type StudentProfileSummary = {
  placedLevel: string;
  placedSubLevel: number | null;
  timezone: string;
  learningGoals: string[];
  shortBio: string | null;
};

export async function StudentProfilePanel({
  student,
  profile,
}: {
  student: { name: string | null; email: string | null; image: string | null };
  profile: StudentProfileSummary | null;
}) {
  const t = await getTranslations("dashboard.lessonDetail");
  const to = await getTranslations("onboarding");

  const goalLabelById: Record<string, string> = {
    conversation: to("goalConversation"),
    business: to("goalBusiness"),
    exam: to("goalExam"),
    travel: to("goalTravel"),
  };
  const levelLabels: Record<string, string> = {
    UNSET: t("levelUnset"),
    BEGINNER: t("levelBeginner"),
    INTERMEDIATE: t("levelIntermediate"),
    ADVANCED: t("levelAdvanced"),
  };

  return (
    <section className="border-t border-border pt-6">
      <h2 className="text-base font-semibold text-foreground">{t("studentProfile")}</h2>
      <div className="mt-3 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar src={student.image} name={student.name ?? student.email} size="md" />
          <div className="min-w-0">
            <p className="font-medium text-foreground">{student.name ?? t("unnamed")}</p>
            {student.email ? <p className="text-sm text-muted">{student.email}</p> : null}
          </div>
        </div>

        {profile ? (
          <div className="space-y-2 border-t border-border pt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted">{t("level")}</p>
                <p className="text-sm text-foreground">
                  {levelLabels[profile.placedLevel] ?? profile.placedLevel}
                  {profile.placedSubLevel ? ` (${profile.placedSubLevel})` : ""}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted">{t("timezone")}</p>
                <p className="text-sm text-foreground">{profile.timezone}</p>
              </div>
            </div>

            {profile.learningGoals.length > 0 ? (
              <div>
                <p className="text-sm font-medium text-muted">{t("goals")}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {profile.learningGoals.map((goal) => (
                    <span
                      key={goal}
                      className="rounded-full bg-chip px-2.5 py-0.5 text-sm font-medium text-foreground"
                    >
                      {goalLabelById[goal] ?? goal}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {profile.shortBio ? (
              <div>
                <p className="text-sm font-medium text-muted">{t("bio")}</p>
                <p className="mt-1 text-sm text-foreground">{profile.shortBio}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
