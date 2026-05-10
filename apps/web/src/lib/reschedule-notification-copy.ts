export function marketplaceBookingRescheduledNotification(input: {
  lessonNameJa: string;
  lessonNameEn: string;
}): {
  titleJa: string;
  titleEn: string;
  bodyJa: string;
  bodyEn: string;
} {
  return {
    titleJa: "レッスン時間が変更されました",
    titleEn: "Your lesson time was updated",
    bodyJa: `${input.lessonNameJa} の開始時刻が講師により変更されました。ダッシュボードで新しい時間をご確認ください。`,
    bodyEn: `The start time for your ${input.lessonNameEn} lesson was changed by your teacher. Check your dashboard for the new schedule.`,
  };
}

export function schoolClassRescheduledNotification(input: {
  schoolName: string;
}): {
  titleJa: string;
  titleEn: string;
  bodyJa: string;
  bodyEn: string;
} {
  return {
    titleJa: "授業の時間が変更されました",
    titleEn: "Your class time was updated",
    bodyJa: `${input.schoolName} のクラス開始時刻が変更されました。スケジュールをご確認ください。`,
    bodyEn: `A class at ${input.schoolName} was rescheduled. Please check your schedule for the new time.`,
  };
}

export function schoolClassRescheduleRequestPendingForAdmins(input: {
  schoolName: string;
}): {
  titleJa: string;
  titleEn: string;
  bodyJa: string;
  bodyEn: string;
} {
  return {
    titleJa: "クラスの時間変更リクエスト",
    titleEn: "Class reschedule request",
    bodyJa: `${input.schoolName} の講師からクラス開始時刻の変更リクエストがあります。承認または却下してください。`,
    bodyEn: `A teacher submitted a new class time for ${input.schoolName}. Review the request to approve or reject it.`,
  };
}

export function schoolClassRescheduleRequestRejectedForTeacher(input: {
  schoolName: string;
  rejectReason?: string | null;
}): {
  titleJa: string;
  titleEn: string;
  bodyJa: string;
  bodyEn: string;
} {
  const reasonJa = input.rejectReason
    ? ` 理由: ${input.rejectReason}`
    : "";
  const reasonEn = input.rejectReason
    ? ` Reason: ${input.rejectReason}`
    : "";
  return {
    titleJa: "時間変更リクエストが却下されました",
    titleEn: "Your class reschedule request was declined",
    bodyJa: `${input.schoolName} の管理者が、提出したクラス時間の変更を却下しました。${reasonJa}`,
    bodyEn: `A school admin declined your proposed class time change at ${input.schoolName}.${reasonEn}`,
  };
}
