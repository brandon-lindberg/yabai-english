import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const assignRoleSchema = z.object({
  email: z.string().trim().email(),
  orgRole: z.enum(["OWNER", "ORG_ADMIN", "SCHOOL_ADMIN", "TEACHER", "STUDENT"]),
  schoolId: z.string().trim().min(1).optional().nullable(),
});

type RouteContext = { params: Promise<{ orgId: string }> };

export async function POST(req: Request, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orgId } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = assignRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, orgRole, schoolId: rawSchoolId } = parsed.data;

  const orgWideRole = orgRole === "OWNER" || orgRole === "ORG_ADMIN";
  const schoolId = orgWideRole ? null : rawSchoolId ?? null;

  if (!orgWideRole && !schoolId) {
    return NextResponse.json(
      { error: "schoolId is required for school-scoped roles" },
      { status: 400 },
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (schoolId) {
    const school = await prisma.school.findFirst({
      where: { id: schoolId, organizationId: orgId },
      select: { id: true },
    });
    if (!school) {
      return NextResponse.json({ error: "School not found in this org" }, { status: 404 });
    }
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "No user found with that email" }, { status: 404 });
  }

  const existing = await prisma.organizationMembership.findFirst({
    where: { organizationId: orgId, userId: user.id, schoolId: schoolId ?? null },
    select: { id: true },
  });

  const membership = existing
    ? await prisma.organizationMembership.update({
        where: { id: existing.id },
        data: {
          orgRole,
          status: "ACTIVE",
          joinedAt: new Date(),
        },
      })
    : await prisma.organizationMembership.create({
        data: {
          organizationId: orgId,
          userId: user.id,
          schoolId,
          orgRole,
          status: "ACTIVE",
          joinedAt: new Date(),
        },
      });

  return NextResponse.json({ membership }, { status: existing ? 200 : 201 });
}
