import { getRequestLearningSite } from "@/lib/learning-site-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { learningLanguageSchema } from "@/lib/learning-language";

const bodySchema = z.object({ learningLanguage: learningLanguageSchema }).strict();

/** Deliberate subject selection; never inferred from a locale switch or URL filter. */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Students only" }, { status: 403 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const site = await getRequestLearningSite();
  if (site?.learningLanguage && site.learningLanguage !== parsed.data.learningLanguage) {
    return NextResponse.json({ error: "WRONG_LEARNING_SITE" }, { status: 403 });
  }
  const selected = await prisma.user.update({
    where: { id: session.user.id },
    data: { learningLanguage: parsed.data.learningLanguage },
    select: { learningLanguage: true },
  });
  return NextResponse.json(selected);
}
