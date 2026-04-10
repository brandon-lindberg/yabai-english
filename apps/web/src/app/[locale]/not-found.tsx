import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFoundPage() {
  const t = await getTranslations("common");
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-slate-900">404</h1>
      <p className="mt-2 text-slate-600">ページが見つかりません。</p>
      <Link href="/" className="mt-6 text-sky-600 hover:underline">
        {t("appName")}
      </Link>
    </main>
  );
}
