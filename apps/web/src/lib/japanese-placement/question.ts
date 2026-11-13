import "server-only";
import { sentenceOrderSignature, type JapanesePlacementItem } from "./bank";
import type { JapaneseQuestion, JapaneseResponseInput } from "./public";

/** Explicit projection shared by learner delivery and offline pilot exports. */
export function projectJapaneseQuestion(item: JapanesePlacementItem): JapaneseQuestion {
  return {
    id: item.id, domain: item.domain, prompt: { ...item.prompt }, stimulus: { ...item.stimulus },
    response: item.responseType === "choice"
      ? { kind: "choice", choices: item.choices.map((choice) => ({ ...choice })) }
      : { kind: "sentence_assembly", tiles: item.tiles.map((tile) => ({ ...tile })) },
  };
}

/** Validate identities and permutations before grading either live or pilot answers. */
export function validateJapaneseResponse(item: JapanesePlacementItem, response: JapaneseResponseInput): void {
  if (response.itemId !== item.id) throw new Error("Japanese response item mismatch");
  if (response.kind === "answer") {
    if (item.responseType !== "choice") throw new Error("Invalid response type for sentence assembly");
    if (!item.choices.some((choice) => choice.id === response.choiceId)) throw new Error("Unknown choice for the current Japanese item");
  }
  if (response.kind === "sentence_assembly") {
    if (item.responseType !== "sentence_assembly") throw new Error("Invalid response type for a choice question");
    sentenceOrderSignature(item, response.tileIds);
  }
}
