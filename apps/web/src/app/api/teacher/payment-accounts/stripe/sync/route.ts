import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";
import { syncAndNotifyTeacherPaymentAccount } from "@/lib/stripe/sync-and-notify-teacher-payment-account";
import {
  retrieveStripeAccount,
  stripeConnectConfigured,
} from "@/lib/stripe/stripe-connect";
import { isLocalStripeProviderAccount } from "@/lib/payment-methods";

export async function POST() {
  if (!stripeConnectConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id || !isTeacherCabinetRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      paymentAccounts: {
        where: { provider: "STRIPE" },
        select: { id: true, providerAccountId: true },
        take: 1,
      },
    },
  });
  const paymentAccount = teacherProfile?.paymentAccounts?.[0] ?? null;
  if (
    !teacherProfile ||
    !paymentAccount?.providerAccountId ||
    isLocalStripeProviderAccount(paymentAccount.providerAccountId)
  ) {
    return NextResponse.json({ error: "Stripe account not connected" }, { status: 404 });
  }

  const stripeAccount = await retrieveStripeAccount(paymentAccount.providerAccountId);
  const account = await syncAndNotifyTeacherPaymentAccount({
    paymentAccountId: paymentAccount.id,
    stripeAccount,
    select: {
      id: true,
      provider: true,
      providerAccountId: true,
      status: true,
      chargesEnabled: true,
      payoutsEnabled: true,
      requirementsDue: true,
      detailsSubmitted: true,
      pendingVerification: true,
      disabledReason: true,
      methods: { select: { method: true, enabled: true } },
    },
  });

  return NextResponse.json({ ok: true, account });
}
