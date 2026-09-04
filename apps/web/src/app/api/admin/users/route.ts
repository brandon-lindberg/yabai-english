import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import { provisionRoleProfile } from "@/lib/admin/provision-role-profile";

const listQuerySchema = z.object({
  role: z.enum(["STUDENT", "TEACHER", "SUPER_ADMIN"]).optional(),
  q: z.string().trim().max(200).optional(),
  sort: z
    .enum([
      "createdAt_desc",
      "createdAt_asc",
      "email_desc",
      "email_asc",
      "name_desc",
      "name_asc",
      "role_desc",
      "role_asc",
      "accountStatus_desc",
      "accountStatus_asc",
    ])
    .optional()
    .default("createdAt_desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

function parseSort(sort: z.infer<typeof listQuerySchema>["sort"]): Prisma.UserOrderByWithRelationInput {
  const [field, dir] = sort.split("_") as [string, "asc" | "desc"];
  const order = dir === "asc" ? "asc" : "desc";
  if (field === "createdAt") return { createdAt: order };
  if (field === "email") return { email: order };
  if (field === "name") return { name: order };
  if (field === "role") return { role: order };
  if (field === "accountStatus") return { accountStatus: order };
  return { createdAt: "desc" };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = listQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const { role, q, sort, page, pageSize } = parsed.data;
  const where: Prisma.UserWhereInput = {};
  if (role) where.role = role;
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * pageSize;
  const orderBy = parseSort(sort);

  const [rawItems, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        locale: true,
        accountStatus: true,
        createdAt: true,
        updatedAt: true,
        studentProfile: {
          select: {
            placedLevel: true,
            placementNeedsReview: true,
            timezone: true,
          },
        },
        teacherProfile: {
          select: {
            displayName: true,
            rateYen: true,
            googleCalendarRefreshToken: true,
          },
        },
        googleIntegrationSettings: {
          select: {
            calendarConnected: true,
          },
        },
        organizationMemberships: {
          where: { status: { in: ["ACTIVE", "PENDING_APPROVAL", "INVITED"] } },
          select: {
            id: true,
            orgRole: true,
            status: true,
            schoolId: true,
            organization: { select: { id: true, name: true } },
            school: { select: { id: true, name: true } },
          },
          orderBy: [{ organizationId: "asc" }, { schoolId: "asc" }],
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const items = rawItems.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    locale: row.locale,
    accountStatus: row.accountStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    studentProfile: row.studentProfile,
    teacherProfile: row.teacherProfile
      ? {
          displayName: row.teacherProfile.displayName,
          rateYen: row.teacherProfile.rateYen,
          calendarConnected:
            row.googleIntegrationSettings?.calendarConnected ??
            Boolean(row.teacherProfile.googleCalendarRefreshToken),
        }
      : null,
    memberships: row.organizationMemberships ?? [],
  }));

  return NextResponse.json({ items, total, page, pageSize });
}

/**
 * Create a user who has never signed in, with their role already set.
 *
 * There is no application flow — teaching here is by invitation — and until now
 * that meant waiting for the person to sign up as a student so an admin could
 * change the column afterwards. They saw a student dashboard first, and somebody
 * had to remember to go back.
 *
 * The row is enough on its own because of two things already true of this app:
 * the Google provider links an OAuth account to an existing user with the same
 * address (`allowDangerousEmailAccountLinking`), and the sign-in callback looks
 * the user up by email and returns early for a teacher without touching their
 * role. So the invitee signs in with Google as normal and arrives as a teacher.
 */
const createSchema = z.object({
  email: z.string().trim().min(3).max(200).email(),
  name: z.string().trim().min(1).max(100).optional(),
  /*
    Deliberately not the full enum. Promoting an existing, known account to
    administrator is a deliberate act against a record that already exists;
    typing an address into a box is not the same thing.
  */
  role: z.enum([Role.STUDENT, Role.TEACHER]),
  locale: z.string().trim().max(10).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  /*
    Lower-cased and trimmed because this is the key sign-in matches on. A stored
    `T@Example.com ` would never be found against what Google returns, and the
    invitee would quietly get a brand new student account instead.
  */
  const email = parsed.data.email.trim().toLowerCase();

  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name: parsed.data.name ?? null,
        role: parsed.data.role,
        ...(parsed.data.locale ? { locale: parsed.data.locale } : {}),
      },
      select: { id: true, email: true, role: true },
    });
    await provisionRoleProfile(tx as never, { userId: user.id, role: parsed.data.role });
    return user;
  });

  return NextResponse.json(created, { status: 201 });
}
