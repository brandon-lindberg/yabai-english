import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const listQuerySchema = z.object({
  role: z.enum(["STUDENT", "TEACHER", "ADMIN"]).optional(),
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
  if (session.user.role !== "ADMIN") {
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
  }));

  return NextResponse.json({ items, total, page, pageSize });
}
