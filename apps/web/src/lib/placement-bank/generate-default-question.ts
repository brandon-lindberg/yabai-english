import type { PlacementBankFile } from "@/lib/placement-bank/schema";
import type { PlacementBankBand, PlacementBankSection } from "@/lib/placement-bank/constants";

const WEIGHT: Record<PlacementBankBand, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
};

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!;
}

function buildOptionsEnJa(
  correctEn: string,
  correctJa: string,
  wrongEn: readonly string[],
  wrongJa: readonly string[],
  seed: number,
): Pick<PlacementBankFile, "optionsEn" | "optionsJa" | "correctIndex"> {
  const wEn = wrongEn.filter((w) => w !== correctEn);
  const wJa = wrongJa.filter((w) => w !== correctJa);
  const e1 = pick(wEn, seed);
  const e2 = pick(wEn, seed + 3);
  const j1 = pick(wJa, seed + 5);
  const j2 = pick(wJa, seed + 11);
  const optionsEn = [correctEn, e1, e2];
  const optionsJa = [correctJa, j1, j2];
  const order = [0, 1, 2].sort((a, b) => ((seed + a * 5) % 3) - ((seed + b * 5) % 3));
  const permutedEn = order.map((i) => optionsEn[i]!);
  const permutedJa = order.map((i) => optionsJa[i]!);
  const correctIndex = order.indexOf(0);
  return { optionsEn: permutedEn, optionsJa: permutedJa, correctIndex };
}

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

/** Appended so no two bank rows share the same surface EN/JA (adaptive runs can mix many items). */
function uniqueItemTag(band: PlacementBankBand, section: PlacementBankSection, index: number) {
  return ` — ${band}-${section}-${pad3(index)}`;
}

function grammarDefault(
  band: PlacementBankBand,
  section: PlacementBankSection,
  seq: number,
  id: string,
  index: number,
): PlacementBankFile {
  const weight = WEIGHT[band];
  const subjects = ["I", "You", "We", "They", "She", "He"] as const;
  const s = pick(subjects, seq);
  const n = seq + band.charCodeAt(0);

  if (band === "A1") {
    const be = s === "I" ? "am" : s === "He" || s === "She" ? "is" : "are";
    const wrongBe = s === "I" ? ["is", "are"] : s === "He" || s === "She" ? ["are", "am"] : ["is", "am"];
    const mood = pick(["happy", "tired", "ready", "busy", "here"], seq);
    const tag = uniqueItemTag(band, section, index);
    const promptEn = `Choose the best option: "${s} ___ ${mood} today."${tag}`;
    const promptJa = `空所に入る語を選んでください: "${s} ___ ${mood} today."${tag}`;
    const opts = buildOptionsEnJa(be, be, wrongBe, wrongBe, n);
    return { id, weight, section: "grammar", cefrBand: band, promptEn, promptJa, ...opts };
  }

  if (band === "A2") {
    const v = pick(["visit", "call", "finish", "start", "watch", "clean"], seq);
    const correct = `${v}ed`;
    const wrong = [`${v}s`, `have ${v}ed`];
    const tag = uniqueItemTag(band, section, index);
    const promptEn = `Choose the best option: "Yesterday we ___ our manager after lunch."${tag}`;
    const promptJa = `空所に入る語を選んでください: "Yesterday we ___ our manager after lunch."${tag}`;
    const opts = buildOptionsEnJa(correct, correct, wrong, wrong, n);
    return { id, weight, section: "grammar", cefrBand: band, promptEn, promptJa, ...opts };
  }

  if (band === "B1") {
    const correct = "rains";
    const wrong = ["will rain", "rained"];
    const day = pick(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], seq);
    const tag = uniqueItemTag(band, section, index);
    const promptEn = `Choose the best option: "If it ___ on ${day}, we will cancel the outdoor session."${tag}`;
    const promptJa = `条件文の空所: "If it ___ on ${day}, we will cancel the outdoor session."${tag}`;
    const opts = buildOptionsEnJa(correct, correct, wrong, wrong, n);
    return { id, weight, section: "grammar", cefrBand: band, promptEn, promptJa, ...opts };
  }

  if (band === "B2") {
    const correct = "had the report been submitted";
    const wrong = ["the report had been submitted", "was the report submitted"];
    const tag = uniqueItemTag(band, section, index);
    const promptEn = `Choose the best option: "___ before the deadline, the team could relax."${tag}`;
    const promptJa = `倒置を含む文の空所を選んでください。${tag}`;
    const opts = buildOptionsEnJa(correct, correct, wrong, wrong, n);
    return { id, weight, section: "grammar", cefrBand: band, promptEn, promptJa, ...opts };
  }

  const correct = "were I in your position";
  const wrong = ["if I would be in your position", "was I in your position"];
  const tag = uniqueItemTag(band, section, index);
  const consequents = [
    "I would delay the announcement.",
    "I would reject that timeline.",
    "I would ask for an independent review.",
    "I would not sign without legal counsel.",
    "I would pause the rollout immediately.",
    "I would escalate this to the board.",
    "I would insist on clearer metrics.",
    "I would walk away from that deal.",
  ];
  const tail = consequents[(index - 1) % consequents.length]!;
  const promptEn = `Choose the best option: "___ , ${tail}"${tag}`;
  const promptJa = `仮定法の自然な形を選んでください（文脈 ${index}）。${tag}`;
  const opts = buildOptionsEnJa(correct, correct, wrong, wrong, n);
  return { id, weight, section: "grammar", cefrBand: band, promptEn, promptJa, ...opts };
}

const VOCAB_SETS: Record<
  PlacementBankBand,
  { en: string; ja: string; correct: string; cj: string; wrongEn: string[]; wrongJa: string[] }[]
> = {
  A1: [
    { en: "inexpensive", ja: "安い", correct: "cheap", cj: "安い", wrongEn: ["heavy", "loud"], wrongJa: ["重い", "うるさい"] },
    { en: "small", ja: "小さい", correct: "tiny", cj: "とても小さい", wrongEn: ["wide", "tall"], wrongJa: ["広い", "高い"] },
    { en: "fast", ja: "速い", correct: "quick", cj: "素早い", wrongEn: ["slow", "late"], wrongJa: ["遅い", "遅刻の"] },
    { en: "happy", ja: "幸せな", correct: "glad", cj: "うれしい", wrongEn: ["angry", "sad"], wrongJa: ["怒った", "悲しい"] },
    { en: "easy", ja: "簡単な", correct: "simple", cj: "単純な", wrongEn: ["hard", "rare"], wrongJa: ["難しい", "珍しい"] },
  ],
  A2: [
    { en: "reserve (a table)", ja: "予約する", correct: "book", cj: "予約する", wrongEn: ["borrow", "cancel"], wrongJa: ["借りる", "キャンセルする"] },
    { en: "arrive", ja: "到着する", correct: "get here", cj: "着く", wrongEn: ["leave", "wait"], wrongJa: ["出発する", "待つ"] },
    { en: "maybe", ja: "たぶん", correct: "perhaps", cj: "かもしれない", wrongEn: ["never", "always"], wrongJa: ["決して", "いつも"] },
    { en: "often", ja: "よく", correct: "frequently", cj: "頻繁に", wrongEn: ["rarely", "once"], wrongJa: ["めったに", "一度"] },
    { en: "important", ja: "重要な", correct: "main", cj: "主な", wrongEn: ["minor", "optional"], wrongJa: ["些細な", "任意の"] },
  ],
  B1: [
    { en: "affect (verb)", ja: "影響する", correct: "affect", cj: "影響する", wrongEn: ["effect", "infect"], wrongJa: ["名詞の効果", "感染する"] },
    { en: "rise (past)", ja: "上がった", correct: "rose", cj: "上がった", wrongEn: ["raised", "risen"], wrongJa: ["他動詞で上げた", "過分詞"] },
    { en: "advice", ja: "助言", correct: "a suggestion", cj: "提案", wrongEn: ["advices", "an advise"], wrongJa: ["誤用複数", "誤用名詞"] },
    { en: "economic", ja: "経済の", correct: "relating to the economy", cj: "経済に関する", wrongEn: ["economical", "economy"], wrongJa: ["倹約の", "経済"] },
    { en: "compliment", ja: "褒める言葉", correct: "praise", cj: "称賛", wrongEn: ["complement", "competition"], wrongJa: ["補完", "競争"] },
  ],
  B2: [
    { en: "constraints", ja: "制約", correct: "limitations", cj: "制限", wrongEn: ["benefits", "guarantees"], wrongJa: ["利益", "保証"] },
    { en: "mitigate", ja: "緩和する", correct: "reduce the severity of", cj: "深刻さを減らす", wrongEn: ["ignore", "increase"], wrongJa: ["無視する", "増やす"] },
    { en: "pragmatic", ja: "実用的な", correct: "practical", cj: "現実的な", wrongEn: ["idealistic", "random"], wrongJa: ["理想主義の", "無作為の"] },
    { en: "coherent", ja: "一貫した", correct: "consistent", cj: "矛盾のない", wrongEn: ["chaotic", "vague"], wrongJa: ["混沌とした", "曖昧な"] },
    { en: "implicit", ja: "暗黙の", correct: "unstated", cj: "明言されていない", wrongEn: ["explicit", "illegal"], wrongJa: ["明示の", "違法の"] },
  ],
  C1: [
    { en: "ambiguous", ja: "曖昧な", correct: "unclear", cj: "不明確な", wrongEn: ["redundant", "obsolete"], wrongJa: ["冗長な", "時代遅れの"] },
    { en: "nuanced", ja: "ニュアンスのある", correct: "subtle", cj: "微妙な", wrongEn: ["blunt", "obvious"], wrongJa: ["単刀直入の", "明白な"] },
    { en: "tenuous", ja: "薄い（根拠など）", correct: "weak", cj: "弱い", wrongEn: ["strong", "proven"], wrongJa: ["強い", "証明済み"] },
    { en: "ubiquitous", ja: "至る所にある", correct: "everywhere", cj: "どこにでも", wrongEn: ["rare", "hidden"], wrongJa: ["珍しい", "隠れた"] },
    { en: "salient", ja: "顕著な", correct: "notable", cj: "注目すべき", wrongEn: ["hidden", "minor"], wrongJa: ["隠れた", "副次的な"] },
  ],
};

function vocabularyDefault(
  band: PlacementBankBand,
  section: PlacementBankSection,
  seq: number,
  id: string,
  index: number,
): PlacementBankFile {
  const weight = WEIGHT[band];
  const sets = VOCAB_SETS[band];
  const slot = index - 1;
  const set = pick(sets, slot);
  const n = seq * 13 + band.length;
  const tag = uniqueItemTag(band, section, index);
  // 100 slots per band share a short gloss list; disambiguate repeats for the bank + tests.
  const glossEn = slot < sets.length ? set.en : `${set.en} (set ${index})`;
  const glossJa = slot < sets.length ? set.ja : `${set.ja}（セット ${index}）`;
  const promptEn = `Choose the word or phrase closest in meaning to "${glossEn}".${tag}`;
  const promptJa = `「${glossJa}」に最も近い語句を選んでください。${tag}`;
  const opts = buildOptionsEnJa(set.correct, set.cj, set.wrongEn, set.wrongJa, n);
  return { id, weight, section: "vocabulary", cefrBand: band, promptEn, promptJa, ...opts };
}

function readingDefault(
  band: PlacementBankBand,
  section: PlacementBankSection,
  seq: number,
  id: string,
  index: number,
): PlacementBankFile {
  const weight = WEIGHT[band];
  const n = seq + 100;
  const tag = uniqueItemTag(band, section, index);

  if (band === "A1") {
    const open = 10 + (seq % 6);
    const close = open + 8 + (seq % 3);
    const promptEn = `Read: "The shop opens at ${open}:00 and closes at ${close}:00." What time does it close?${tag}`;
    const promptJa = `読解: 開店${open}時、閉店は何時？${tag}`;
    const correct = `${close}:00`;
    const opts = buildOptionsEnJa(
      correct,
      correct,
      [`${close - 1}:00`, `${close + 1}:00`],
      [`${close - 1}:00`, `${close + 1}:00`],
      n,
    );
    return { id, weight, section: "reading", cefrBand: band, promptEn, promptJa, ...opts };
  }

  if (band === "A2") {
    const hour = 3 + (seq % 5);
    const promptEn = `Read: "Please send the invoice by Monday ${hour} p.m." When is the deadline?${tag}`;
    const promptJa = `読解: "月曜${hour}時までに請求書を" 締切は？${tag}`;
    const correct = `Monday ${hour} p.m.`;
    const opts = buildOptionsEnJa(
      correct,
      `月曜${hour}時`,
      ["Tuesday noon", "Friday 5 p.m."],
      ["火曜正午", "金曜17時"],
      n,
    );
    return { id, weight, section: "reading", cefrBand: band, promptEn, promptJa, ...opts };
  }

  if (band === "B1") {
    const pct = 6 + (seq % 8);
    const promptEn = `Text: "Sales rose ${pct}%, mostly from repeat customers." What mainly drove sales?${tag}`;
    const promptJa = `文章: 売上${pct}%増、主因は？${tag}`;
    const opts = buildOptionsEnJa(
      "Repeat customers",
      "リピート顧客",
      ["New ads", "Lower prices"],
      ["新規広告", "値下げ"],
      n,
    );
    return { id, weight, section: "reading", cefrBand: band, promptEn, promptJa, ...opts };
  }

  if (band === "B2") {
    const promptEn = `Text: "The guidance is influential though not legally binding (case ${seq + 1})." Which is true?${tag}`;
    const promptJa = `文章: 指針は法的拘束力はないが影響大（ケース${seq + 1}）。正しいのは？${tag}`;
    const opts = buildOptionsEnJa(
      "Not binding but influential",
      "拘束力はないが影響は大きい",
      ["Legally binding", "Irrelevant"],
      ["法的に拘束", "無関係"],
      n,
    );
    return { id, weight, section: "reading", cefrBand: band, promptEn, promptJa, ...opts };
  }

  const passagesEn = [
    `Public praise contrasted with uneven implementation (passage ${index}).`,
    `Early metrics looked strong, but field teams reported conflicting priorities (passage ${index}).`,
    `Stakeholders celebrated milestones while audits flagged gaps in documentation (passage ${index}).`,
    `Customer sentiment improved, yet churn rose in two regions (passage ${index}).`,
    `Leadership emphasized speed, but compliance reviews slowed several launches (passage ${index}).`,
    `Pilot sites exceeded targets; the national rollout missed staffing assumptions (passage ${index}).`,
    `Funding continued, though several partners quietly reduced their commitments (passage ${index}).`,
    `The narrative focused on innovation; operations teams cited technical debt (passage ${index}).`,
  ];
  const passagesJa = [
    `公的称賛と実施のギャップ（短文${index}）。`,
    `初期指標は良好だが現場の優先度が食い違う（短文${index}）。`,
    `マイルストーンは祝われたが監査で文書不備（短文${index}）。`,
    `顧客満度は上がったが2地域で解約増（短文${index}）。`,
    `スピード重視とコンプラ審査の遅れ（短文${index}）。`,
    `パイロットは好調、全国展開は人員想定外れ（短文${index}）。`,
    `資金は継続もパートナーが静かに縮小（短文${index}）。`,
    `イノベーションが話題、運用は技術的負債を指摘（短文${index}）。`,
  ];
  const pi = (index - 1) % passagesEn.length;
  const bodyEn = passagesEn[pi]!;
  const bodyJa = passagesJa[pi]!;
  const promptEn = `Text: "${bodyEn}" Which inference is best?${tag}`;
  const promptJa = `文章: ${bodyJa} 最も妥当な推論は？${tag}`;
  const opts = buildOptionsEnJa(
    "Internal outcomes differed by region",
    "地域ごとに実施状況が異なった",
    ["It succeeded everywhere equally", "The program ended"],
    ["全地域で同程度に成功", "施策は終了済み"],
    n,
  );
  return { id, weight, section: "reading", cefrBand: band, promptEn, promptJa, ...opts };
}

function functionalDefault(
  band: PlacementBankBand,
  section: PlacementBankSection,
  seq: number,
  id: string,
  index: number,
): PlacementBankFile {
  const weight = WEIGHT[band];
  const n = seq * 17 + 3;
  const tag = uniqueItemTag(band, section, index);

  if (band === "A1") {
    const correct = "How much is this, please?";
    const promptEn = `Which is the most polite way to ask the price in a store (situation ${index})?${tag}`;
    const promptJa = `店で値段を丁寧に聞く表現として最も自然なのは？（場面 ${index}）${tag}`;
    const opts = buildOptionsEnJa(correct, correct, ["Price?", "Tell me price."], ["値段？", "言って。"], n);
    return { id, weight, section: "functional", cefrBand: band, promptEn, promptJa, ...opts };
  }

  if (band === "A2") {
    const correct = "Sorry, I'm running five minutes late.";
    // Avoid 5 minutes on generated rows so curated pb-A2-functional-001 ("5 minutes") stays unique.
    const minutes = 6 + ((index * 2 - 2) % 20);
    const meetingContextsEn = [
      "a client call",
      "a team stand-up",
      "an internal review meeting",
      "a project kickoff",
      "a 1:1 with your manager",
      "a cross-team sync",
      "a vendor negotiation",
      "a training workshop",
    ];
    const meetingContextsJa = [
      "顧客との電話",
      "チームのスタンドアップ",
      "社内レビュー",
      "キックオフ",
      "上司との1on1",
      "横断ミーティング",
      "ベンダー交渉",
      "研修",
    ];
    const ci = (index - 1) % meetingContextsEn.length;
    const ctxEn = meetingContextsEn[ci]!;
    const ctxJa = meetingContextsJa[ci]!;
    const promptEn = `Which message is most appropriate if you will be ${minutes} minutes late to ${ctxEn}?${tag}`;
    const promptJa = `「${ctxJa}」に${minutes}分遅れる連絡として最も適切なのは？${tag}`;
    const opts = buildOptionsEnJa(correct, correct, ["Late me.", "You start."], ["遅れた。", "先に始めて。"], n);
    return { id, weight, section: "functional", cefrBand: band, promptEn, promptJa, ...opts };
  }

  if (band === "B1") {
    const correct = "I see your point, but I have a different view.";
    const promptEn = `Which is the most appropriate way to disagree politely in a meeting (case ${index})?${tag}`;
    const promptJa = `会議で丁寧に意見に反対する表現として最も適切なのは？（ケース ${index}）${tag}`;
    const opts = buildOptionsEnJa(correct, correct, ["You're wrong.", "No way."], ["間違い。", "無理。"], n);
    return { id, weight, section: "functional", cefrBand: band, promptEn, promptJa, ...opts };
  }

  if (band === "B2") {
    const correct = "We can extend support, provided timelines align.";
    const promptEn = `Which sentence best shows concession plus condition in negotiation (scenario ${index})?${tag}`;
    const promptJa = `交渉で譲歩しつつ条件を示す文として最も適切なのは？（シナリオ ${index}）${tag}`;
    const opts = buildOptionsEnJa(correct, correct, ["Discount now.", "No deal."], ["今すぐ値引き。", "取引なし。"], n);
    return { id, weight, section: "functional", cefrBand: band, promptEn, promptJa, ...opts };
  }

  const correct =
    "I understand the inconvenience. I'll investigate and update you by 3 p.m. with next steps.";
  const complaintAnglesEn = [
    "about a billing error on the last invoice",
    "about a shipment that arrived two weeks late",
    "about losing access to a paid feature after renewal",
    "about rude treatment from a support agent",
    "about a refund that still has not been processed",
    "about a product that broke within a week",
    "about conflicting answers from different agents",
    "about a subscription that renewed without notice",
  ];
  const complaintAnglesJa = [
    "直近の請求書の誤請求",
    "配送が2週間遅れた件",
    "更新後に有料機能に入れなくなった件",
    "サポート担当の態度が悪かった件",
    "返金がまだ処理されていない件",
    "購入後1週間以内に製品が壊れた件",
    "担当者ごとに回答が食い違う件",
    "通知なくサブスクが更新された件",
  ];
  const ai = (index - 1) % complaintAnglesEn.length;
  const angleEn = complaintAnglesEn[ai]!;
  const angleJa = complaintAnglesJa[ai]!;
  const promptEn = `Choose the most appropriate response to a customer complaint ${angleEn}.${tag}`;
  const promptJa = `次の苦情（${angleJa}）に対する返信として最も適切な文を選んでください。${tag}`;
  const opts = buildOptionsEnJa(correct, correct, ["Not our fault.", "Calm down."], ["こちらのせいでは。", "落ち着いて。"], n);
  return { id, weight, section: "functional", cefrBand: band, promptEn, promptJa, ...opts };
}

/**
 * Default JSON payload for one slot (used by scaffold). `index` is 1–100 and matches filename NNN.
 */
export function generateDefaultPlacementQuestion(
  band: PlacementBankBand,
  section: PlacementBankSection,
  index: number,
): PlacementBankFile {
  const seq = index - 1;
  const id = `pb-${band}-${section}-${pad3(index)}`;
  switch (section) {
    case "grammar":
      return grammarDefault(band, section, seq, id, index);
    case "vocabulary":
      return vocabularyDefault(band, section, seq, id, index);
    case "reading":
      return readingDefault(band, section, seq, id, index);
    case "functional":
      return functionalDefault(band, section, seq, id, index);
  }
}
