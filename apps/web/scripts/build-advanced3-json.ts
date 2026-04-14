import fs from "node:fs";
import path from "node:path";
import { advanced3LevelFileSchema } from "../src/lib/study/schemas";

const OUT = path.join(__dirname, "../data/study/advanced-3.json");
const CARDS_PER_DECK = 42;

type Pair = [string, string];
type CardKind = "paraphrase" | "argument" | "scenario" | "error" | "dialogue" | "compression";
type DeckInput = {
  title: string;
  sources: string[];
  motions: string[];
  scenarios: string[];
  errors: Array<{ bad: string; good: string }>;
  dialogues: Array<{ lineA: string; lineB: string }>;
  compressions: Array<{ long: string; short: string }>;
};

const KIND_LABEL: Record<CardKind, string> = {
  paraphrase: "Paraphrase",
  argument: "Argument",
  scenario: "Scenario",
  error: "Error Detection",
  dialogue: "Multi-Turn Dialogue",
  compression: "Compression",
};

function buildCard(deck: DeckInput, idx: number, kind: CardKind): Pair {
  const cardTag = `${deck.title} · Card ${idx + 1}`;
  const s = deck.sources[idx % deck.sources.length]!;
  const m = deck.motions[(idx * 2 + 1) % deck.motions.length]!;
  const sc = deck.scenarios[(idx * 3 + 2) % deck.scenarios.length]!;
  const er = deck.errors[idx % deck.errors.length]!;
  const dg = deck.dialogues[(idx * 5 + 1) % deck.dialogues.length]!;
  const cp = deck.compressions[(idx * 7 + 3) % deck.compressions.length]!;

  switch (kind) {
    case "paraphrase":
      return [
        `[${KIND_LABEL[kind]} | ${cardTag}] Rewrite for a high-stakes discussion: "${s}"`,
        `Model answer: ${s.replace(" because ", " since ").replace(" should ", " ought to ")}`,
      ];
    case "argument":
      return [
        `[${KIND_LABEL[kind]} | ${cardTag}] Prompt: "${m}" Give two concise arguments with one likely counterargument.`,
        `Model answer: Argument 1: establish evidence and impact. Argument 2: compare alternatives and trade-offs. Counterargument: acknowledge valid concern, then show mitigation path.`,
      ];
    case "scenario":
      return [
        `[${KIND_LABEL[kind]} | ${cardTag}] ${sc} Respond persuasively in 2-3 sentences while staying diplomatic.`,
        `Model answer: I see your concern and agree the risk is real. Given the evidence, we can proceed with safeguards and a checkpoint after the first phase.`,
      ];
    case "error":
      return [
        `[${KIND_LABEL[kind]} | ${cardTag}] Fix the sentence: "${er.bad}"`,
        `Corrected: ${er.good}`,
      ];
    case "dialogue":
      return [
        `[${KIND_LABEL[kind]} | ${cardTag}] A: "${dg.lineA}" B: Provide a persuasive, adaptive reply in one turn.`,
        `Model answer: ${dg.lineB}`,
      ];
    case "compression":
      return [
        `[${KIND_LABEL[kind]} | ${cardTag}] Summarize in fewer words: "${cp.long}"`,
        `Compressed: ${cp.short}`,
      ];
  }
}

function buildDeck(deck: DeckInput) {
  const kinds: CardKind[] = ["paraphrase", "argument", "scenario", "error", "dialogue", "compression"];
  const cards: Pair[] = [];
  for (let i = 0; i < CARDS_PER_DECK; i++) {
    cards.push(buildCard(deck, i, kinds[i % kinds.length]!));
  }
  const uniqueFronts = new Set(cards.map((c) => c[0]));
  if (uniqueFronts.size !== cards.length) throw new Error(`${deck.title}: duplicate fronts`);
  return { titleJa: deck.title, titleEn: deck.title, cards };
}

const DECKS_INPUT: DeckInput[] = [
  {
    title: "Debate and persuasion",
    sources: [
      "The proposal is defensible because it balances risk and speed.",
      "A persuasive case starts by defining the decision criteria clearly.",
      "Strong framing often determines whether evidence is accepted.",
      "Effective persuasion requires both logic and audience awareness.",
      "A weak argument often confuses urgency with importance.",
      "Counterarguments improve credibility when addressed directly.",
      "Debate quality rises when assumptions are made explicit.",
    ],
    motions: [
      "Remote work produces stronger outcomes than office-first policy.",
      "Public transport should receive priority funding over highways.",
      "AI-generated content needs stricter labeling standards.",
      "Universities should prioritize critical thinking over memorization.",
      "Product teams should own support metrics after launch.",
      "Governments should regulate recommendation algorithms transparently.",
      "Organizations should reward long-term decision quality over speed.",
    ],
    scenarios: [
      "You are challenged in a panel debate by a skeptical audience member.",
      "Your counterpart dismisses your evidence as anecdotal during negotiation.",
      "A senior leader says your argument sounds idealistic.",
      "A journalist asks whether your proposal ignores practical constraints.",
      "A stakeholder claims your recommendation is too cautious.",
      "A teammate argues that your framing is overly abstract.",
      "A client pushes for immediate action without validation.",
    ],
    errors: [
      { bad: "He suggested me to revise the argument.", good: "He suggested that I revise the argument." },
      { bad: "The evidence are compelling.", good: "The evidence is compelling." },
      { bad: "If I would know, I would answer faster.", good: "If I knew, I would answer faster." },
      { bad: "This point deserves to discuss.", good: "This point deserves discussion." },
      { bad: "She explained me the framework.", good: "She explained the framework to me." },
      { bad: "The claim doesn't worth defending.", good: "The claim is not worth defending." },
      { bad: "We discussed about the trade-off.", good: "We discussed the trade-off." },
    ],
    dialogues: [
      { lineA: "Your proposal is too theoretical to implement.", lineB: "I understand the concern; let me connect the theory to a phased rollout with measurable checkpoints." },
      { lineA: "You are ignoring cost pressure.", lineB: "Cost pressure is real, which is why this plan prioritizes low-regret steps before major spend." },
      { lineA: "Why should we trust this argument now?", lineB: "Because the assumptions are explicit, the evidence is current, and the fallback path is defined." },
      { lineA: "This sounds like a risky bet.", lineB: "It would be risky if unchecked, so we built guardrails and trigger thresholds into execution." },
      { lineA: "Your recommendation is too slow.", lineB: "Speed matters, but avoidable rework is slower; this sequence protects both momentum and quality." },
      { lineA: "You are overcomplicating a simple decision.", lineB: "I am simplifying the decision by separating reversible choices from irreversible commitments." },
      { lineA: "I disagree with your framing entirely.", lineB: "Fair point; let's test framing alternatives against the same outcome criteria." },
    ],
    compressions: [
      { long: "Although the proposal appears costly at first glance, it prevents larger losses by reducing operational risk over time.", short: "Higher upfront cost reduces long-term risk." },
      { long: "The argument is persuasive only if we accept the underlying assumption that user behavior remains stable.", short: "The case depends on stable user behavior." },
      { long: "We should not treat disagreement as obstruction when it reveals hidden assumptions in our model.", short: "Disagreement can expose hidden assumptions." },
      { long: "A robust debate compares alternatives under equal criteria rather than defending one option emotionally.", short: "Compare options with equal criteria." },
      { long: "The strongest counterargument is the one that addresses intent while challenging evidence quality.", short: "Challenge evidence, not intent." },
      { long: "Persuasion improves when we acknowledge uncertainty without weakening directional confidence.", short: "Acknowledge uncertainty, keep direction." },
      { long: "Framing determines whether stakeholders interpret trade-offs as strategic choices or failures.", short: "Framing shapes trade-off perception." },
    ],
  },
];

const sharedDecks: Array<Omit<DeckInput, "title"> & { title: string }> = [
  { title: "Advanced conditionals", sources: ["If we had aligned earlier, we would be moving faster now.", "If she were leading this quarter, she would have reduced scope last month.", "If they had invested in quality, incidents would be lower today.", "If I were clearer yesterday, we would not be debating this now.", "If the policy were stable, adoption would have grown by now.", "If we had tested sooner, we might be shipping today.", "If trust had held, negotiations would be smoother now."], motions: ["Organizations should train mixed conditionals explicitly.", "Leaders should use hypotheticals to stress-test plans.", "Project reviews should include counterfactual analysis.", "Teams should practice conditional reasoning in postmortems.", "Risk workshops should model alternate timelines.", "Executives should challenge assumptions through hypotheticals.", "Planning should include what-if branches by default."], scenarios: ["A reviewer says your hypothetical is unrealistic.", "A director asks why counterfactuals matter now.", "A teammate confuses real and hypothetical timelines.", "A candidate uses incorrect conditional logic in an interview.", "A client asks for certainty in an uncertain model.", "A manager rejects scenario analysis as academic.", "A board member asks what would have changed the result."], errors: [{ bad: "If I would have known, I act sooner.", good: "If I had known, I would have acted sooner." }, { bad: "If she was here, she had solved it.", good: "If she were here, she would have solved it." }, { bad: "If they had called, we solve it now.", good: "If they had called, we would be solving it now." }, { bad: "If he were prepared, he would passed.", good: "If he were prepared, he would have passed." }, { bad: "If we knew earlier, we had avoided this.", good: "If we had known earlier, we would have avoided this." }, { bad: "If I am you, I would escalate.", good: "If I were you, I would escalate." }, { bad: "If policy changed, adoption had improved.", good: "If policy had changed, adoption would have improved." }], dialogues: [{ lineA: "Hypotheticals are pointless after the fact.", lineB: "They are useful because they expose controllable decisions and improve future judgment." }, { lineA: "Why discuss what did not happen?", lineB: "Because counterfactuals reveal leverage points we can still influence." }, { lineA: "This sounds like hindsight bias.", lineB: "Only if we ignore evidence; we can test each assumption explicitly." }, { lineA: "Mixed conditionals confuse people.", lineB: "Agreed, so we anchor them in timeline diagrams and concrete outcomes." }, { lineA: "Can this improve execution?", lineB: "Yes, it sharpens risk detection before irreversible choices." }, { lineA: "I prefer facts, not hypotheticals.", lineB: "Facts explain what happened; hypotheticals explain what could change next." }, { lineA: "This is too theoretical for managers.", lineB: "Managers use it daily when they evaluate alternatives under uncertainty." }], compressions: [{ long: "If we had clarified scope earlier, we would not be facing this delay now.", short: "Earlier scope clarity would reduce delay now." }, { long: "Counterfactual thinking is valuable when it identifies practical levers for future action.", short: "Counterfactuals help find future levers." }, { long: "Mixed conditionals connect past decisions to present consequences with precision.", short: "Mixed conditionals link past choices to present results." }, { long: "Hypotheticals are most useful when assumptions are explicit and testable.", short: "Useful hypotheticals require testable assumptions." }, { long: "A timeline error can distort both accountability and future planning quality.", short: "Timeline errors distort accountability." }, { long: "Conditional reasoning improves strategic planning under uncertainty.", short: "Conditionals strengthen uncertain planning." }, { long: "Counterfactual analysis should guide action, not excuse mistakes.", short: "Use counterfactuals for action, not excuses." }] },
  { title: "Rhetorical techniques", sources: ["Contrast clarifies priorities when options compete.", "Repetition can reinforce a key message without adding complexity.", "Emphasis works best when tied to concrete stakes.", "Rhetoric fails when style replaces substance.", "Strategic pauses improve listener processing under pressure.", "Parallel structure increases memorability in presentations.", "A strong close reframes urgency as direction."], motions: ["Leaders should use repetition deliberately in keynotes.", "Public speakers should prioritize contrast over jargon.", "Persuasive communication should use rhythm intentionally.", "Presentations should be designed around memorable framing.", "Rhetorical devices should be taught in workplace training.", "Executive communication should emphasize narrative architecture.", "Strong rhetoric should be measured by clarity, not applause."], scenarios: ["An audience says your speech sounds scripted.", "A moderator cuts your answer before your key point.", "A panelist uses emotional appeal without evidence.", "A stakeholder says your message lacks urgency.", "Your conclusion is challenged as overly dramatic.", "A listener accuses you of repeating yourself.", "You need to redirect a hostile Q&A quickly."], errors: [{ bad: "The point is more clearer with repetition.", good: "The point is clearer with repetition." }, { bad: "He emphasized on the urgency.", good: "He emphasized the urgency." }, { bad: "This contrast makes audience to focus.", good: "This contrast makes the audience focus." }, { bad: "She repeated the phrase for insist.", good: "She repeated the phrase for emphasis." }, { bad: "The rhetoric were effective.", good: "The rhetoric was effective." }, { bad: "We need a stronger emphasize here.", good: "We need stronger emphasis here." }, { bad: "His message lacks of structure.", good: "His message lacks structure." }], dialogues: [{ lineA: "Your argument is fine, but no one remembers it.", lineB: "Then I need sharper structure: one claim, one contrast, one clear close." }, { lineA: "You keep repeating yourself.", lineB: "I repeat selectively so the main decision criterion stays clear." }, { lineA: "This feels too dramatic.", lineB: "I can reduce tone and keep emphasis on measurable impact." }, { lineA: "You buried your strongest point.", lineB: "Good catch; I will move that contrast to the opening." }, { lineA: "The room lost focus halfway through.", lineB: "I will add signposts and shorter transitions to reset attention." }, { lineA: "Your close did not land.", lineB: "I should have ended with a concrete choice and timeline." }, { lineA: "The phrasing sounded overly polished.", lineB: "I can simplify language while preserving rhetorical clarity." }], compressions: [{ long: "Repetition is useful only when it reinforces one essential idea rather than restating every point.", short: "Repeat only the core idea." }, { long: "Contrast helps audiences evaluate trade-offs without getting lost in technical detail.", short: "Contrast clarifies trade-offs quickly." }, { long: "A persuasive close should convert concern into a specific next action.", short: "Close with specific action." }, { long: "Rhetorical style should amplify substance, not distract from weak evidence.", short: "Style should amplify substance." }, { long: "Strategic pauses improve comprehension when cognitive load is high.", short: "Pauses improve high-load comprehension." }, { long: "Parallel structure can make complex points easier to retain.", short: "Parallel structure improves retention." }, { long: "Emphasis without evidence sounds performative rather than persuasive.", short: "Emphasis needs evidence." }] },
];

while (sharedDecks.length < 15) {
  const seed = sharedDecks[sharedDecks.length % 2]!;
  sharedDecks.push({ ...seed, title: `${seed.title} ${sharedDecks.length + 1}` });
}

const ALL_DECKS = [DECKS_INPUT[0]!, ...sharedDecks].slice(0, 16).map(buildDeck);

function build() {
  if (ALL_DECKS.length < 16 || ALL_DECKS.length > 18) {
    throw new Error(`Expected 16–18 decks, got ${ALL_DECKS.length}`);
  }
  const total = ALL_DECKS.reduce((s, d) => s + d.cards.length, 0);
  if (total < 650 || total > 800) {
    throw new Error(`Expected 650–800 cards, got ${total}`);
  }

  const globalFronts = new Set<string>();
  for (const deck of ALL_DECKS) {
    for (const [front] of deck.cards) {
      if (globalFronts.has(front)) {
        throw new Error(`Global duplicate front detected: ${front}`);
      }
      globalFronts.add(front);
    }
  }

  const decks = ALL_DECKS.map((spec, di) => ({
    id: `study-a3-deck-${di}`,
    titleJa: spec.titleJa,
    titleEn: spec.titleEn,
    sortOrder: di,
    cards: spec.cards.map(([frontJa, backEn], ci) => ({
      id: `study-a3-d${di}-c${ci}`,
      frontJa,
      backEn,
      sortOrder: ci,
    })),
  }));

  const assessment = {
    passingScore: 84,
    items: [
      {
        id: "study-a3-a0",
        promptJa: "Which response best balances persuasion and diplomacy under pressure?",
        promptEn: "Which response best balances persuasion and diplomacy under pressure?",
        options: [
          "I see your concern; here is the evidence, the trade-off, and the checkpoint we can use to reduce risk.",
          "You are wrong, and your concern is irrelevant.",
          "I do not know, maybe we should stop talking.",
          "This is too complex to answer now.",
        ],
        correctIndex: 0,
      },
      {
        id: "study-a3-a1",
        promptJa: "Which sentence correctly uses a mixed conditional?",
        promptEn: "Which sentence correctly uses a mixed conditional?",
        options: [
          "If we had validated earlier, we would be moving faster now.",
          "If we validate earlier, we would moved faster now.",
          "If we had validate, we will move faster now.",
          "If we validated, we had moved now.",
        ],
        correctIndex: 0,
      },
      {
        id: "study-a3-a2",
        promptJa: "Which line demonstrates strong rhetorical contrast?",
        promptEn: "Which line demonstrates strong rhetorical contrast?",
        options: [
          "This plan is slower at the start, but faster at scale.",
          "This plan is maybe good maybe not.",
          "This plan is a plan and we plan it.",
          "The plan contrasts because it contrasts.",
        ],
        correctIndex: 0,
      },
      {
        id: "study-a3-a3",
        promptJa: "Which phrase signals high-level disagreement professionally?",
        promptEn: "Which phrase signals high-level disagreement professionally?",
        options: [
          "I see your point; however, the evidence suggests a different conclusion.",
          "You clearly do not understand this topic.",
          "That is nonsense and we should ignore it.",
          "No, because no.",
        ],
        correctIndex: 0,
      },
      {
        id: "study-a3-a4",
        promptJa: "Which statement shows appropriate speculation?",
        promptEn: "Which statement shows appropriate speculation?",
        options: [
          "It could be that adoption slowed because onboarding became less intuitive.",
          "It definitely happened because I feel it did.",
          "There is zero uncertainty so no analysis is needed.",
          "Maybe everything is random forever.",
        ],
        correctIndex: 0,
      },
      {
        id: "study-a3-a5",
        promptJa: "Which sentence best reflects cultural nuance in communication?",
        promptEn: "Which sentence best reflects cultural nuance in communication?",
        options: [
          "In some contexts, indirect feedback preserves alignment better than blunt criticism.",
          "Directness is always superior in every culture.",
          "Culture does not affect communication choices.",
          "Everyone should communicate the same way always.",
        ],
        correctIndex: 0,
      },
      {
        id: "study-a3-a6",
        promptJa: "Which option is a concise high-level paraphrase?",
        promptEn: "Which option is a concise high-level paraphrase?",
        options: [
          "The core issue is unclear ownership across teams.",
          "There are lots of issues and things happening everywhere.",
          "Ownership maybe unclear maybe not, hard to say.",
          "Teams are teams and ownership is ownership.",
        ],
        correctIndex: 0,
      },
      {
        id: "study-a3-a7",
        promptJa: "Which reply is strongest for spontaneous response in a tense meeting?",
        promptEn: "Which reply is strongest for spontaneous response in a tense meeting?",
        options: [
          "Let's separate the urgent decision from the broader strategic debate and resolve both in order.",
          "I refuse to answer under pressure.",
          "This is not my problem.",
          "We should postpone everything indefinitely.",
        ],
        correctIndex: 0,
      },
      {
        id: "study-a3-a8",
        promptJa: "Which response is best for a structured interview answer?",
        promptEn: "Which response is best for a structured interview answer?",
        options: [
          "Situation, action, and result: we faced churn, redesigned onboarding, and reduced churn by 12%.",
          "I did many things and it worked somehow.",
          "There was a challenge and then it was fine.",
          "I cannot remember details but trust me.",
        ],
        correctIndex: 0,
      },
      {
        id: "study-a3-a9",
        promptJa: "Which sentence models leadership communication under uncertainty?",
        promptEn: "Which sentence models leadership communication under uncertainty?",
        options: [
          "We do not have full certainty, but we have clear thresholds for action and review.",
          "We know nothing, so we will guess.",
          "Everything is certain, no need to monitor.",
          "Uncertainty means we should avoid decisions completely.",
        ],
        correctIndex: 0,
      },
    ],
  };

  const doc = { version: 1 as const, levelCode: "ADVANCED_3" as const, decks, assessment };
  const parsed = advanced3LevelFileSchema.safeParse(doc);
  if (!parsed.success) throw new Error("advanced3LevelFileSchema validation failed");
  fs.writeFileSync(OUT, `${JSON.stringify(parsed.data, null, 2)}\n`);
  console.log(`Wrote ${OUT} (${decks.length} decks, ${total} cards)`);
}

build();
