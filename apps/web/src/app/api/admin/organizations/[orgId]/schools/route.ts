import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { seedDefaultSchoolTaxonomy } from "@/lib/school-default-taxonomy";

const createSchoolSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional(),
  nameJa: z.string().trim().max(200).optional(),
  nameEn: z.string().trim().max(200).optional(),
  timezone: z.string().trim().max(100).optional(),
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

  const parsed = createSchoolSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
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

  const { name, slug, nameJa, nameEn, timezone } = parsed.data;
  const resolvedSlug =
    slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const existing = await prisma.school.findFirst({
    where: { organizationId: orgId, slug: resolvedSlug },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Slug is already taken in this org" }, { status: 409 });
  }

  const school = await prisma.$transaction(async (tx) => {
    const created = await tx.school.create({
      data: {
        organizationId: orgId,
        name,
        slug: resolvedSlug,
        nameJa,
        nameEn,
        timezone,
      },
    });
    await seedDefaultSchoolTaxonomy(tx, created.id);
    return created;
  });

  return NextResponse.json({ school }, { status: 201 });
}
