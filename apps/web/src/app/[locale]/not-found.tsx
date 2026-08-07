import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { actionLinkClass } from "@/components/ui/inline-link";

export default async function NotFoundPage() {
  const t = await getTranslations("common");
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-foreground">404</h1>
      <p className="mt-2 text-muted">ページが見つかりません。</p>
      <Link href="/" className={`${actionLinkClass} mt-6`}>
        {t("appName")}
      </Link>
    </main>
  );
}
