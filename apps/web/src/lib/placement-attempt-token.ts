import { createHmac } from "crypto";

type PlacementAttemptPayload = {
  userId: string;
  questionIds: string[];
  issuedAt: number;
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
  if (!parsed.userId || !Array.isArray(parsed.questionIds) || !parsed.issuedAt) return null;
  return parsed;
}
