import { createHmac } from "crypto";

export type PlacementAttemptPayload = {
  userId: string;
  issuedAt: number;
  expiresAt: number;
  mode: "adaptive";
  currentQuestionId: string | null;
  asked: Array<{ id: string; answer: number }>;
  adaptiveState: {
    sectionState: Record<
      "grammar" | "vocabulary" | "reading" | "functional",
      { asked: number; correct: number; targetBand: 1 | 2 | 3 | 4 | 5 }
    >;
    askedQuestionIds: string[];
    askedStemIds: string[];
    maxQuestions: number;
    perSectionMax: number;
  };
};

function getSecret() {
  return process.env.NEXTAUTH_SECRET ?? "dev-secret";
}

function toBase64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function createPlacementAttemptToken(payload: PlacementAttemptPayload) {
  const body = toBase64Url(JSON.stringify(payload));
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyPlacementAttemptToken(token: string): PlacementAttemptPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", getSecret()).update(body).digest("base64url");
  if (sig !== expected) return null;
  const parsed = JSON.parse(fromBase64Url(body)) as PlacementAttemptPayload;
  if (!parsed.userId || !parsed.issuedAt || !parsed.expiresAt) return null;
  if (parsed.mode !== "adaptive") return null;
  if (!Array.isArray(parsed.asked) || !parsed.adaptiveState) return null;
  return parsed;
}
