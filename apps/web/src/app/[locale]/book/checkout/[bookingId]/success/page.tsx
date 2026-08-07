import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { finalizeStripeCheckoutReturn } from "@/lib/stripe/finalize-stripe-checkout-return";
import { revalidateDashboardStudentRosterPaths } from "@/lib/revalidate-dashboard-roster";
import { buttonClasses } from "@/components/ui/button";
import { BookingSummary } from "@/components/booking/booking-summary";
import { PageHeader } from "@/components/ui/page-header";

type Props = {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

export default async function CheckoutSuccessPage({ params, searchParams }: Props) {
  const t = await getTranslations("booking");
  const td = await getTranslations("dashboard");
  const session = await auth();
  if (!session?.user?.id) return null;

  const { bookingId } = await params;
  const { session_id: sessionId } = await searchParams;

  let booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { lessonProduct: true, teacher: { include: { user: true } } },
  });
  if (!booking || booking.studentId !== session.user.id) {
    notFound();
  }

  if (booking.status === "PENDING_PAYMENT") {
    if (!sessionId || sessionId === "confirmed") {
      redirect(`/book/checkout/${bookingId}`);
    }
    const result = await finalizeStripeCheckoutReturn({
      bookingId,
      sessionId,
      revalidateRoster: false,
    });
    if (!result.ok) {
      redirect(`/book/checkout/${bookingId}/payment-failed?reason=${result.reason}`);
    }
    after(() => {
      revalidateDashboardStudentRosterPaths();
    });
    booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { lessonProduct: true, teacher: { include: { user: true } } },
    });
    if (!booking || booking.status !== "CONFIRMED") {
      redirect(`/book/checkout/${bookingId}/payment-failed?reason=CONFIRM_FAILED`);
    }
  }

  if (booking.status !== "CONFIRMED") {
    redirect(`/book/checkout/${bookingId}/payment-failed?reason=INVALID_STATUS`);
  }

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <PageHeader title={t("checkoutSuccessTitle")} description={t("checkoutSuccessBody")} />

      <BookingSummary
        lessonNameJa={booking.lessonProduct.nameJa}
        lessonNameEn={booking.lessonProduct.nameEn}
        startsAtIso={booking.startsAt.toISOString()}
        endsAtIso={booking.endsAt.toISOString()}
        teacherName={booking.teacher.user.name ?? booking.teacher.user.email ?? ""}
        priceYen={booking.quotedPriceYen}
        statusTone="settled"
        statusLabel={td("statusConfirmed")}
        emphasis="secondary"
      />

      <div className="mt-8">
        <Link
          href={`/dashboard/schedule/lessons/${booking.id}`}
          className={`mt-6 ${buttonClasses({ size: "lg" })}`}
        >
          {t("checkoutSuccessViewBooking")}
        </Link>
      </div>
    </main>
  );
}
