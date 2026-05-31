import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  createStripePlatformCustomer,
  createStripeSetupCheckoutSession,
  stripeConnectConfigured,
} from "@/lib/stripe/stripe-connect";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function POST() {
  if (!stripeConnectConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, stripeCustomerId: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  let customerId = profile.stripeCustomerId;
  if (!customerId) {
    const customer = await createStripePlatformCustomer({
      email: session.user.email,
      name: session.user.name,
    });
    customerId = customer.id;
    await prisma.studentProfile.update({
      where: { id: profile.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const baseUrl = appUrl();
  const setup = await createStripeSetupCheckoutSession({
    customerId,
    successUrl: `${baseUrl}/dashboard/settings?tab=payments&stripeSetup=return`,
    cancelUrl: `${baseUrl}/dashboard/settings?tab=payments&stripeSetup=cancel`,
  });

  if (!setup.url) {
    return NextResponse.json({ error: "Stripe setup URL was not returned" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, setupUrl: setup.url });
}
