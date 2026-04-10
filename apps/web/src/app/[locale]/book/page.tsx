import { getTranslations } from "next-intl/server";
import { BookingForm } from "@/components/booking-form";

export default async function BookPage() {
  const t = await getTranslations("booking");

  return (
    <main className="mx-auto max-w-lg flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("selectSlot")}</p>
      <div className="mt-8">
        <BookingForm />
      </div>
    </main>
  );
}
