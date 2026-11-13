import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getTeacherJapaneseResult, JapanesePlacementFailure } from "@/lib/japanese-placement/service";
import { japaneseResultSchema, type JapanesePlacementResult as Result } from "@/lib/japanese-placement/public";
import { JapanesePlacementResult } from "./result";

export async function TeacherJapanesePlacement({ teacherUserId, studentId }: { teacherUserId: string; studentId: string }) {
  const t = await getTranslations("japanesePlacement");
  let parsed: Result | null = null;
  let failed = false;
  try {
    const { result } = await getTeacherJapaneseResult(prisma, teacherUserId, studentId);
    if (result) parsed = japaneseResultSchema.parse(result);
  } catch (error) {
    if (error instanceof JapanesePlacementFailure && [403, 404].includes(error.status)) return null;
    console.error("Japanese result could not be loaded", error);
    failed = true;
  }
  if (failed) return <p className="text-sm text-muted">{t("teacherUnavailable")}</p>;
  if (parsed) return <JapanesePlacementResult result={parsed} teacher />;
  return <section className="border-t border-border pt-6"><h2 className="text-base font-semibold text-foreground">{t("teacherResultTitle")}</h2><p className="mt-3 text-sm text-muted">{t("teacherEmpty")}</p></section>;
}
