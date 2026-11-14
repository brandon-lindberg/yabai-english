import "server-only";
import { z } from "zod";
import { freezeJson } from "../freeze-json";
import { placementBankDigest } from "../placement-bank/placement-bank-digest";
import { placementBankFileSchema } from "../placement-bank/schema";

const schema = z.array(placementBankFileSchema.extend({ stemId: z.string().min(1) }));

export function prepareEnglishBank(value: unknown) {
  const questions = freezeJson(schema.parse(value));
  const digest = placementBankDigest(questions);
  const byId = new Map(questions.map(question => [question.id, question]));
  return { questions, digest, question: (id: string) => byId.get(id) };
}
