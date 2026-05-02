import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

const setActiveOrgSchema = z.object({
  orgId: z.string().min(1).nullable(),
  schoolId: z.string().min(1).nullable(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = setActiveOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { orgId, schoolId } = parsed.data;
  const cookieStore = await cookies();

  if (!orgId) {
    // Clear org context
    cookieStore.delete("active-org-id");
    cookieStore.delete("active-school-id");
    return NextResponse.json({ activeOrgId: null, activeSchoolId: null });
  }

  // Validate membership
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      userId: session.user.id,
      organizationId: orgId,
      status: "ACTIVE",
      ...(schoolId ? { schoolId } : { schoolId: null }),
    },
    select: { orgRole: true },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "No active membership for this organization" },
      { status: 403 },
    );
  }

  cookieStore.set("active-org-id", orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  if (schoolId) {
    cookieStore.set("active-school-id", schoolId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  } else {
    cookieStore.delete("active-school-id");
  }

  return NextResponse.json({
    activeOrgId: orgId,
    activeSchoolId: schoolId,
    orgRole: membership.orgRole,
  });
}
