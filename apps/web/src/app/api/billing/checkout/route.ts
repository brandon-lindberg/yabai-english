import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { z } from "zod";

const bodySchema = z.object({
  credits: z.number().int().min(1).max(50),
  /** JPY amount per credit (integer yen). Configure for your pricing. */
  unitAmountYen: z.number().int().min(100).optional(),
});

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 },
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { credits, unitAmountYen } = parsed.data;
  const yenPerCredit = unitAmountYen ?? 2000;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { studentProfile: true },
  });
  if (!user?.studentProfile) {
    return NextResponse.json({ error: "No student profile" }, { status: 400 });
  }

  let customerId = user.studentProfile.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.studentProfile.update({
      where: { userId: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    client_reference_id: user.id,
    metadata: {
      userId: user.id,
      credits: String(credits),
    },
    line_items: [
      {
        price_data: {
          currency: "jpy",
          product_data: {
            name: `Lesson credits × ${credits}`,
          },
          unit_amount: yenPerCredit * credits,
        },
        quantity: 1,
      },
    ],
    success_url: `${base}/ja/dashboard?checkout=success`,
    cancel_url: `${base}/ja/dashboard?checkout=cancel`,
  });

  return NextResponse.json({ url: checkout.url });
}
