import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { validatePublicLessonRateYen } from "@/lib/lesson-rate-policy";
import { TEACHER_BIO_MAX_CHARS, TEACHER_CREDENTIALS_MAX_CHARS } from "@/lib/markdown/limits";

const patchSchema = z.object({
  displayName: z.string().min(1).max(100).trim().optional(),
  /** Markdown. The cap counts source, which is what the column stores. */
  bio: z.string().max(TEACHER_BIO_MAX_CHARS).trim().nullable().optional(),
  countryOfOrigin: z.string().max(80).trim().nullable().optional(),
  credentials: z.string().max(TEACHER_CREDENTIALS_MAX_CHARS).trim().nullable().optional(),
  instructionLanguages: z.array(z.string().min(1).max(20)).max(10).optional(),
  specialties: z.array(z.string().min(1).max(40)).max(20).optional(),
  /** Shown on the book-a-lesson teacher list and public booking page */
  rateYen: z.number().int().min(0).max(9_999_999).nullable().optional(),
  offersFreeTrial: z.boolean().optional(),
  /** When true, teacher is hidden from /book and only rostered students may book via direct link. */
  marketplaceHidden: z.boolean().optional(),
  /** When true, the 10% refund processing fee is deducted from the student's refund instead of covered by the teacher. */
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "TEACHER" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const userId = session.user.id;
  const data = parsed.data;
  const fallbackRateCheck = validatePublicLessonRateYen(data.rateYen);
  if (!fallbackRateCheck.ok) {
    return NextResponse.json({ error: fallbackRateCheck.error }, { status: 400 });
  }
  let profile;
  try {
    profile = await prisma.$transaction(async (tx) => {
    const updated = await tx.teacherProfile.upsert({
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
        marketplaceHidden: data.marketplaceHidden ?? false,
      },
      update: {
        ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
        ...(data.countryOfOrigin !== undefined ? { countryOfOrigin: data.countryOfOrigin } : {}),
        ...(data.credentials !== undefined ? { credentials: data.credentials } : {}),
        ...(data.instructionLanguages !== undefined
          ? { instructionLanguages: data.instructionLanguages }
          : {}),
        ...(data.specialties !== undefined ? { specialties: data.specialties } : {}),
        ...(data.rateYen !== undefined ? { rateYen: data.rateYen } : {}),
        ...(data.offersFreeTrial !== undefined ? { offersFreeTrial: data.offersFreeTrial } : {}),
        ...(data.marketplaceHidden !== undefined
          ? { marketplaceHidden: data.marketplaceHidden }
          : {}),
      },
    });

    // Opting out has to retire the trial hours too. A published trial slot keeps
    // matching bookings on duration alone, so leaving it active would sell a
    // trial the teacher just said they do not offer.
    if (data.offersFreeTrial === false) {
      const trialOfferings = await tx.teacherLessonOffering.findMany({
        where: { teacherId: updated.id, isFreeTrial: true },
        select: { id: true },
      });
      if (trialOfferings.length > 0) {
        const trialOfferingIds = trialOfferings.map((offering) => offering.id);
        await tx.availabilitySlot.updateMany({
          where: { teacherLessonOfferingId: { in: trialOfferingIds } },
          data: { active: false },
        });
        await tx.teacherLessonOffering.updateMany({
          where: { id: { in: trialOfferingIds } },
          data: { active: false },
        });
      }
    }

      return updated;
    });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    if (e.status === 400) {
      return NextResponse.json({ error: e.message ?? "Invalid input" }, { status: 400 });
    }
    throw err;
  }

  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/dashboard`);
    revalidatePath(`/${locale}/dashboard/profile`);
    revalidatePath(`/${locale}/dashboard/students`);
    revalidatePath(`/${locale}/dashboard/my-teachers`);
    revalidatePath(`/${locale}/book`);
    revalidatePath(`/${locale}/book/teachers/${profile.id}`);
  }

  return NextResponse.json({ ok: true, teacherProfileId: profile.id });
}
