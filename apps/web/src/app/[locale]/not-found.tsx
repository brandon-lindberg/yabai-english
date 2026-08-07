import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { actionLinkClass } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/ui/page-header";

export default async function NotFoundPage() {
  const t = await getTranslations("common");
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <PageHeader title="404" description="ページが見つかりません。" />
      <Link href="/" className={`${actionLinkClass} mt-6`}>
        {t("appName")}
      </Link>
    </main>
  );
}
