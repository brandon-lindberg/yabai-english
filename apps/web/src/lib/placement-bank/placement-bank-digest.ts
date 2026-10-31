import { createHash } from "node:crypto";
import { canonicalJson } from "../canonical-json";
import type { LoadedPlacementQuestion } from "./load-placement-bank";

/** Stable across PostgreSQL JSONB key ordering and source-row ordering. */
export function placementBankDigest(questions: LoadedPlacementQuestion[]) {
  return createHash("sha256").update(canonicalJson([...questions].sort((a, b) => a.id.localeCompare(b.id)))).digest("hex");
}
