import { describe, expect, it } from "vitest";
import { vocabularySchema } from "../corpus-audit";
import { verifyPhraseAttestation } from "../phrase-evidence";

function fixture() {
  const word = vocabularySchema.parse({ id: "parting", word: "お元気で", reading: "おげんきで", other_forms: ["おげんきで"], meanings: ["take care"], level: "N2" });
  const evidence = { sourceId: "teaching-source", locator: "page 31, parting expression", quotedForm: "お元気で", attestedWritten: "お元気で", reading: "おげんきで", meanings: ["take care"], normalization: "none" };
  return { word, evidence };
}
describe("complete Japanese phrase attestations", () => {
  it("supports the attested full expression and its declared kana spelling without inventing a dictionary ID", () => {
    const { word, evidence } = fixture();
    expect(() => verifyPhraseAttestation(word, evidence, new Set(["teaching-source"]))).not.toThrow();
    expect(word.jmdict_id).toBeUndefined();
  });
  it.each(["written", "reading", "meaning", "quote", "source"])("rejects unsupported $case changes", (kind) => {
    const { word, evidence } = fixture();
    if (kind === "written") word.other_forms.push("お元気ですか");
    if (kind === "reading") word.other_readings.push("おげんきですか");
    if (kind === "meaning") word.meanings = ["how are you?"];
    if (kind === "quote") evidence.quotedForm = "お元気ですか";
    if (kind === "source") evidence.sourceId = "unknown";
    expect(() => verifyPhraseAttestation(word, evidence, new Set(["teaching-source"]))).toThrow(/attestation/i);
  });
  it("allows an explicitly documented optional question particle without general text rewriting", () => {
    const word = vocabularySchema.parse({ id: "know", word: "ご存じですか", reading: "ごぞんじですか", meanings: ["do you know?"], level: "N2" });
    const evidence = { sourceId: "teaching-source", locator: "honorific explanation", quotedForm: "ご存じです（か）", attestedWritten: "ご存じですか", reading: "ごぞんじですか", meanings: ["do you know?"], normalization: "optional-question-particle" };
    expect(() => verifyPhraseAttestation(word, evidence, new Set(["teaching-source"]))).not.toThrow();
    evidence.quotedForm = "ご存じです（ない）";
    expect(() => verifyPhraseAttestation(word, evidence, new Set(["teaching-source"]))).toThrow(/attestation/i);
  });
});
