import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";

function isDevPaymentSetupEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "true";
}

export async function POST() {
  if (!isDevPaymentSetupEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id || !isTeacherCabinetRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!teacherProfile) {
    return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
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
      providerAccountId: `acct_local_${teacherProfile.id}`,
      status: "ENABLED",
      chargesEnabled: true,
      payoutsEnabled: true,
    },
    update: {
      providerAccountId: `acct_local_${teacherProfile.id}`,
      status: "ENABLED",
      chargesEnabled: true,
      payoutsEnabled: true,
    },
    select: {
      id: true,
      provider: true,
      providerAccountId: true,
      status: true,
      chargesEnabled: true,
      payoutsEnabled: true,
    },
  });

  const method = await prisma.teacherPaymentMethod.upsert({
    where: {
      accountId_method: {
        accountId: account.id,
        method: "CARD",
      },
    },
    create: {
      accountId: account.id,
      method: "CARD",
      enabled: true,
    },
    update: {
      enabled: true,
    },
    select: {
      method: true,
      enabled: true,
    },
  });

  return NextResponse.json({
    ok: true,
    account: {
      ...account,
      methods: [method],
    },
  });
}
