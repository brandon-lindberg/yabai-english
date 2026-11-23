import "server-only";

export const hiddenLearnerCatalogue = [
  {
    id: "return-0014d", hidden: true,
    title: ["Where Have You Been?", "おかえり、待ってたよ"],
    rule: ["Back for more after 14 days away!", "14日以上休んで、学びにカムバック！"],
    caption: ["Your flashcards started a search party. Welcome back.", "カードたちが捜索隊を結成していました。おかえりなさい。"],
    details: ["After 14 full inactive days, complete a study day or finish a lesson on the day you return.",
      "丸14日以上休んだ後、復帰した日に違うカードを5枚復習するか、レッスンを1回受けましょう。"],
  },
  {
    id: "return-0090d", hidden: true,
    title: ["Somehow, You Returned", "伝説の帰還"],
    rule: ["Back for more after 90 days away!", "90日以上休んで、学びにカムバック！"],
    caption: ["The quest log was getting dusty. Your adventure continues.", "冒険の記録に、少しほこりが。続きのページを開こう。"],
    details: ["After 90 full inactive days, complete a study day or finish a lesson on the day you return.",
      "丸90日以上休んだ後、復帰した日に違うカードを5枚復習するか、レッスンを1回受けましょう。"],
  },
  {
    id: "irregular-0001", hidden: true,
    title: ["Consistently Inconsistent", "安定の気まぐれ"],
    rule: ["Ten study days. Three comebacks!", "学習日が10日、カムバックが3回！"],
    caption: ["Your timetable is abstract art. You still keep showing up.", "あなたの予定表は抽象画。それでも、ちゃんと戻ってくる。"],
    details: ["Spread 10 study days across at least 30 calendar days, with three study-day returns after at least three full inactive days each.",
      "30日以上の期間で学習日を10日達成しましょう。そのうち3日は、丸3日以上休んだ後の復帰日です。"],
  },
] as const;
