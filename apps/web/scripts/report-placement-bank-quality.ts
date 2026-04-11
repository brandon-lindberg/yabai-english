/**
 * Full-bank quality + duplicate report. From apps/web: `yarn placement-bank:report-quality`
 */
import path from "node:path";
import { loadPlacementBankSync } from "../src/lib/placement-bank/load-placement-bank";
import { auditPlacementQuestion } from "../src/lib/placement-bank/placement-bank-audit";
import {
  placementQuestionChoicesDedupeKey,
  placementQuestionPromptDedupeKey,
} from "../src/lib/placement-adaptive";
import type { LoadedPlacementQuestion } from "../src/lib/placement-bank/load-placement-bank";

function normSurface(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function countDuplicateGroups<K>(getKey: (q: LoadedPlacementQuestion) => K, items: LoadedPlacementQuestion[]) {
  const map = new Map<K, string[]>();
  for (const q of items) {
    const k = getKey(q);
    const list = map.get(k) ?? [];
    list.push(q.id);
    map.set(k, list);
  }
  let groupsWithDupes = 0;
  let rowsInDupGroups = 0;
  let excessRows = 0;
  for (const ids of map.values()) {
    if (ids.length > 1) {
      groupsWithDupes += 1;
      rowsInDupGroups += ids.length;
      excessRows += ids.length - 1;
    }
  }
  return { groupsWithDupes, rowsInDupGroups, excessRows, totalKeys: map.size };
}

function main() {
  const root = path.resolve(process.cwd());
  const bank = loadPlacementBankSync(root);

  let good = 0;
  let bad = 0;
  const issuesByCode = new Map<string, number>();

  for (const q of bank) {
    const issues = auditPlacementQuestion(q);
    if (issues.length === 0) good += 1;
    else {
      bad += 1;
      for (const i of issues) {
        issuesByCode.set(i.code, (issuesByCode.get(i.code) ?? 0) + 1);
      }
    }
  }

  const promptDupes = countDuplicateGroups((q) => placementQuestionPromptDedupeKey(q), bank);
  const choiceDupes = countDuplicateGroups((q) => placementQuestionChoicesDedupeKey(q), bank);
  const questionLineOnlyDupes = countDuplicateGroups(
    (q) => `${q.cefrBand}\u001f${q.section}\u001f${normSurface(q.questionEn)}`,
    bank,
  );

  const report = {
    total: bank.length,
    auditClean: good,
    auditFailed: bad,
    issuesByCode: Object.fromEntries([...issuesByCode.entries()].sort((a, b) => b[1] - a[1])),
    duplicates: {
      /** Same adaptive `placementQuestionPromptDedupeKey` (vocab includes choices in key). */
      promptDedupeKey: {
        duplicateKeyCount: promptDupes.groupsWithDupes,
        rowsSittingOnADuplicateKey: promptDupes.rowsInDupGroups,
        /** Rows beyond the first per key (same “prompt identity” in the bank). */
        redundantCopies: promptDupes.excessRows,
      },
      /** Same visible EN+JA choice multiset (sorted). */
      choiceDedupeKey: {
        duplicateKeyCount: choiceDupes.groupsWithDupes,
        rowsSittingOnADuplicateKey: choiceDupes.rowsInDupGroups,
        redundantCopies: choiceDupes.excessRows,
      },
      /** Same band+section+normalized questionEn only (ignores options; stricter “looks the same” on screen). */
      questionLinePerBandSection: {
        duplicateKeyCount: questionLineOnlyDupes.groupsWithDupes,
        rowsSittingOnADuplicateKey: questionLineOnlyDupes.rowsInDupGroups,
        redundantCopies: questionLineOnlyDupes.excessRows,
      },
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
