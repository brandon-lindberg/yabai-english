import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";
import { resolveStripeAccountStatus } from "@/lib/stripe/stripe-account-status";
import {
  retrieveStripeAccount,
  stripeConnectConfigured,
} from "@/lib/stripe/stripe-connect";

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
  if (!teacherProfile || !paymentAccount?.providerAccountId) {
    return NextResponse.json({ error: "Stripe account not connected" }, { status: 404 });
  }

  const stripeAccount = await retrieveStripeAccount(paymentAccount.providerAccountId);
  const status = resolveStripeAccountStatus(stripeAccount);

  await prisma.teacherPaymentMethod.upsert({
    where: {
      accountId_method: {
        accountId: paymentAccount.id,
        method: "CARD",
      },
    },
    create: {
      accountId: paymentAccount.id,
      method: "CARD",
      enabled: status.methodEnabled,
    },
    update: {
      enabled: status.methodEnabled,
    },
  });

  const account = await prisma.teacherPaymentAccount.update({
    where: { id: paymentAccount.id },
    data: {
      status: status.status,
      chargesEnabled: status.chargesEnabled,
      payoutsEnabled: status.payoutsEnabled,
      requirementsDue: status.requirementsDue,
    },
    select: {
      id: true,
      provider: true,
      providerAccountId: true,
      status: true,
      chargesEnabled: true,
      payoutsEnabled: true,
      methods: { select: { method: true, enabled: true } },
    },
  });

  return NextResponse.json({ ok: true, account });
}
