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
  /** Shown on the book-a-lesson teacher list and public booking page */
  rateYen: z.number().int().min(0).max(9_999_999).nullable().optional(),
  offersFreeTrial: z.boolean().optional(),
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

  const profile = await prisma.teacherProfile.upsert({
    where: { userId },
    create: {
      userId,
      displayName: data.displayName,
      bio: data.bio === undefined ? null : data.bio,
      countryOfOrigin: data.countryOfOrigin === undefined ? null : data.countryOfOrigin,
      credentials: data.credentials === undefined ? null : data.credentials,
      instructionLanguages: data.instructionLanguages ?? ["EN"],
      specialties: data.specialties ?? [],
      rateYen: data.rateYen === undefined ? null : data.rateYen,
      offersFreeTrial: data.offersFreeTrial ?? true,
    },
    update: {
      ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
      ...(data.bio !== undefined ? { bio: data.bio } : {}),
      ...(data.countryOfOrigin !== undefined ? { countryOfOrigin: data.countryOfOrigin } : {}),
      ...(data.credentials !== undefined ? { credentials: data.credentials } : {}),
      ...(data.instructionLanguages !== undefined ? { instructionLanguages: data.instructionLanguages } : {}),
      ...(data.specialties !== undefined ? { specialties: data.specialties } : {}),
      ...(data.rateYen !== undefined ? { rateYen: data.rateYen } : {}),
      ...(data.offersFreeTrial !== undefined ? { offersFreeTrial: data.offersFreeTrial } : {}),
    },
  });

  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/dashboard`);
    revalidatePath(`/${locale}/dashboard/profile`);
    revalidatePath(`/${locale}/book`);
    revalidatePath(`/${locale}/book/teachers/${profile.id}`);
  }

  return NextResponse.json({ ok: true, teacherProfileId: profile.id });
}
