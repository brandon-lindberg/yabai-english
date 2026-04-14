import fs from "node:fs";
import path from "node:path";
import { advanced2LevelFileSchema } from "../src/lib/study/schemas";

const OUT = path.join(__dirname, "../data/study/advanced-2.json");
const CARDS_PER_DECK = 36;

type Card = { f: string; b: string };
type Pair = [string, string];
type TopicSpec = {
  title: string;
  openings: string[];
  pivots: string[];
  endings: string[];
};

function clozePivot(sentence: string, pivot: string): Card {
  const words = pivot.split(" ");
  if (!sentence.includes(pivot)) throw new Error(`Missing pivot: ${pivot}`);
  if (words.length < 2) return { f: sentence.replace(pivot, "___"), b: sentence };
  const replacement = `___ ${words.slice(1).join(" ")}`;
  return { f: sentence.replace(pivot, replacement), b: sentence };
}

function deck(title: string, cards: Card[]) {
  if (cards.length !== CARDS_PER_DECK) {
    throw new Error(`${title}: expected ${CARDS_PER_DECK} cards, got ${cards.length}`);
  }
  return { titleJa: title, titleEn: title, cards: cards.map((c) => [c.f, c.b] as Pair) };
}

function buildDeck(spec: TopicSpec) {
  const scenarios = [
    "In Monday's steering-committee review",
    "During the vendor renewal call",
    "In a cross-functional planning workshop",
    "While drafting the quarterly board memo",
    "At the end of a client escalation meeting",
    "In a follow-up email to legal counsel",
    "When summarizing risks for finance",
    "During a product and engineering sync",
    "In a retrospective after missed targets",
    "When briefing a newly assigned manager",
    "In a negotiation with a procurement team",
    "During an incident-response handover",
    "In a pre-launch go/no-go discussion",
    "When documenting assumptions in Notion",
    "During a weekly executive update",
    "In a one-on-one with a direct report",
    "When moderating a tense design review",
    "In a customer-facing roadmap presentation",
    "During a strategy offsite debate",
    "When escalating a blocker to leadership",
    "In the opening of a webinar Q&A",
    "While writing postmortem action items",
    "During a budget reforecast meeting",
    "In a kickoff session with external partners",
    "When aligning stakeholders before launch",
    "During a data-quality review with analytics",
    "In a hiring panel debrief",
    "When preparing a compliance audit response",
    "During a migration readiness checkpoint",
    "In an internal announcement to all teams",
    "When clarifying scope with operations",
    "During a customer advisory board session",
    "In a policy exception request thread",
    "When presenting trade-offs to executives",
    "During a conflict-resolution conversation",
    "In a final decision memo before sign-off",
  ] as const;

  const cards: Card[] = [];
  for (let i = 0; i < CARDS_PER_DECK; i++) {
    const scenario = scenarios[i]!;
    const opening = spec.openings[i % spec.openings.length]!;
    const pivot = spec.pivots[i % spec.pivots.length]!;
    const ending = spec.endings[(i * 3 + 1) % spec.endings.length]!;
    cards.push(clozePivot(`${scenario}, ${opening} ${pivot} ${ending}.`, pivot));
  }
  const fronts = new Set(cards.map((c) => c.f));
  if (fronts.size !== cards.length) throw new Error(`${spec.title}: duplicate fronts detected`);
  return deck(spec.title, cards);
}

const SPECS: TopicSpec[] = [
  {
    title: "Formal writing and email language",
    openings: ["I would like to inform you that", "Please be advised that", "I am writing to confirm that", "For your reference", "To keep you updated", "Further to our discussion"],
    pivots: ["the timeline has shifted", "the revised draft is attached", "we require final approval", "the issue has been resolved", "the payment is now overdue", "we will proceed as agreed"],
    endings: ["as noted in the previous thread", "before the close of business", "in line with policy requirements", "unless you advise otherwise", "to avoid further delay", "for complete transparency"],
  },
  {
    title: "Meetings and workplace communication",
    openings: ["Before we move on", "If I may add", "Could I briefly jump in", "To build on that point", "With your permission", "Just to keep us on track"],
    pivots: ["I want to clarify ownership", "we need a decision today", "the blocker remains unresolved", "I suggest we time-box this", "we should capture next steps", "we are drifting from the agenda"],
    endings: ["so everyone leaves with clarity", "before this meeting closes", "while all stakeholders are present", "without cutting off debate", "to protect the deadline", "in a way that remains collaborative"],
  },
  {
    title: "Meetings giving updates",
    openings: ["Quick update", "Since our last meeting", "Status-wise", "At this point", "For this week", "In summary"],
    pivots: ["we closed two major risks", "the timeline remains on track", "one dependency is still pending", "budget utilization is stable", "customer feedback is trending positive", "we need one escalation decision"],
    endings: ["before we finalize next steps", "so leadership can plan accordingly", "with no major surprises expected", "unless scope changes again", "for the next review cycle", "to keep delivery predictable"],
  },
  {
    title: "Explaining complex ideas",
    openings: ["At a high level", "In practical terms", "From a systems perspective", "Put simply", "To break this down", "Conceptually"],
    pivots: ["the model separates signal from noise", "the framework reduces decision friction", "the architecture favors resilience", "the mechanism relies on feedback loops", "the trade-off is intentional", "the abstraction hides implementation details"],
    endings: ["so teams can act faster", "without sacrificing reliability", "under changing conditions", "across multiple use cases", "for both technical and non-technical audiences", "when priorities conflict"],
  },
  {
    title: "Argument structure",
    openings: ["My claim is that", "The evidence suggests that", "A stronger interpretation is that", "To support this claim", "In conclusion", "Following this logic"],
    pivots: ["the current plan is under-scoped", "the assumptions are inconsistent", "the data supports phased rollout", "the risk is concentrated upstream", "the proposal needs stronger controls", "the conclusion still holds"],
    endings: ["because the baseline moved", "as shown by last quarter's metrics", "despite short-term resistance", "once we examine root causes", "if we apply the same criteria", "under reasonable assumptions"],
  },
  {
    title: "Hedging language",
    openings: ["It seems that", "It might be the case that", "I would cautiously suggest that", "There appears to be", "One possible explanation is that", "I am not entirely convinced that"],
    pivots: ["the sample is too narrow", "we are underestimating demand", "the signal may be temporary", "the issue could be structural", "the current framing is incomplete", "the forecast is overly optimistic"],
    endings: ["given current data quality", "until we validate externally", "without additional controls", "based on what we know today", "unless assumptions change", "from a risk-adjusted view"],
  },
  {
    title: "Negotiation language",
    openings: ["We could consider", "Would you be open to", "A workable middle ground is", "If flexibility exists", "On our side, we can", "To move this forward"],
    pivots: ["a phased commitment", "a narrower initial scope", "a performance-based clause", "shared implementation milestones", "a temporary discount structure", "a revised service-level target"],
    endings: ["for the first contract period", "if governance is explicit", "while preserving long-term value", "before full rollout", "with clear review checkpoints", "so both sides reduce exposure"],
  },
  {
    title: "Data and trend language",
    openings: ["The latest trend shows", "Quarter over quarter", "Over the same period", "The data indicates", "We observed that", "Historically"],
    pivots: ["adoption increased steadily", "churn decreased after onboarding changes", "costs fluctuated across regions", "conversion remained flat", "variance widened in enterprise accounts", "response time improved significantly"],
    endings: ["relative to last year", "after the process update", "despite pricing pressure", "across all major segments", "once seasonality is removed", "at statistically meaningful levels"],
  },
  {
    title: "Cause and effect advanced",
    openings: ["Due to", "As a result of", "Because of", "This led to", "Consequently", "Owing to"],
    pivots: ["incomplete handoffs", "delayed legal review", "unclear accountability", "shifting requirements", "unexpected vendor constraints", "weak initial assumptions"],
    endings: ["the launch slipped by two weeks", "stakeholder confidence declined", "rework increased significantly", "the mitigation plan was activated", "the budget buffer was consumed", "decision quality deteriorated"],
  },
  {
    title: "Abstract topics technology society education",
    openings: ["In technology policy", "From a societal perspective", "In higher education", "Across digital platforms", "In public discourse", "At institutional level"],
    pivots: ["automation reshapes labor incentives", "privacy norms are evolving", "access remains uneven", "algorithmic bias requires oversight", "media literacy is increasingly essential", "credential value is being redefined"],
    endings: ["as infrastructure changes", "when regulation lags innovation", "across socioeconomic groups", "under rapid platform shifts", "in both urban and rural settings", "as expectations continue to evolve"],
  },
  {
    title: "Comparative analysis",
    openings: ["Compared with option A", "Relative to the current model", "In contrast with last year", "On balance", "From a trade-off standpoint", "Against the alternative"],
    pivots: ["this approach scales better", "the risk profile is lower", "execution cost is higher", "coordination burden is lighter", "quality outcomes are stronger", "time-to-value is slower"],
    endings: ["for multi-team delivery", "under staffing constraints", "if governance is weak", "when timelines are fixed", "for long-term maintainability", "given current capabilities"],
  },
  {
    title: "Storytelling structured setup conflict resolution",
    openings: ["At the start", "The conflict emerged when", "By the midpoint", "The turning point came after", "In the final phase", "The resolution worked because"],
    pivots: ["expectations were aligned", "requirements began to diverge", "trust had started to erode", "leadership clarified priorities", "teams committed to one plan", "ownership became explicit"],
    endings: ["and momentum improved", "despite initial resistance", "once communication stabilized", "under tight delivery pressure", "with measurable outcomes", "across all departments involved"],
  },
  {
    title: "Idioms useful not random",
    openings: ["To get the ball rolling", "We hit a wall when", "To keep things on track", "Before we drop the ball", "To be on the same page", "When we need to raise the bar"],
    pivots: ["we need an immediate owner", "dependencies remained unclear", "we should agree on milestones", "we must validate assumptions", "we should clarify definitions", "we need stronger execution discipline"],
    endings: ["before kickoff", "during implementation", "at every review cycle", "before external communication", "while pressure increases", "so outcomes stay predictable"],
  },
  {
    title: "Focus shift and reframing",
    openings: ["Instead of debating details", "Let's shift the focus to", "Before we optimize further", "The bigger question is", "To reframe this issue", "What matters most now is"],
    pivots: ["decision quality over speed", "long-term reliability", "customer impact first", "clear ownership", "evidence before opinion", "risk-adjusted outcomes"],
    endings: ["for this quarter's goals", "under current constraints", "across all teams involved", "before committing resources", "in a measurable way", "while preserving alignment"],
  },
];

const DECKS = SPECS.map(buildDeck);

function build() {
  if (DECKS.length < 14 || DECKS.length > 16) throw new Error(`Expected 14–16 decks, got ${DECKS.length}`);
  const total = DECKS.reduce((s, d) => s + d.cards.length, 0);
  if (total < 500 || total > 600) throw new Error(`Expected 500–600 cards, got ${total}`);

  const decks = DECKS.map((spec, di) => ({
    id: `study-a2-deck-${di}`,
    titleJa: spec.titleJa,
    titleEn: spec.titleEn,
    sortOrder: di,
    cards: spec.cards.map(([frontJa, backEn], ci) => ({
      id: `study-a2-d${di}-c${ci}`,
      frontJa,
      backEn,
      sortOrder: ci,
    })),
  }));

  const assessment = {
    passingScore: 80,
    items: [
      {
        id: "study-a2-a0",
        promptJa: "Which line sounds most appropriate in a formal update email?",
        promptEn: "Which line sounds most appropriate in a formal update email?",
        options: [
          "Please be advised that the revised timeline is attached for your review.",
          "Hey, we changed dates, check the file when you can.",
          "Timeline changed somehow, see attachment maybe.",
          "I changed it because reasons; let's move on.",
        ],
        correctIndex: 0,
      },
      {
        id: "study-a2-a1",
        promptJa: "Which sentence uses hedging language naturally?",
        promptEn: "Which sentence uses hedging language naturally?",
        options: [
          "It might be the case that our current sample is too narrow.",
          "It is absolute that our sample is always wrong.",
          "Our sample wrong surely forever.",
          "This is 100% certain with no doubt.",
        ],
        correctIndex: 0,
      },
      {
        id: "study-a2-a2",
        promptJa: "Which is the strongest negotiation phrase?",
        promptEn: "Which is the strongest negotiation phrase?",
        options: [
          "Would you be open to a phased commitment with review checkpoints?",
          "Take this offer now or we walk.",
          "We want everything our way immediately.",
          "You decide, we do not care.",
        ],
        correctIndex: 0,
      },
      {
        id: "study-a2-a3",
        promptJa: "Which sentence correctly expresses cause and effect?",
        promptEn: "Which sentence correctly expresses cause and effect?",
        options: [
          "Due to delayed legal review, the launch slipped by two weeks.",
          "Due to we delayed legal, launch slipped two weeks.",
          "Launch slipped because of due to legal delayed it.",
          "Legal delayed and launch maybe slip somehow.",
        ],
        correctIndex: 0,
      },
      {
        id: "study-a2-a4",
        promptJa: "Which line best shows comparative analysis?",
        promptEn: "Which line best shows comparative analysis?",
        options: [
          "Compared with option A, this approach scales better but costs more upfront.",
          "This option is best because I feel so.",
          "Everything is better and worse at same time.",
          "Option A bad, this one good, done.",
        ],
        correctIndex: 0,
      },
      {
        id: "study-a2-a5",
        promptJa: "Which line has clear claim-support-conclusion structure?",
        promptEn: "Which line has clear claim-support-conclusion structure?",
        options: [
          "My claim is that we should phase rollout; pilot data supports this, so phased launch is safer.",
          "I claim things and data and conclusion maybe yes.",
          "Data exists and claim exists and maybe done.",
          "We should launch fast because fast is fast.",
        ],
        correctIndex: 0,
      },
      {
        id: "study-a2-a6",
        promptJa: "Which is a professional way to interrupt politely in a meeting?",
        promptEn: "Which is a professional way to interrupt politely in a meeting?",
        options: [
          "Could I briefly jump in to clarify ownership before we continue?",
          "Stop, you are wrong.",
          "Let me talk now; enough.",
          "No, that is nonsense.",
        ],
        correctIndex: 0,
      },
      {
        id: "study-a2-a7",
        promptJa: "Which sentence best explains a trend?",
        promptEn: "Which sentence best explains a trend?",
        options: [
          "Quarter over quarter, churn decreased after onboarding changes.",
          "Churn down because things happened.",
          "Numbers move up and down randomly forever.",
          "Trend is trend so nothing to explain.",
        ],
        correctIndex: 0,
      },
      {
        id: "study-a2-a8",
        promptJa: "Which idiom usage is natural in a workplace context?",
        promptEn: "Which idiom usage is natural in a workplace context?",
        options: [
          "To get the ball rolling, we need an immediate owner for discovery.",
          "We kicked the wall rolling the ball to legal.",
          "Let's hit the ball over the deadline.",
          "I dropped the page to raise the ball.",
        ],
        correctIndex: 0,
      },
      {
        id: "study-a2-a9",
        promptJa: "Which sentence effectively reframes focus?",
        promptEn: "Which sentence effectively reframes focus?",
        options: [
          "Instead of debating details, let's shift the focus to long-term reliability.",
          "Forget details because details are useless always.",
          "No focus needed; we will improvise.",
          "I do not like this, next topic.",
        ],
        correctIndex: 0,
      },
    ],
  };

  const doc = { version: 1 as const, levelCode: "ADVANCED_2" as const, decks, assessment };
  const parsed = advanced2LevelFileSchema.safeParse(doc);
  if (!parsed.success) throw new Error("advanced2LevelFileSchema validation failed");

  fs.writeFileSync(OUT, `${JSON.stringify(parsed.data, null, 2)}\n`);
  console.log(`Wrote ${OUT} (${decks.length} decks, ${total} cards)`);
}

build();
