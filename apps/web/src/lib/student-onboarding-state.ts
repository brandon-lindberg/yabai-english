import "server-only";
import type { LearningLanguage, PrismaClient } from "@/generated/prisma/client";
import { readJapanesePlacementRetake } from "./japanese-placement/retake";
import { isPlacementRetakeAllowed } from "./placement-cooldown";
import { computeStudentOnboardingCompletion } from "./student-onboarding-next-links";

type OnboardingDb = Pick<PrismaClient, "studentProfile" | "user" | "googleIntegrationSettings" | "booking" | "chatThread" | "userStudyLevelProgress" | "studyTrack" | "japanesePlacementAttempt">;

/** One read-only source for the checklist and its dashboard reminder. */
export async function readStudentOnboardingState(db: OnboardingDb, userId: string, learningLanguage: LearningLanguage) {
  const isJapanese = learningLanguage === "JAPANESE";
  const [profile, user, google, bookings, threads, studied, track, japaneseRetake] = await Promise.all([
    db.studentProfile.findUnique({ where: { userId }, select: {
      onboardingCompletedAt: true, placedLevel: true, placedSubLevel: true,
      placementCompletedAt: true, shortBio: true, skippedOnboardingSteps: true,
    } }),
    db.user.findUnique({ where: { id: userId }, select: { name: true, image: true } }),
    db.googleIntegrationSettings.findUnique({ where: { userId }, select: { calendarConnected: true, driveConnected: true } }),
    db.booking.count({ where: { studentId: userId, learningLanguage } }),
    db.chatThread.count({ where: { studentId: userId } }),
    db.userStudyLevelProgress.findFirst({ where: {
      userId, lastStudiedAt: { not: null }, level: { track: { learningLanguage, publicationStatus: "PUBLISHED" } },
    }, select: { id: true } }),
    isJapanese ? db.studyTrack.findUnique({ where: { slug: "japanese-flashcards", learningLanguage, publicationStatus: "PUBLISHED" }, select: { id: true } }) : null,
    isJapanese ? readJapanesePlacementRetake(db, userId) : null,
  ]);
  return {
    profile,
    canStartPlacement: isJapanese ? japaneseRetake!.canStartNewAttempt : isPlacementRetakeAllowed(profile?.placementCompletedAt ?? null),
    materialsAvailable: !isJapanese || Boolean(track),
    completion: computeStudentOnboardingCompletion({
      profileShortBio: profile?.shortBio ?? null, userName: user?.name ?? null, userImage: user?.image ?? null,
      googleCalendarConnected: google?.calendarConnected ?? false, googleDriveConnected: google?.driveConnected ?? false,
      hasAnyBooking: bookings > 0, hasAnyChatThread: threads > 0,
      placementCompletedAt: isJapanese ? japaneseRetake!.completedAt : profile?.placementCompletedAt ?? null,
      hasStudiedAny: Boolean(studied),
    }, { skippedSteps: profile?.skippedOnboardingSteps ?? [] }),
  };
}
