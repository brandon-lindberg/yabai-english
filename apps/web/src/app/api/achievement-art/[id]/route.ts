import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hiddenLearnerCatalogue } from "@/lib/achievements/hidden-learner-catalogue";
import { teachingMilestones } from "@/lib/achievements/teaching-catalogue";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";

const privateLearnerArt = new Set<string>(hiddenLearnerCatalogue.map(card => card.id));
const privateTeacherArt = new Set<string>(teachingMilestones.filter(card => "hidden" in card).map(card => card.id));

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  if (!session?.user?.id) return new Response(null, { status: 404 });
  const userId = session.user.id;
  const teaching = isTeacherCabinetRole(session.user.role);
  if (!(teaching ? privateTeacherArt : privateLearnerArt).has(id)) return new Response(null, { status: 404 });
  const where = { userId, achievementId: id };
  const learningLanguage = session.user.learningLanguage ?? "ENGLISH";
  const award = teaching
    ? await prisma.teachingAchievementAward.findUnique({ where: { userId_achievementId: where }, select: { achievementId: true } })
    : await prisma.learningAchievementAward.findUnique({
      where: { userId_learningLanguage_achievementId: { ...where, learningLanguage } }, select: { achievementId: true },
    });
  if (!award) return new Response(null, { status: 404 });
  const file = await readFile(join(process.cwd(), "data", "teaching-achievement-art", id + ".png"));
  return new Response(new Uint8Array(file), { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" } });
}
