import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";

const patchSchema = z.object({
  displayName: z.string().min(1).max(100).trim().optional(),
  bio: z.string().max(2000).trim().nullable().optional(),
  countryOfOrigin: z.string().max(80).trim().nullable().optional(),
  credentials: z.string().max(2000).trim().nullable().optional(),
  instructionLanguages: z.array(z.string().min(1).max(20)).max(10).optional(),
  specialties: z.array(z.string().min(1).max(40)).max(20).optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const userId = session.user.id;
  const data = parsed.data;

  await prisma.teacherProfile.upsert({
    where: { userId },
    create: {
      userId,
      displayName: data.displayName,
      bio: data.bio === undefined ? null : data.bio,
      countryOfOrigin: data.countryOfOrigin === undefined ? null : data.countryOfOrigin,
      credentials: data.credentials === undefined ? null : data.credentials,
      instructionLanguages: data.instructionLanguages ?? ["EN"],
      specialties: data.specialties ?? [],
    },
    update: {
      ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
      ...(data.bio !== undefined ? { bio: data.bio } : {}),
      ...(data.countryOfOrigin !== undefined ? { countryOfOrigin: data.countryOfOrigin } : {}),
      ...(data.credentials !== undefined ? { credentials: data.credentials } : {}),
      ...(data.instructionLanguages !== undefined ? { instructionLanguages: data.instructionLanguages } : {}),
      ...(data.specialties !== undefined ? { specialties: data.specialties } : {}),
    },
  });

  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/dashboard`);
    revalidatePath(`/${locale}/dashboard/profile`);
  }

  return NextResponse.json({ ok: true });
}
