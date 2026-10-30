import { expect, type Page } from "@playwright/test";
import type { JapanesePlacementItem } from "../../../src/lib/japanese-placement/bank";
import type { JapaneseQuestion } from "../../../src/lib/japanese-placement/public";
import en from "../../../messages/en.json";

/** UI interaction only: keys stay in the offline test bank, grading stays on the server. */
export async function chooseJapaneseAnswer(page: Page, question: JapaneseQuestion, item: JapanesePlacementItem, correct = true,
  afterTile?: (position: number) => Promise<void>) {
  if (item.responseType === "choice") {
    const choice = item.choices.find(choice => correct ? choice.id === item.correctChoiceId : choice.id !== item.correctChoiceId)!;
    await page.getByRole("button", { name: choice.text, exact: true }).press("Enter");
  } else {
    if (!correct) throw new Error("Use an explicit wrong permutation when testing sentence errors");
    if (question.response.kind !== "sentence_assembly") throw new Error("Sentence response expected");
    for (const [position, id] of item.acceptedOrders[0].entries()) {
      const index = question.response.tiles.findIndex(tile => tile.id === id);
      const name = en.japanesePlacement.addTile.replace("{tile}", question.response.tiles[index].text).replace("{position}", String(index + 1));
      await page.getByRole("button", { name, exact: true }).press("Enter");
      await afterTile?.(position);
    }
    await page.getByRole("button", { name: en.japanesePlacement.submitSentence, exact: true }).click();
  }
}

export async function chooseEnglishAnswer(page: Page, correctIndex: number, correct = true) {
  const choices = page.locator("main ul").filter({ has: page.getByRole("button") }).last().getByRole("button");
  await expect(choices).toHaveCount(3);
  await choices.nth(correct ? correctIndex : (correctIndex + 1) % 3).press("Enter");
}
