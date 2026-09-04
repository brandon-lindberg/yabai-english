import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { TeacherFilterBar } from "@/components/teacher-filter-bar";

/**
 * What sits above the browse list — which is not the same thing for the two
 * people who reach this page.
 *
 * A signed-out visitor used to get the filter bar too: two full-width inputs,
 * the largest thing on the screen, that could not narrow anything. `/book`
 * strips filter params from a guest and redirects to sign-in before it ever
 * queries, so the fields looked live, accepted typing, and bounced you off the
 * page on blur. Above them sat a sentence whose only content was that they did
 * not work.
 *
 * What a guest gets instead is one line — how many teachers are on the list,
 * and what signing in would buy them here. The list is the reason they came, so
 * it now starts where the form used to end.
 */
export async function TeacherBrowseControls({
  guest,
  count,
  signInHref,
  specialty,
  language,
}: {
  guest: boolean;
  /** Teachers on the list, for the guest's count line. */
  count: number;
  /** Sign-in, carrying a callback back to this page. */
  signInHref: string;
  specialty: string;
  language: string;
}) {
  const t = await getTranslations("booking");

  if (!guest) {
    return <TeacherFilterBar specialty={specialty} language={language} />;
  }

  // "0 teachers" directly above "No teachers are listed yet." is one fact
  // stated twice; the empty state below owns that case on its own.
  if (count === 0) return null;

  /*
    No rule under this: `TeacherBrowseList` opens with its own `border-t`, and
    two rules a few pixels apart read as a boxed toolbar — the container this
    system builds structure without.
  */
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
      <p className="text-sm font-bold tabular-nums text-foreground">
        {t("teacherCountListed", { count })}
      </p>
      <Link
        href={signInHref as "/auth/signin"}
        className="text-sm text-muted underline underline-offset-4 transition-colors hover:text-foreground"
      >
        {t("guestFilterSignIn")}
      </Link>
    </div>
  );
}
