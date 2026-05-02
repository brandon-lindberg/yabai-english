import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { seedDefaultSchoolTaxonomy } from "@/lib/school-default-taxonomy";

const createOrgSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  nameJa: z.string().trim().max(200).optional(),
  nameEn: z.string().trim().max(200).optional(),
  timezone: z.string().trim().max(100).optional(),
  schoolName: z.string().trim().min(1).max(200),
  schoolSlug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional(),
  ownerEmail: z.string().trim().email(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, slug, nameJa, nameEn, timezone, schoolName, schoolSlug, ownerEmail } = parsed.data;

  const owner = await prisma.user.findUnique({
    where: { email: ownerEmail },
    select: { id: true },
  });
  if (!owner) {
    return NextResponse.json(
      { error: "No user found with that email" },
      { status: 404 },
    );
  }

  const existing = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Slug is already taken" }, { status: 409 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name,
        slug,
        nameJa,
        nameEn,
        timezone: timezone ?? "Asia/Tokyo",
      },
    });

    const resolvedSchoolSlug =
      schoolSlug ?? schoolName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const school = await tx.school.create({
      data: {
        organizationId: organization.id,
        name: schoolName,
        slug: resolvedSchoolSlug,
      },
    });
    await seedDefaultSchoolTaxonomy(tx, school.id);

    const membership = await tx.organizationMembership.create({
      data: {
        organizationId: organization.id,
        userId: owner.id,
        schoolId: null,
        orgRole: "OWNER",
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    });

    return { organization, school, membership };
  });

  return NextResponse.json(result, { status: 201 });
}
