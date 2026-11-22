type TeachingEvidence = {
  completeProfile: boolean;
  firstBooking: boolean;
  classes: number;
  repeatLearner: boolean;
  lessonNotes?: boolean;
  studentReply?: boolean;
  twoTeachingDays?: boolean;
};

const teachingMilestones = [
  { id: "teach-profile", metric: "completeProfile", target: 1,
    title: ["Meet Your Teacher", "はじめまして、先生です"],
    caption: ["Your own corner of the studio.", "スタジオに、あなたの席ができました。"],
    rule: ["Complete your teacher profile.", "講師プロフィールを完成させる。"],
    details: ["Add a display name, a bio, and an instruction language.", "表示名、自己紹介、指導に使う言語を登録しましょう。"] },
  { id: "teach-booked", metric: "firstBooking", target: 1,
    title: ["You're Booked!", "はじめての予約"],
    caption: ["Someone circled your name on their calendar.", "カレンダーに、あなたとのレッスンが入りました。"],
    rule: ["Receive your first confirmed booking.", "初めての予約が確定する。"],
    details: ["Confirmed trial lessons count too.", "確定した体験レッスンも対象です。"] },
  { id: "teach-0001", metric: "classes", target: 1,
    title: ["Class Is In", "はじめての授業"],
    caption: ["The first bell is yours.", "最初のチャイムが鳴りました。"],
    rule: ["Teach your first class.", "初めての授業を終える。"] },
  { id: "teach-0005", metric: "classes", target: 5,
    title: ["Getting the Hang of It", "先生業も板についてきた"],
    caption: ["Things are starting to click.", "少しずつ、教えるリズムがつかめてきました。"],
    rule: ["Teach 5 classes.", "授業を5回終える。"] },
  { id: "teach-0025", metric: "classes", target: 25,
    title: ["A Familiar Face", "いつもの先生"],
    caption: ["The studio feels a little more like home.", "スタジオに、すっかりなじんできました。"],
    rule: ["Teach 25 classes.", "授業を25回終える。"] },
  { id: "teach-0050", metric: "classes", target: 50,
    title: ["Half a Century", "授業50回の節目"],
    caption: ["Fifty classes under your belt.", "積み重ねた授業が、ついに50回。"],
    rule: ["Teach 50 classes.", "授業を50回終える。"] },
  { id: "teach-0100", metric: "classes", target: 100,
    title: ["The Hundredth Bell", "100回目のチャイム"],
    caption: ["Ring it loud enough for the whole valley.", "谷の向こうまで、このチャイムを響かせよう。"],
    rule: ["Teach 100 classes.", "授業を100回終える。"] },
  { id: "teach-return", metric: "repeatLearner", target: 1,
    title: ["See You Again", "また会えましたね"],
    caption: ["Put the kettle on. A familiar face is back.", "お茶をいれましょう。おなじみの生徒さんが戻ってきました。"],
    rule: ["Teach the same student on two different days.", "同じ生徒に別の日に2回教える。"] },
  { id: "teach-hidden-notes", metric: "lessonNotes", target: 1, hidden: true,
    title: ["To Be Continued…", "つづきは次回"],
    caption: ["Leave a little something for the next chapter.", "次のレッスンにつながる、一言を。"],
    rule: ["Save your first lesson note after a class ends.", "授業のあとに、初めてレッスンノートを保存する。"] },
  { id: "teach-hidden-reply", metric: "studentReply", target: 1, hidden: true,
    title: ["The Fox Writes Back", "キツネ先生のお返事"],
    caption: ["A little reply goes a long way.", "短いお返事が、うれしい一歩に。"],
    rule: ["Reply to a student in a private lesson chat.", "個人レッスンのチャットで生徒に返信する。"] },
  { id: "teach-hidden-second-bell", metric: "twoTeachingDays", target: 1, hidden: true,
    title: ["Second Bell", "ふたつ目のチャイム"],
    caption: ["The bell rings again this week.", "今週、もう一度チャイムが鳴りました。"],
    rule: ["Teach on two different days in the same week.", "同じ週の別々の2日間に授業をする。"],
    details: ["Weeks run Monday to Sunday in Japan time.", "日本時間の月曜日から日曜日までを1週間とします。"] },
] as const;

const classDetails = [
  "Confirmed classes count after they end. Each group class counts once.",
  "確定した授業は終了後にカウントされます。グループ授業は1クラスにつき1回です。",
] as const;

export const teachingClassAwardLimit = Math.max(...teachingMilestones.filter(badge => badge.metric === "classes").map(badge => badge.target));
export const teachingHiddenAchievementCount = teachingMilestones.filter(badge => "hidden" in badge).length;

export function teachingCollection(evidence: TeachingEvidence) {
  return teachingMilestones.map(({ metric, target, ...card }) => {
    const value = Math.min(Number(evidence[metric] ?? false), target);
    return {
      ...card,
      hidden: "hidden" in card,
      details: "details" in card ? card.details : metric === "classes" ? classDetails : undefined,
      progress: { value, target },
      qualified: value >= target,
    };
  });
}
