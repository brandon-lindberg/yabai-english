import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ reason?: string }>;
};

export default async function CheckoutPaymentFailedPage({ params }: Props) {
  const t = await getTranslations("booking");
  const session = await auth();
  if (!session?.user?.id) return null;

  const { bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, studentId: true, status: true },
  });
  if (!booking || booking.studentId !== session.user.id) {
    notFound();
  }

  if (booking.status === "CONFIRMED") {
    return (
      <main className="mx-auto max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">{t("checkoutSuccessTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("checkoutPaymentConfirmed")}</p>
        <Link
          href={`/dashboard/schedule/lessons/${booking.id}`}
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {t("checkoutSuccessViewBooking")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">{t("checkoutFailedTitle")}</h1>
      <p className="mt-2 text-sm text-muted">{t("checkoutFailedBody")}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/book/checkout/${booking.id}`}
          className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {t("checkoutFailedRetry")}
        </Link>
        <Link
          href="/dashboard/schedule"
          className="inline-flex rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-[var(--app-hover)]"
        >
          {t("checkoutFailedBackToSchedule")}
        </Link>
      </div>
    </main>
  );
}
