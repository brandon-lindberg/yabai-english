import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  listStripeCustomerCardSummary,
  stripeConnectConfigured,
} from "@/lib/stripe/stripe-connect";

export async function GET() {
  if (!stripeConnectConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { stripeCustomerId: true },
  });

  if (!profile?.stripeCustomerId) {
    return NextResponse.json({
      ok: true,
      hasCustomer: false,
      savedCard: null,
    });
  }

  const savedCard = await listStripeCustomerCardSummary(profile.stripeCustomerId);
  return NextResponse.json({
    ok: true,
    hasCustomer: true,
    savedCard,
  });
}
