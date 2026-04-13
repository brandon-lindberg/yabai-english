import fs from "node:fs";
import path from "node:path";
import { advanced1LevelFileSchema } from "../src/lib/study/schemas";

const OUT = path.join(__dirname, "../data/study/advanced-1.json");
const CARDS_PER_DECK = 35;

type Card = { f: string; b: string };
type Pair = [string, string];

function cloze(sentence: string, target: string): Card {
  if (!sentence.includes(target)) {
    throw new Error(`Target "${target}" missing from sentence "${sentence}"`);
  }
  return { f: sentence.replace(target, "___"), b: sentence };
}

function deck(title: string, titleEn: string, cards: Card[]) {
  if (cards.length !== CARDS_PER_DECK) {
    throw new Error(`${titleEn}: expected ${CARDS_PER_DECK} cards, got ${cards.length}`);
  }
  return { titleJa: title, titleEn, cards: cards.map((c) => [c.f, c.b] as Pair) };
}

function buildTopicDeck(topic: string, openings: string[], pivots: string[], endings: string[]) {
  const cards: Card[] = [];
  for (const opening of openings) {
    for (const pivot of pivots) {
      for (const ending of endings) {
        if (cards.length === CARDS_PER_DECK) break;
        const sentence = `${opening} ${pivot} ${ending}.`;
        cards.push(cloze(sentence, pivot));
      }
      if (cards.length === CARDS_PER_DECK) break;
    }
    if (cards.length === CARDS_PER_DECK) break;
  }
  return deck(topic, topic, cards);
}

const SPECS = [
  deck(
    "Nuanced tense usage",
    "Nuanced tense usage",
    [
      ...[
        "I have finished the draft, so we can review it now.",
        "I finished the draft yesterday before dinner.",
        "She has lived in Berlin for three years now.",
        "She lived in Berlin when she was at university.",
        "We have discussed this risk before in planning.",
        "We discussed this risk during Monday's call.",
        "He has already sent the invoice this morning.",
      ].map((s) => cloze(s, s.split(" ")[1]!)),
      ...[
        "I have been waiting for your update since 9 a.m.",
        "I waited for your update for two hours.",
        "They have built trust through consistent delivery.",
        "They built trust during the recovery period.",
        "I have never seen such a fast turnaround.",
        "I saw a fast turnaround last quarter.",
        "By the time we arrived, they had already left.",
      ].map((s) => cloze(s, s.split(" ")[1]!)),
      ...[
        "If she had known, she would have prepared earlier.",
        "When she knew the context, she adapted quickly.",
        "I have worked here long enough to notice patterns.",
        "I worked here in 2021 as a contractor.",
        "We have improved quality since introducing checklists.",
        "We improved quality after introducing checklists last year.",
        "I have gone through the brief twice already.",
      ].map((s) => cloze(s, s.split(" ")[1]!)),
      ...[
        "He went through the brief in detail last night.",
        "This is the third time I have explained the issue.",
        "That was the third time I explained the issue.",
        "They have been expanding the team gradually.",
        "They expanded the team after funding closed.",
        "I had just sat down when the fire alarm rang.",
        "I have just sent you the revised timeline.",
      ].map((s) => cloze(s, s.split(" ")[1]!)),
      ...[
        "I sent you the revised timeline ten minutes ago.",
        "We have had three incidents this month.",
        "We had three incidents in January.",
        "She has already reviewed section four.",
        "She reviewed section four during lunch.",
        "I have not decided yet, but I will soon.",
        "I did not decide then, so we postponed.",
      ].map((s) => cloze(s, s.split(" ")[1]!)),
    ],
  ),
  deck(
    "Passive voice in natural use",
    "Passive voice in natural use",
    [
      ...[
        "It was decided that the launch would be delayed.",
        "The contract was signed after legal approved it.",
        "The issue was raised during the Q and A.",
        "A new timeline was shared with stakeholders.",
        "The final draft was reviewed by compliance.",
        "The budget was approved last Thursday.",
        "A compromise was reached after two rounds.",
      ].map((s) => cloze(s, "was")),
      ...[
        "The meeting has been moved to next Wednesday.",
        "The rollout has been paused until testing ends.",
        "No action has been taken on that request.",
        "The proposal has been revised three times.",
        "An exception has been granted in this case.",
        "The database is being migrated this weekend.",
        "The policy is being updated for clarity.",
      ].map((s) => cloze(s, s.includes("has been") ? "has been" : "is being")),
      ...[
        "The report will be shared by noon tomorrow.",
        "The feature will be released in phases.",
        "The candidates were interviewed by two managers.",
        "The decision was communicated too late.",
        "Several options were considered before approval.",
        "The clients were informed as soon as possible.",
        "Feedback was collected from all departments.",
      ].map((s) => cloze(s, s.includes("will be") ? "will be" : s.includes("were") ? "were" : "was")),
      ...[
        "The warning signs were ignored at first.",
        "A follow-up call was requested by procurement.",
        "The root cause was identified within hours.",
        "Three alternatives were presented to the board.",
        "The issue should be escalated immediately.",
        "All invoices must be submitted by Friday.",
        "Nothing can be changed after publication.",
      ].map((s) =>
        cloze(
          s,
          s.includes("should be")
            ? "should be"
            : s.includes("must be")
              ? "must be"
              : s.includes("can be")
                ? "can be"
                : s.includes("were")
                  ? "were"
                  : "was",
        ),
      ),
      ...[
        "The pilot was completed ahead of schedule.",
        "The final scope was narrowed for this release.",
        "A full audit was conducted last month.",
        "A risk register was created for transparency.",
        "The process was simplified without losing control.",
        "The requirement was misunderstood by new hires.",
        "A decision was made to freeze hiring.",
      ].map((s) => cloze(s, "was")),
    ],
  ),
  buildTopicDeck(
    "Relative clauses for precision",
    ["The analyst", "The proposal", "The scenario", "The framework", "The consultant", "The approach", "The policy"],
    ["who led the pilot", "that we reviewed yesterday", "which the board rejected", "that solved the bottleneck", "who challenged our assumptions"],
    [
      "provided the clearest rationale",
      "needs one more revision",
      "changed how we prioritize risk",
      "deserves a closer comparison",
      "should be discussed with legal",
    ],
  ),
  buildTopicDeck(
    "Advanced connectors",
    ["The timeline looks aggressive", "The pilot delivered value", "The team worked quickly", "The budget is limited", "The result seems promising"],
    ["however", "therefore", "whereas", "although", "nevertheless"],
    [
      "we can still proceed with caution",
      "we should validate assumptions first",
      "the long-term risk remains unclear",
      "the recommendation needs context",
      "a phased approach is more realistic",
    ],
  ),
  buildTopicDeck(
    "High-frequency phrasal verbs",
    ["We need to", "They had to", "I will", "Please", "You should"],
    ["bring up", "run into", "carry out", "follow up", "rule out", "figure out", "break down"],
    [
      "the unresolved dependency in today's review",
      "unexpected resistance from procurement",
      "the experiment before making commitments",
      "the open action items by tomorrow morning",
      "a rushed fix that harms reliability",
    ],
  ),
  buildTopicDeck(
    "Critical collocations",
    ["We should", "They must", "I need to", "Let's", "You can"],
    ["make a decision", "reach a conclusion", "raise a concern", "meet a deadline", "take responsibility", "draw attention"],
    [
      "before the steering committee meets",
      "without delaying implementation",
      "while the context is still fresh",
      "in language that stays neutral",
      "so accountability is explicit",
    ],
  ),
  buildTopicDeck(
    "Formality level shifts",
    ["In this email", "During the meeting", "In a quick chat", "In the formal memo", "When writing to leadership"],
    ["I'd like to", "I want to", "I would appreciate", "Could you", "Please"],
    [
      "confirm the scope before we proceed",
      "clarify ownership for each deliverable",
      "review the assumptions with finance",
      "share any concerns by end of day",
      "escalate blockers through the right channel",
    ],
  ),
  buildTopicDeck(
    "Paraphrasing with control",
    ["In other words", "Put differently", "To reframe the point", "Another way to say this", "What this means in practice"],
    ["we need tighter controls", "the rollout was premature", "the risk is acceptable", "the evidence is mixed", "the plan lacks ownership"],
    [
      "for the next release cycle",
      "unless dependencies are reduced",
      "if mitigation steps are funded",
      "from an operational perspective",
      "for teams handling execution",
    ],
  ),
  buildTopicDeck(
    "Describing processes clearly",
    ["First", "Second", "Third", "After that", "Finally", "At each stage", "Before launch"],
    ["we gather inputs", "we verify assumptions", "we assign owners", "we document decisions", "we test edge cases"],
    [
      "so every stakeholder has context",
      "before any scope changes are approved",
      "to prevent rework across teams",
      "while maintaining delivery speed",
      "with evidence recorded in writing",
    ],
  ),
  buildTopicDeck(
    "Clarifying and rephrasing",
    ["What I mean is", "Let me put it another way", "To clarify", "Just to confirm", "I may have been unclear when I said"],
    ["the deadline is conditional", "the scope remains fixed", "the decision is provisional", "we are not blocking progress", "ownership needs to be explicit"],
    [
      "until legal approval is complete",
      "unless a critical risk appears",
      "while discovery continues",
      "for this quarter's objectives",
      "before implementation starts",
    ],
  ),
  buildTopicDeck(
    "Error-correction awareness",
    ["The corrected version is", "A more natural phrasing is", "A precise correction would be", "The subtle fix is", "An advanced learner should notice"],
    ["we discussed this yesterday", "she has already sent it", "if I were you", "it was decided that", "I am not sure I agree"],
    [
      "instead of the awkward alternative",
      "to avoid tense inconsistency",
      "because register matters here",
      "when accuracy and nuance both matter",
      "in high-stakes communication",
    ],
  ),
  buildTopicDeck(
    "Tone and intent control",
    ["To sound diplomatic", "To sound assertive", "To sound collaborative", "To sound direct", "To sound measured"],
    ["I suggest we revisit the timeline", "I need a clear answer today", "I understand your concern", "I cannot approve this version", "I recommend a smaller pilot first"],
    [
      "before we lock commitments",
      "while keeping trust intact",
      "so the decision stays evidence-based",
      "without escalating unnecessary tension",
      "to balance speed and quality",
    ],
  ),
];

function build() {
  if (SPECS.length < 12 || SPECS.length > 14) {
    throw new Error(`Expected 12–14 decks, got ${SPECS.length}`);
  }
  const total = SPECS.reduce((sum, d) => sum + d.cards.length, 0);
  if (total < 400 || total > 450) {
    throw new Error(`Expected 400–450 cards, got ${total}`);
  }

  const decks = SPECS.map((spec, di) => ({
    id: `study-a1-deck-${di}`,
    titleJa: spec.titleJa,
    titleEn: spec.titleEn,
    sortOrder: di,
    cards: spec.cards.map(([frontJa, backEn], ci) => ({
      id: `study-a1-d${di}-c${ci}`,
      frontJa,
      backEn,
      sortOrder: ci,
    })),
  }));

  const assessment = {
    passingScore: 78,
    items: Array.from({ length: 12 }, (_, i) => ({
      id: `study-a1-a${i}`,
      promptJa: `Choose the most natural advanced phrasing for item ${i + 1}.`,
      promptEn: `Choose the most natural advanced phrasing for item ${i + 1}.`,
      options: [
        "I have reviewed the issue and proposed a clear next step.",
        "I reviewed issue and propose clear next step yesterday now.",
        "Issue reviewed by me and next step maybe clear maybe not.",
        "I am reviewing yesterday and will had propose soon.",
      ],
      correctIndex: 0,
    })),
  };

  const doc = { version: 1 as const, levelCode: "ADVANCED_1" as const, decks, assessment };
  const parsed = advanced1LevelFileSchema.safeParse(doc);
  if (!parsed.success) {
    throw new Error("advanced1LevelFileSchema validation failed");
  }
  fs.writeFileSync(OUT, `${JSON.stringify(parsed.data, null, 2)}\n`);
  console.log(`Wrote ${OUT} (${decks.length} decks, ${total} cards)`);
}

build();
