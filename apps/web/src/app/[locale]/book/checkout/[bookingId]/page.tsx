import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CheckoutPayButton } from "@/components/checkout-pay-button";

type Props = {
  params: Promise<{ bookingId: string }>;
};

export default async function CheckoutPage({ params }: Props) {
  const t = await getTranslations("booking");
  const session = await auth();
  if (!session?.user?.id) return null;

  const { bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { lessonProduct: true, teacher: { include: { user: true } } },
  });

  if (!booking || booking.studentId !== session.user.id) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">{t("checkoutTitle")}</h1>
      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <p className="text-sm text-muted">{t("checkoutSummary")}</p>
        <p className="mt-2 text-base font-semibold text-foreground">
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
        <div className="mt-4">
          <CheckoutPayButton bookingId={booking.id} />
        </div>
      </div>
    </main>
  );
}
