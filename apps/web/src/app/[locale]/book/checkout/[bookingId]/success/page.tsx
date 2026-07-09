import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { finalizeStripeCheckoutReturn } from "@/lib/stripe/finalize-stripe-checkout-return";

type Props = {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

export default async function CheckoutSuccessPage({ params, searchParams }: Props) {
  const t = await getTranslations("booking");
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
    const result = await finalizeStripeCheckoutReturn({ bookingId, sessionId });
    if (!result.ok) {
      redirect(`/book/checkout/${bookingId}/payment-failed?reason=${result.reason}`);
    }
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
      <h1 className="text-2xl font-bold text-foreground">{t("checkoutSuccessTitle")}</h1>
      <p className="mt-2 text-sm text-muted">{t("checkoutSuccessBody")}</p>
      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <p className="text-base font-semibold text-foreground">
          {booking.lessonProduct.nameJa} / {booking.lessonProduct.nameEn}
        </p>
        <p className="mt-1 text-sm text-muted">
          {booking.startsAt.toLocaleString()} - {booking.endsAt.toLocaleString()}
        </p>
        <p className="mt-1 text-sm text-muted">
          {t("teacher")}: {booking.teacher.user.name ?? booking.teacher.user.email}
        </p>
        <p className="mt-3 text-lg font-bold text-foreground">
          JPY {booking.quotedPriceYen.toLocaleString()}
        </p>
        <Link
          href={`/dashboard/schedule/lessons/${booking.id}`}
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {t("checkoutSuccessViewBooking")}
        </Link>
      </div>
    </main>
  );
}
