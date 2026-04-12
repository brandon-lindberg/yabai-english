import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { STUDENT_SHORT_BIO_MAX_CHARS } from "@/lib/student-short-bio";
import { z } from "zod";

const patchSchema = z.object({
  shortBio: z.string().max(STUDENT_SHORT_BIO_MAX_CHARS).nullable().optional(),
  name: z.string().min(1).max(100).trim().optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { shortBio, name } = parsed.data;

  await prisma.$transaction(async (tx) => {
    if (name !== undefined) {
      await tx.user.update({
        where: { id: session.user.id },
        data: { name },
      });
    }
    if (shortBio !== undefined) {
      await tx.studentProfile.update({
        where: { userId: session.user.id },
        data: { shortBio: shortBio === null ? null : shortBio },
      });
    }
  });

  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/dashboard`);
    revalidatePath(`/${locale}/dashboard/profile`);
  }

  return NextResponse.json({ ok: true });
}
