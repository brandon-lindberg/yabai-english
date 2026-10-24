import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export function JapaneseStudyUnavailable() {
  const t = useTranslations("japaneseStudy");
  return <EmptyState title={t("unavailableTitle")} description={t("unavailableBody")} action={<>
    <Link href="/japanese-placement" className={buttonClasses()}>{t("placement")}</Link>
    <Link href="/book" className={buttonClasses({ variant: "secondary" })}>{t("book")}</Link>
  </>} />;
}
