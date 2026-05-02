import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { ensureCatalogProductsForOfferings } from "@/lib/lesson-product-catalog";

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
  lessonOfferings: z
    .array(
      z.object({
        durationMin: z.number().int().min(15).max(180),
        rateYen: z.number().int().min(1).max(9_999_999),
        isGroup: z.boolean(),
        groupSize: z.number().int().min(2).max(30).nullable(),
        /** FK to TeacherClassType.id; null/undefined = wildcard offering. */
        classTypeId: z.string().min(1).nullable().optional(),
      }),
    )
    .max(40)
    .optional(),
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
      },
    });

    if (data.lessonOfferings !== undefined) {
      const refTypeIds = Array.from(
        new Set(
          data.lessonOfferings
            .map((o) => o.classTypeId)
            .filter((id): id is string => typeof id === "string"),
        ),
      );
      const foundTypes =
        refTypeIds.length > 0
          ? await tx.teacherClassType.findMany({
              where: { id: { in: refTypeIds }, teacherId: updated.id },
              select: { id: true, code: true },
            })
          : [];
      if (foundTypes.length !== refTypeIds.length) {
        throw Object.assign(
          new Error("classTypeId does not belong to this teacher"),
          { status: 400 },
        );
      }
      const codeByTypeId = new Map(foundTypes.map((t) => [t.id, t.code]));

      await tx.teacherLessonOffering.deleteMany({
        where: { teacherId: updated.id },
      });
      if (data.lessonOfferings.length > 0) {
        await tx.teacherLessonOffering.createMany({
          data: data.lessonOfferings.map((o) => ({
            teacherId: updated.id,
            durationMin: o.durationMin,
            rateYen: o.rateYen,
            isGroup: o.isGroup,
            groupSize: o.isGroup ? o.groupSize : null,
            active: true,
            classTypeId: o.classTypeId ?? null,
          })),
        });
      }
      // Make sure a matching LessonProduct exists for every offering so the
      // student booking dropdown can surface it. Safe to run even when empty.
      await ensureCatalogProductsForOfferings(
        tx,
        data.lessonOfferings.map((o) => ({
          classType: o.classTypeId
            ? { code: codeByTypeId.get(o.classTypeId) ?? "" }
            : null,
          durationMin: o.durationMin,
          active: true,
        })),
      );
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
    revalidatePath(`/${locale}/book`);
    revalidatePath(`/${locale}/book/teachers/${profile.id}`);
  }

  return NextResponse.json({ ok: true, teacherProfileId: profile.id });
}
