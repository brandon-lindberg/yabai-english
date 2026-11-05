import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { runPaymentRecoveryBatch } from "@/lib/payment-recovery-batch";

export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(req: Request) {
  const secret = process.env.PAYMENT_RECOVERY_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Recovery job authentication is not configured" }, { status: 503 });
  const expected = Buffer.from(`Bearer ${secret}`), supplied = Buffer.from(req.headers.get("authorization") ?? "");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await runPaymentRecoveryBatch(prisma));
}
export const POST = GET;
