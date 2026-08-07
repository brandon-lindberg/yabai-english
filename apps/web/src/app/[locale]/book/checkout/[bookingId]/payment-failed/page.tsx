import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

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
        <PageHeader
          title={t("checkoutSuccessTitle")}
          description={t("checkoutPaymentConfirmed")}
        />
        <Link
          href={`/dashboard/schedule/lessons/${booking.id}`}
          className={`mt-6 ${buttonClasses({ size: "lg" })}`}
        >
          {t("checkoutSuccessViewBooking")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <PageHeader title={t("checkoutFailedTitle")} description={t("checkoutFailedBody")} />
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/book/checkout/${booking.id}`}
          className={buttonClasses({ size: "lg" })}
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
