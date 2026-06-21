import { createUserNotification } from "@/lib/notifications";

type CalendarFailureInput = {
  teacherUserId: string;
  studentUserId: string;
  reason?: string | null;
};

export async function notifyBookingCalendarInviteFailure({
  teacherUserId,
  studentUserId,
  reason,
}: CalendarFailureInput) {
  const reasonText = reason ? ` Reason: ${reason}` : "";
  await Promise.all([
    createUserNotification({
      userId: teacherUserId,
      titleEn: "Calendar invite was not created",
      titleJa: "カレンダー招待を作成できませんでした",
      bodyEn:
        "Reconnect Google Calendar from Settings in the hamburger menu, then open the lesson and create the calendar invite again." +
        reasonText,
      bodyJa:
        "ハンバーガーメニューの設定から Google カレンダーを再連携し、レッスン詳細からカレンダー招待を再作成してください。" +
        (reason ? ` 理由: ${reason}` : ""),
    }),
    createUserNotification({
      userId: studentUserId,
      titleEn: "Calendar invite needs attention",
      titleJa: "カレンダー招待の確認が必要です",
      bodyEn:
        "The lesson is confirmed, but the teacher's Google Calendar invite was not created. Use Add to Google Calendar on the lesson card as a fallback.",
      bodyJa:
        "レッスンは確定していますが、講師側の Google カレンダー招待を作成できませんでした。必要に応じてレッスンカードの「Google カレンダーに追加」を使用してください。",
    }),
  ]);
}
