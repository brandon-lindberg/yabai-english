import { DateTime } from "luxon";
import { prisma } from "./prisma";
import { createUserNotification } from "./notifications";
import { lessonProductNames } from "./lesson-product-catalog";

type Input = {
  bookingId: string;
  event: "cancelled" | "reschedule_requested" | "rescheduled" | "refund";
  previousStartsAt?: Date;
  startsAt?: Date;
  transitionId?: string;
  refund?: { id: string; status: string; amountYen: number };
};

/** Both participants receive the same event, expressed in their own timezone. */
export async function notifyPrivateBookingEvent(input: Input) {
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId }, select: {
    id: true, studentId: true, learningLanguage: true, startsAt: true, groupLessonSessionId: true,
    lessonProduct: { select: { tier: true, nameJa: true, nameEn: true, durationMin: true } },
    student: { select: { studentProfile: { select: { timezone: true } } } },
    teacher: { select: { userId: true, availabilitySlots: { where: { active: true }, take: 1, select: { timezone: true } } } },
  } });
  if (!booking || booking.groupLessonSessionId) return;
  const names = lessonProductNames(booking.lessonProduct, booking.learningLanguage);
  const refund = input.refund;
  if (input.event === "refund" && !refund) return;
  const at = input.startsAt ?? booking.startsAt;
  const eventKey = ["booking", booking.id, input.event, input.previousStartsAt?.toISOString() ?? "",
    at.toISOString(), refund?.id ?? "", refund?.status ?? "", input.transitionId ?? ""].join(":");
  const recipients = [
    { userId: booking.studentId, timezone: booking.student?.studentProfile?.timezone ?? "Asia/Tokyo" },
    { userId: booking.teacher.userId, timezone: booking.teacher.availabilitySlots[0]?.timezone ?? "Asia/Tokyo" },
  ];
  await Promise.all(recipients.map(async ({ userId, timezone }) => {
    const date = (value: Date, locale: "en" | "ja") => {
      const local = DateTime.fromJSDate(value, { zone: "utc" }).setZone(timezone).setLocale(locale);
      return `${local.toFormat(locale === "ja" ? "yyyy/LL/dd HH:mm" : "LLL d, yyyy HH:mm")} (${local.offsetNameShort ?? timezone})`;
    };
    let titleEn: string, titleJa: string, bodyEn: string, bodyJa: string;
    if (input.event === "refund" && refund) {
      const amount = `¥${refund.amountYen.toLocaleString("en-US")}`;
      const succeeded = refund.status === "SUCCEEDED";
      titleEn = succeeded ? "Lesson refunded" : "Lesson refund pending";
      titleJa = succeeded ? "レッスンの返金が完了しました" : "レッスンの返金は未完了です";
      bodyEn = succeeded ? `${amount} has been refunded for your ${names.nameEn} lesson. It will appear through ${userId === booking.studentId ? "your" : "the student's"} original payment method.`
        : `The ${amount} refund for your ${names.nameEn} lesson has not completed yet. Your cancellation is saved.`;
      bodyJa = succeeded ? `${names.nameJa} の ${amount} の返金が完了しました。${userId === booking.studentId ? "元のお支払い方法" : "受講生の元のお支払い方法"}に反映されます。`
        : `${names.nameJa} の ${amount} の返金はまだ完了していません。キャンセルは保存されています。`;
    } else if (input.event === "cancelled") {
      titleEn = "Lesson cancelled"; titleJa = "レッスンがキャンセルされました";
      bodyEn = `Your ${names.nameEn} lesson on ${date(at, "en")} was cancelled.`;
      bodyJa = `${date(at, "ja")} の ${names.nameJa} はキャンセルされました。`;
    } else if (input.event === "reschedule_requested") {
      titleEn = "Lesson reschedule requested"; titleJa = "レッスンの時間変更がリクエストされました";
      bodyEn = `A request to move your ${names.nameEn} lesson to ${date(at, "en")} was received. The new time is not confirmed by this notice.`;
      bodyJa = `${names.nameJa} を ${date(at, "ja")} に変更するリクエストを受け付けました。この通知だけでは時間変更は確定しません。`;
    } else {
      titleEn = "Lesson rescheduled"; titleJa = "レッスンの時間が変更されました";
      bodyEn = `Your ${names.nameEn} lesson was moved${input.previousStartsAt ? ` from ${date(input.previousStartsAt, "en")}` : ""} to ${date(at, "en")}. Your payment stays with this booking.`;
      bodyJa = `${names.nameJa} は${input.previousStartsAt ? ` ${date(input.previousStartsAt, "ja")} から` : ""} ${date(at, "ja")} に変更されました。お支払いはこの予約に引き継がれます。`;
    }
    await createUserNotification({ userId, titleEn, titleJa, bodyEn, bodyJa,
      href: input.event === "refund" ? "/dashboard/schedule/refunded" : "/dashboard/schedule", deduplicationKey: eventKey });
  }));
}
