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
    const opts = buildOptionsEnJa(be, be, wrongBe, wrongBe, n);
    return {
      id,
      weight,
      section: "grammar",
      cefrBand: band,
      instructionEn: "Choose the best option.",
      instructionJa: "空所に入る語を選んでください。",
      questionEn: `"${s} ___ ${mood} today."`,
      questionJa: `"${s} ___ ${mood} today."`,
      ...opts,
    };
  }

  if (band === "A2") {
    const v = pick(["visit", "call", "finish", "start", "watch", "clean"], seq);
    const correct = `${v}ed`;
    const wrong = [`${v}s`, `have ${v}ed`];
    const opts = buildOptionsEnJa(correct, correct, wrong, wrong, n);
    return {
      id,
      weight,
      section: "grammar",
      cefrBand: band,
      instructionEn: "Choose the best option.",
      instructionJa: "空所に入る語を選んでください。",
      questionEn: `"Yesterday we ___ our manager after lunch."`,
      questionJa: `"Yesterday we ___ our manager after lunch."`,
      ...opts,
    };
  }

  if (band === "B1") {
    const correct = "rains";
    const wrong = ["will rain", "rained"];
    const day = pick(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], seq);
    const opts = buildOptionsEnJa(correct, correct, wrong, wrong, n);
    return {
      id,
      weight,
      section: "grammar",
      cefrBand: band,
      instructionEn: "Choose the best option for the conditional.",
      instructionJa: "条件文の空所に入る語を選んでください。",
      questionEn: `"If it ___ on ${day}, we will cancel the outdoor session."`,
      questionJa: `"If it ___ on ${day}, we will cancel the outdoor session."`,
      ...opts,
    };
  }

  if (band === "B2") {
    const correct = "had the report been submitted";
    const wrong = ["the report had been submitted", "was the report submitted"];
    const opts = buildOptionsEnJa(correct, correct, wrong, wrong, n);
    return {
      id,
      weight,
      section: "grammar",
      cefrBand: band,
      instructionEn: "Choose the best option.",
      instructionJa: "倒置を含む文の空所を選んでください。",
      questionEn: `"___ before the deadline, the team could relax."`,
      questionJa: `"___ before the deadline, the team could relax."`,
      ...opts,
    };
  }

  const correct = "were I in your position";
  const wrong = ["if I would be in your position", "was I in your position"];
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
  const opts = buildOptionsEnJa(correct, correct, wrong, wrong, n);
  return {
    id,
    weight,
    section: "grammar",
    cefrBand: band,
    instructionEn: "Choose the best option.",
    instructionJa: `仮定法の自然な形を選んでください（文脈 ${index}）。`,
    questionEn: `"___ , ${tail}"`,
    questionJa: `"___ , ${tail}"`,
    ...opts,
  };
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
  const glossEn = slot < sets.length ? set.en : `${set.en} (set ${index})`;
  const glossJa = slot < sets.length ? set.ja : `${set.ja}（セット ${index}）`;
  const opts = buildOptionsEnJa(set.correct, set.cj, set.wrongEn, set.wrongJa, n);
  return {
    id,
    weight,
    section: "vocabulary",
    cefrBand: band,
    instructionEn: "Choose the word or phrase closest in meaning to the following.",
    instructionJa: "次の語句の意味に最も近い英語を選んでください。",
    questionEn: `"${glossEn}"`,
    questionJa: `「${glossJa}」`,
    ...opts,
  };
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

  if (band === "A1") {
    const open = 10 + (seq % 6);
    const close = open + 8 + (seq % 3);
    const correct = `${close}:00`;
    const opts = buildOptionsEnJa(
      correct,
      correct,
      [`${close - 1}:00`, `${close + 1}:00`],
      [`${close - 1}:00`, `${close + 1}:00`],
      n,
    );
    return {
      id,
      weight,
      section: "reading",
      cefrBand: band,
      instructionEn: "Read the passage, then answer the question.",
      instructionJa: "英文を読んで、質問に答えてください。",
      questionEn: `"The shop opens at ${open}:00 and closes at ${close}:00." What time does it close?`,
      questionJa: `開店${open}時、閉店は何時ですか？`,
      ...opts,
    };
  }

  if (band === "A2") {
    const hour = 3 + (seq % 5);
    const opts = buildOptionsEnJa(
      `Monday ${hour} p.m.`,
      `月曜${hour}時`,
      ["Tuesday noon", "Friday 5 p.m."],
      ["火曜正午", "金曜17時"],
      n,
    );
    return {
      id,
      weight,
      section: "reading",
      cefrBand: band,
      instructionEn: "Read the passage, then answer the question.",
      instructionJa: "英文を読んで、質問に答えてください。",
      questionEn: `"Please send the invoice by Monday ${hour} p.m." When is the deadline?`,
      questionJa: `"月曜${hour}時までに請求書を送ってください。" 締切はいつですか？`,
      ...opts,
    };
  }

  if (band === "B1") {
    const pct = 6 + (seq % 8);
    const opts = buildOptionsEnJa(
      "Repeat customers",
      "リピート顧客",
      ["New ads", "Lower prices"],
      ["新規広告", "値下げ"],
      n,
    );
    return {
      id,
      weight,
      section: "reading",
      cefrBand: band,
      instructionEn: "Read the passage, then answer the question.",
      instructionJa: "文章を読んで、質問に答えてください。",
      questionEn: `"Sales rose ${pct}%, mostly from repeat customers." What mainly drove sales?`,
      questionJa: `売上が${pct}%増えましたが、主な要因は何でしたか？`,
      ...opts,
    };
  }

  if (band === "B2") {
    const opts = buildOptionsEnJa(
      "Not binding but influential",
      "拘束力はないが影響は大きい",
      ["Legally binding", "Irrelevant"],
      ["法的に拘束", "無関係"],
      n,
    );
    return {
      id,
      weight,
      section: "reading",
      cefrBand: band,
      instructionEn: "Read the passage, then answer the question.",
      instructionJa: "文章を読んで、質問に答えてください。",
      questionEn: `"The guidance is influential though not legally binding (case ${seq + 1})." Which is true?`,
      questionJa: `指針は法的拘束力はないが影響大（ケース${seq + 1}）。正しいのはどれですか？`,
      ...opts,
    };
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
  const opts = buildOptionsEnJa(
    "Internal outcomes differed by region",
    "地域ごとに実施状況が異なった",
    ["It succeeded everywhere equally", "The program ended"],
    ["全地域で同程度に成功", "施策は終了済み"],
    n,
  );
  return {
    id,
    weight,
    section: "reading",
    cefrBand: band,
    instructionEn: "Read the passage, then answer the question.",
    instructionJa: "文章を読んで、質問に答えてください。",
    questionEn: `"${bodyEn}" Which inference is best?`,
    questionJa: `${bodyJa} 最も妥当な推論はどれですか？`,
    ...opts,
  };
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

  if (band === "A1") {
    const correct = "How much is this, please?";
    const opts = buildOptionsEnJa(correct, correct, ["Price?", "Tell me price."], ["値段？", "言って。"], n);
    return {
      id,
      weight,
      section: "functional",
      cefrBand: band,
      instructionEn: "Choose the most appropriate option.",
      instructionJa: "最も適切な表現を選んでください。",
      questionEn: `Which is the most polite way to ask the price in a store (situation ${index})?`,
      questionJa: `店で値段を丁寧に聞く表現として最も自然なのは？（場面 ${index}）`,
      ...opts,
    };
  }

  if (band === "A2") {
    const correct = "Sorry, I'm running five minutes late.";
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
    const opts = buildOptionsEnJa(correct, correct, ["Late me.", "You start."], ["遅れた。", "先に始めて。"], n);
    return {
      id,
      weight,
      section: "functional",
      cefrBand: band,
      instructionEn: "Choose the most appropriate option.",
      instructionJa: "最も適切な表現を選んでください。",
      questionEn: `Which message is most appropriate if you will be ${minutes} minutes late to ${ctxEn}?`,
      questionJa: `「${ctxJa}」に${minutes}分遅れる連絡として最も適切なのは？`,
      ...opts,
    };
  }

  if (band === "B1") {
    const correct = "I see your point, but I have a different view.";
    const opts = buildOptionsEnJa(correct, correct, ["You're wrong.", "No way."], ["間違い。", "無理。"], n);
    return {
      id,
      weight,
      section: "functional",
      cefrBand: band,
      instructionEn: "Choose the most appropriate option.",
      instructionJa: "最も適切な表現を選んでください。",
      questionEn: `Which is the most appropriate way to disagree politely in a meeting (case ${index})?`,
      questionJa: `会議で丁寧に意見に反対する表現として最も適切なのは？（ケース ${index}）`,
      ...opts,
    };
  }

  if (band === "B2") {
    const correct = "We can extend support, provided timelines align.";
    const opts = buildOptionsEnJa(correct, correct, ["Discount now.", "No deal."], ["今すぐ値引き。", "取引なし。"], n);
    return {
      id,
      weight,
      section: "functional",
      cefrBand: band,
      instructionEn: "Choose the most appropriate option.",
      instructionJa: "最も適切な表現を選んでください。",
      questionEn: `Which sentence best shows concession plus condition in negotiation (scenario ${index})?`,
      questionJa: `交渉で譲歩しつつ条件を示す文として最も適切なのは？（シナリオ ${index}）`,
      ...opts,
    };
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
  const opts = buildOptionsEnJa(correct, correct, ["Not our fault.", "Calm down."], ["こちらのせいでは。", "落ち着いて。"], n);
  return {
    id,
    weight,
    section: "functional",
    cefrBand: band,
    instructionEn: "Choose the most appropriate response to a customer complaint.",
    instructionJa: "顧客の苦情に対する返信として最も適切な文を選んでください。",
    questionEn: `The customer is complaining ${angleEn}. Which reply is best?`,
    questionJa: `次の内容の苦情: ${angleJa}。どの返信が最も適切ですか？`,
    ...opts,
  };
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
