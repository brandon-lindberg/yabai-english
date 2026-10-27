import { createHash, createHmac } from "crypto";
import type { LoadedPlacementQuestion } from "@/lib/placement-bank/load-placement-bank";
import type { PlacementAdaptiveState, ENGLISH_STAIRCASE_ROUTING_REVISION } from "./placement-adaptive";

export type PlacementAttemptPayload = {
  userId: string;
  issuedAt: number;
  expiresAt: number;
  mode: "adaptive";
  scoringVersion?: 2;
  bankDigest?: string;
  routingRevision?: typeof ENGLISH_STAIRCASE_ROUTING_REVISION;
  currentQuestionId: string | null;
  asked: Array<{ id: string; answer: number }>;
  adaptiveState: PlacementAdaptiveState;
};

export function placementBankDigest(questions: LoadedPlacementQuestion[]) {
  return createHash("sha256").update(JSON.stringify([...questions].sort((a, b) => a.id.localeCompare(b.id)))).digest("hex");
}

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
