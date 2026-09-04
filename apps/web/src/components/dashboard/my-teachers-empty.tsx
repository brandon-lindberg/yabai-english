import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";

/**
 * What a student sees before they have booked anyone.
 *
 * An empty state that only reports the emptiness names a dead end. The one
 * thing to do about having no teachers is to go and find one, so the way on is
 * here rather than left for the reader to locate in the nav.
 */
export async function MyTeachersEmpty() {
  const t = await getTranslations("dashboard.myTeachersPage");
  const tCommon = await getTranslations("common");

  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-sm text-muted">{t("empty")}</p>
      <Link href="/book" className={buttonClasses()}>
        {tCommon("bookLesson")}
      </Link>
    </div>
  );
}
