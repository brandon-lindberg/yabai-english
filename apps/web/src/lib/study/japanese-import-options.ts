import { parseArgs } from "node:util";
import { z } from "zod";

const refreshGuard = z.object({ expectedSnapshotId: z.string().regex(/^ja-study:[a-f0-9]{64}$/), expectedCardsSha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export type JapaneseDraftRefreshGuard = z.infer<typeof refreshGuard>;
export const parseJapaneseDraftRefreshGuard = (value: unknown) => refreshGuard.parse(value);
type ImportOptions = { mode: "verify" | "inspect" | "import" } | { mode: "refresh"; refresh: JapaneseDraftRefreshGuard };

export function parseJapaneseStudyImportOptions(args: string[]): ImportOptions {
  const { values } = parseArgs({ args, strict: true, allowPositionals: false, options: {
    "inspect-draft": { type: "boolean" }, "import-draft": { type: "boolean" },
    "refresh-draft-from": { type: "string" }, "expected-cards-sha256": { type: "string" },
  } });
  const refreshing = values["refresh-draft-from"] !== undefined;
  if ([values["inspect-draft"], values["import-draft"], refreshing].filter(Boolean).length > 1
    || (!refreshing && values["expected-cards-sha256"] !== undefined)) throw new Error("Choose one Japanese draft operation");
  if (refreshing) return { mode: "refresh", refresh: parseJapaneseDraftRefreshGuard({ expectedSnapshotId: values["refresh-draft-from"], expectedCardsSha256: values["expected-cards-sha256"] }) };
  return { mode: values["inspect-draft"] ? "inspect" : values["import-draft"] ? "import" : "verify" };
}
