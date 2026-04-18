import { Link } from "@/i18n/navigation";
import type { TeacherCard as TeacherCardData } from "@/lib/teacher-discovery";
import { buildTeacherCardProfileHref } from "@/lib/teacher-card-href";

type Props = {
  teacher: TeacherCardData;
  onboardingNext?: string | null;
  onboardingStep?: string | null;
};

export function TeacherCard({
  teacher,
  onboardingNext = null,
  onboardingStep = null,
}: Props) {
  const profileHref = buildTeacherCardProfileHref(
    teacher.id,
    onboardingNext,
    onboardingStep,
  ) as "/book/teachers/[teacherId]";

  return (
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-border bg-background text-xs text-muted">
        {teacher.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={teacher.imageUrl} alt={teacher.displayName} className="h-full w-full object-cover" />
        ) : (
          teacher.displayName.slice(0, 2).toUpperCase()
        )}
      </div>
      <h2 className="text-lg font-semibold text-foreground">{teacher.displayName}</h2>
      <p className="mt-1 text-sm text-muted">
        {teacher.countryOfOrigin ?? "—"} · {teacher.instructionLanguages.join(", ")}
      </p>
      {teacher.specialties.length > 0 && (
        <p className="mt-2 text-sm text-muted">{teacher.specialties.join(" · ")}</p>
      )}
      <p className="mt-2 text-sm text-foreground">
        {teacher.rateYen ? `JPY ${teacher.rateYen.toLocaleString()}` : "JPY —"}
      </p>
      <p className="mt-1 text-xs text-muted">
        {teacher.activeAvailabilityCount} available slot
        {teacher.activeAvailabilityCount === 1 ? "" : "s"}
      </p>
      <Link
        href={profileHref}
        className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        View profile
      </Link>
    </article>
  );
}
