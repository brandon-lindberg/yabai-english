import { NextResponse } from "next/server";
import { BookingStatus } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ bookingId: string }>;
};

export async function POST(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!booking || booking.studentId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (booking.status !== BookingStatus.PENDING_PAYMENT) {
    return NextResponse.json({ error: "Booking is not pending payment" }, { status: 409 });
  }

  const payment = booking.payments?.[0];
  if (!payment) {
    return NextResponse.json({ error: "Payment session not found" }, { status: 409 });
  }

  const checkoutId =
    payment.providerCheckoutId ?? `${payment.provider.toLowerCase()}_checkout_${payment.id}`;
  const checkoutUrl = payment.checkoutUrl ?? `/book/checkout/${booking.id}`;
  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "REQUIRES_ACTION",
      providerCheckoutId: checkoutId,
      checkoutUrl,
    },
  });

  return NextResponse.json({
    ok: true,
    paymentId: updated.id,
    provider: updated.provider,
    method: updated.method,
    checkoutUrl: updated.checkoutUrl,
  });
}
