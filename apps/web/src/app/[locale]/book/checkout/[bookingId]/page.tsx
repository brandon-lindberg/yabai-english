import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CheckoutPayButton } from "@/components/checkout-pay-button";
import { PaymentPolicyNotice } from "@/components/payment-policy-notice";
import { InlineAlert } from "@/components/ui/inline-alert";
import { bookingStatusKey, bookingStatusTone } from "@/lib/booking-status";
import { BookingSummary } from "@/components/booking/booking-summary";

type Props = {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ stripe?: string; session_id?: string }>;
};

export default async function CheckoutPage({ params, searchParams }: Props) {
  const t = await getTranslations("booking");
  const td = await getTranslations("dashboard");
  const session = await auth();
  if (!session?.user?.id) return null;

  const { bookingId } = await params;
  const { stripe, session_id: sessionId } = await searchParams;

  if (stripe === "success" && sessionId) {
    redirect(`/book/checkout/${bookingId}/success?session_id=${encodeURIComponent(sessionId)}`);
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { lessonProduct: true, teacher: { include: { user: true } } },
  });

  if (!booking || booking.studentId !== session.user.id) {
    notFound();
  }

  if (booking.status === "CONFIRMED") {
    redirect(`/book/checkout/${bookingId}/success?session_id=confirmed`);
  }

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-black tracking-[-0.03em] text-foreground sm:text-3xl">
        {t("checkoutTitle")}
      </h1>
      <p className="mt-2 max-w-[56ch] text-base text-muted">{t("checkoutSummary")}</p>

      <BookingSummary
        lessonNameJa={booking.lessonProduct.nameJa}
        lessonNameEn={booking.lessonProduct.nameEn}
        startsAtIso={booking.startsAt.toISOString()}
        endsAtIso={booking.endsAt.toISOString()}
        teacherName={booking.teacher.user.name ?? booking.teacher.user.email ?? ""}
        priceYen={booking.quotedPriceYen}
        statusTone={bookingStatusTone(booking.status)}
        statusLabel={td(bookingStatusKey(booking.status))}
      />

      <section className="mt-6">
        {stripe === "cancelled" ? (
          <InlineAlert variant="warning" className="mt-5">
            {t("checkoutCancelled")}
          </InlineAlert>
        ) : null}

        {booking.status === "PENDING_PAYMENT" ? (
          <>
            <PaymentPolicyNotice audience="student" className="mt-5" />
            <div className="mt-5">
              <CheckoutPayButton bookingId={booking.id} />
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
