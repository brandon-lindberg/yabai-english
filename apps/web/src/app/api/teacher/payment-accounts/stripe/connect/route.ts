import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";
import {
  createStripeAccountOnboardingLink,
  createStripeStandardAccount,
  stripeConnectConfigured,
} from "@/lib/stripe/stripe-connect";
import { isLocalStripeProviderAccount } from "@/lib/payment-methods";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Surfaces Stripe API rejections (e.g. Connect not enabled on the platform
 * account) as a concise 502 instead of an unhandled 500 with a full error dump.
 */
function stripeErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown Stripe error";
  console.error("Stripe Connect onboarding failed:", message);
  return NextResponse.json(
    { error: `Stripe rejected the request: ${message}` },
    { status: 502 },
  );
}

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
        select: { providerAccountId: true },
        take: 1,
      },
    },
  });

  if (!teacherProfile) {
    return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
  }

  const storedAccountId = teacherProfile.paymentAccounts?.[0]?.providerAccountId ?? null;
  const existingAccountId = isLocalStripeProviderAccount(storedAccountId)
    ? null
    : storedAccountId;
  let stripeAccount: { id: string };
  if (existingAccountId) {
    stripeAccount = { id: existingAccountId };
  } else {
    try {
      stripeAccount = await createStripeStandardAccount({ email: session.user.email });
    } catch (error) {
      return stripeErrorResponse(error);
    }
  }

  const account = await prisma.teacherPaymentAccount.upsert({
    where: {
      teacherId_provider: {
        teacherId: teacherProfile.id,
        provider: "STRIPE",
      },
    },
    create: {
      teacherId: teacherProfile.id,
      provider: "STRIPE",
      providerAccountId: stripeAccount.id,
      status: "PENDING",
      chargesEnabled: false,
      payoutsEnabled: false,
    },
    update: {
      providerAccountId: stripeAccount.id,
      status: "PENDING",
      chargesEnabled: false,
      payoutsEnabled: false,
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

  const baseUrl = appUrl();
  let link: { url: string };
  try {
    link = await createStripeAccountOnboardingLink({
      accountId: stripeAccount.id,
      refreshUrl: `${baseUrl}/dashboard/settings?tab=payments&stripe=refresh`,
      returnUrl: `${baseUrl}/dashboard/settings?tab=payments&stripe=return`,
    });
  } catch (error) {
    return stripeErrorResponse(error);
  }

  return NextResponse.json({
    ok: true,
    onboardingUrl: link.url,
    account,
  });
}
