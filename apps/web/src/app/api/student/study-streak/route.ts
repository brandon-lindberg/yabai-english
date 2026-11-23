import { auth } from "@/auth";
import { isLoginAllowedForAccountStatus } from "@/lib/account-status";
import { learningLanguageForRequest } from "@/lib/learning-site-request";
import { prisma } from "@/lib/prisma";
import { studyStreakPreferenceSchema } from "@/lib/study/streak-preference";
import { saveStudyStreakPreference } from "@/lib/study/streak-service";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id }, select: { role: true, accountStatus: true, learningLanguage: true },
  });
  if (!user || user.role !== "STUDENT" || !isLoginAllowedForAccountStatus(user.accountStatus)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const preference = studyStreakPreferenceSchema.safeParse(await request.json().catch(() => null));
  if (!preference.success) return Response.json({ error: "Invalid study streak preference" }, { status: 400 });
  const learningLanguage = await learningLanguageForRequest(user.learningLanguage);
  return Response.json(await saveStudyStreakPreference(prisma, { userId: session.user.id, learningLanguage }, preference.data));
}
