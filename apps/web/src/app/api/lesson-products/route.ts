import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.lessonProduct.findMany({
    where: { active: true },
    orderBy: [{ tier: "asc" }, { durationMin: "asc" }],
  });
  return NextResponse.json(products);
}
