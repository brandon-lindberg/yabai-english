/**
 * Full 2000-row report: structural audit + coherence proxy + duplicate English stems.
 * From apps/web: `yarn placement-bank:report-full`
 *
 * IMPORTANT (printed to stderr + JSON): "Good/Bad" here is **machine-checked proxy** for your
 * definitions—not a substitute for human or LLM review of whether each MCQ is pedagogically sound.
 */
import path from "node:path";
import { loadPlacementBankSync } from "../src/lib/placement-bank/load-placement-bank";
import { auditPlacementQuestion } from "../src/lib/placement-bank/placement-bank-audit";
import {
  coherenceProxyIssues,
  normalizedLearnerEnglishStem,
} from "../src/lib/placement-bank/placement-bank-coherence-proxy";
import type { LoadedPlacementQuestion } from "../src/lib/placement-bank/load-placement-bank";

function countStemDupes(items: LoadedPlacementQuestion[]) {
  const map = new Map<string, string[]>();
  for (const q of items) {
    const stem = normalizedLearnerEnglishStem(q);
    const list = map.get(stem) ?? [];
    list.push(q.id);
    map.set(stem, list);
  }
  let groups = 0;
  let rowsInGroups = 0;
  let excess = 0;
  for (const ids of map.values()) {
    if (ids.length > 1) {
      groups += 1;
      rowsInGroups += ids.length;
      excess += ids.length - 1;
    }
  }
  return { groups, rowsInGroups, excess, uniqueStems: map.size };
}

function main() {
  const bank = loadPlacementBankSync(path.resolve(process.cwd()));

  const badIds = new Set<string>();
  const issuesByCode = new Map<string, number>();
  const examples = new Map<string, string[]>();

  for (const q of bank) {
    const all = [...auditPlacementQuestion(q), ...coherenceProxyIssues(q)];
    for (const i of all) {
      badIds.add(q.id);
      issuesByCode.set(i.code, (issuesByCode.get(i.code) ?? 0) + 1);
      const ex = examples.get(i.code) ?? [];
      if (ex.length < 5) {
        ex.push(`${q.id}: ${i.message}`);
        examples.set(i.code, ex);
      }
    }
  }

  const good = bank.length - badIds.size;
  const bad = badIds.size;

  const dup = countStemDupes(bank);

  const report = {
    meta: {
      totalRows: bank.length,
      definitionsUsed: {
        good:
          "No automated structural failure AND no automated coherence-proxy hit on this row (see meta.disclaimer).",
        bad: "At least one structural audit issue OR coherence-proxy issue was detected for this row.",
        duplicateSameQuestion:
          "Another row shares the exact same normalized English learner stem: trim(lower(instructionEn + newline + questionEn))).",
      },
      disclaimer:
        "True semantic judgment (whether the prompt and the keyed answer both 'make sense' to a human) is not fully automatable. Rows counted as GOOD here can still be weak or unnatural; rows counted BAD are at least suspicious by code rules.",
    },
    counts: {
      good,
      bad,
      badUniqueIds: badIds.size,
    },
    duplicateEnglishStem: {
      uniqueStems: dup.uniqueStems,
      stemsSharedByMoreThanOneQuestion: dup.groups,
      rowsThatShareTheirStemWithSomeoneElse: dup.rowsInGroups,
      redundantCopiesBeyondFirstPerStem: dup.excess,
    },
    badIssueCodes: Object.fromEntries([...issuesByCode.entries()].sort((a, b) => b[1] - a[1])),
    sampleMessagesPerCode: Object.fromEntries(examples),
  };

  console.error(report.meta.disclaimer);
  console.log(JSON.stringify(report, null, 2));
}

main();
