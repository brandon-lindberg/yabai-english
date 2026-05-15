import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const acceptedAt = new Date();
  const profile = await prisma.teacherProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      paymentPolicyAcceptedAt: acceptedAt,
    },
    update: {
      paymentPolicyAcceptedAt: acceptedAt,
    },
    select: { id: true, paymentPolicyAcceptedAt: true },
  });

  for (const locale of ["en", "ja"]) {
    revalidatePath(`/${locale}/book`);
    revalidatePath(`/${locale}/book/teachers/${profile.id}`);
  }

  return NextResponse.json({
    ok: true,
    acceptedAt: acceptedAt.toISOString(),
  });
}
