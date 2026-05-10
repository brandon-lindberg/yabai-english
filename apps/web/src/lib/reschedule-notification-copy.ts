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
