import type { PrismaClient } from "@/generated/prisma/client";
import { loadApprovedJapaneseBank, type JapanesePlacementBank } from "../japanese-placement/bank";
import { publishJapaneseBank } from "../japanese-placement/service";
import { importJapaneseStudyDraft, japaneseStudyPublicationGuard, prepareJapaneseStudyImport, publishJapaneseStudyDraft } from "../study/japanese-import";
import { parseJapaneseDraftRefreshGuard, type JapaneseDraftRefreshGuard } from "../study/japanese-import-options";
import type { JapaneseFlashcardCatalog } from "./flashcard-catalog";
import type { JapaneseStudyCatalog } from "./study-catalog";

export type JapaneseDeploymentArtifacts = {
  bank: JapanesePlacementBank;
  source: JapaneseFlashcardCatalog;
  study: JapaneseStudyCatalog;
};

/** Deployment never falls back to DATABASE_URL or local environment files. */
export function japaneseDeploymentDatabaseTarget(connectionString: string | undefined, expectedHost: string, expectedDatabase: string) {
  if (!connectionString) throw new Error("JAPANESE_RELEASE_DATABASE_URL is required for deployment database operations");
  let url: URL;
  let database: string;
  try {
    url = new URL(connectionString);
    database = decodeURIComponent(url.pathname.slice(1));
  } catch {
    throw new Error("Invalid deployment database target");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== expectedHost.toLowerCase() || database !== expectedDatabase
    || (url.searchParams.has("schema") && url.searchParams.get("schema") !== "public")) {
    throw new Error("Deployment database target must match the explicit host, database name and public schema");
  }
  return { hostname: url.hostname, database };
}

export function assertJapaneseDeploymentPins(plan: ReturnType<typeof prepareJapaneseStudyImport>, publication: JapaneseDraftRefreshGuard) {
  const actual = japaneseStudyPublicationGuard(plan);
  parseJapaneseDraftRefreshGuard(publication);
  if (publication.expectedSnapshotId !== actual.expectedSnapshotId || publication.expectedCardsSha256 !== actual.expectedCardsSha256) {
    throw new Error("Publication content pins differ from the verified artifacts");
  }
}

/** Each existing publisher commits independently. Identical retries verify completed work. */
export async function publishJapaneseDeployment(db: PrismaClient, data: JapaneseDeploymentArtifacts, publication: JapaneseDraftRefreshGuard) {
  const bank = loadApprovedJapaneseBank(data.bank);
  const plan = prepareJapaneseStudyImport(data.source, data.study);
  assertJapaneseDeploymentPins(plan, publication);
  const existing = await db.studyTrack.findUnique({ where: { slug: plan.track.slug }, select: { id: true } });
  if (!existing) await importJapaneseStudyDraft(db, data.source, data.study);
  const study = await publishJapaneseStudyDraft(db, data.source, data.study, publication);
  const snapshot = await publishJapaneseBank(db, bank);
  return { study, placement: { snapshotId: snapshot.id, version: snapshot.version, digest: snapshot.digest, publishedAt: snapshot.publishedAt } };
}
