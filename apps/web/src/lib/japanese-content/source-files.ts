import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import {
  JLPT_LEVELS, parseReferenceCsv, verifySourceIntegrity,
  type JapaneseCorpusInput,
} from "./corpus-audit";

const cacheName = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._+-]*$/);
const sourceSchema = z.object({
  id: cacheName,
  role: z.enum(["vocab", "kanji", "reference", "metadata", "licence", "jmdict", "kanjidic"]),
  level: z.enum(JLPT_LEVELS).optional(),
  url: z.string().url().startsWith("https://"), filename: cacheName,
  archiveMember: cacheName.optional(),
  integrity: z.discriminatedUnion("algorithm", [
    z.object({ algorithm: z.literal("git-sha1"), digest: z.string().regex(/^[a-f0-9]{40}$/) }),
    z.object({ algorithm: z.literal("sha256"), digest: z.string().regex(/^[a-f0-9]{64}$/) }),
  ]),
  source: z.string().url(), license: z.string().min(1),
});
export type PinnedSource = z.infer<typeof sourceSchema>;
const lockSchema = z.object({
  schemaVersion: z.literal(1),
  openjlptCommit: z.string().regex(/^[a-f0-9]{40}$/),
  referenceCommit: z.string().regex(/^[a-f0-9]{40}$/),
  dictionaryRelease: z.string().min(1), files: z.array(sourceSchema),
});
export type SourceLock = z.infer<typeof lockSchema>;

export function parseSourceLock(value: unknown): SourceLock {
  const lock = lockSchema.parse(value);
  for (const key of ["id", "filename"] as const) {
    if (new Set(lock.files.map((file) => file[key])).size !== lock.files.length) throw new Error(`Duplicate source ${key}`);
  }
  for (const role of ["vocab", "kanji", "reference"] as const) for (const level of JLPT_LEVELS) {
    if (lock.files.filter((file) => file.role === role && file.level === level).length !== 1) throw new Error(`Expected exactly one ${role} file for ${level}`);
  }
  for (const role of ["metadata", "jmdict", "kanjidic"] as const) {
    if (lock.files.filter((file) => file.role === role).length !== 1) throw new Error(`Expected exactly one ${role} source`);
  }
  for (const file of lock.files) {
    const commit = file.role === "reference" || file.id.startsWith("waller-") ? lock.referenceCommit : lock.openjlptCommit;
    if (file.integrity.algorithm === "git-sha1" && !file.url.includes(`/${commit}/`)) throw new Error(`Unpinned source URL: ${file.id}`);
    if (["jmdict", "kanjidic"].includes(file.role) && (!file.archiveMember || !file.url.includes(encodeURIComponent(lock.dictionaryRelease)))) throw new Error(`Unpinned dictionary release: ${file.id}`);
  }
  return lock;
}

async function cachedBytes(source: PinnedSource, cacheDir: string): Promise<Buffer> {
  try {
    const bytes = await readFile(join(cacheDir, source.filename));
    verifySourceIntegrity(bytes, source.integrity);
    return bytes;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error(`Missing source ${source.id}. Run japanese-content:audit --fetch first.`);
    throw error;
  }
}

export async function readPinnedSource(source: PinnedSource, cacheDir: string): Promise<string> {
  const bytes = await cachedBytes(source, cacheDir);
  if (!source.archiveMember) return bytes.toString("utf8");
  // Read one known member from a verified archive; never extract paths into the workspace.
  return execFileSync("tar", ["-xOf", join(cacheDir, source.filename), source.archiveMember], { maxBuffer: 256 * 1024 * 1024 }).toString("utf8");
}

export async function fetchPinnedSources(sources: PinnedSource[], cacheDir: string, fetcher: typeof fetch = fetch): Promise<void> {
  await mkdir(cacheDir, { recursive: true });
  for (const source of sources) {
    const target = join(cacheDir, source.filename);
    try {
      const bytes = await readFile(target);
      verifySourceIntegrity(bytes, source.integrity);
      continue;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const response = await fetcher(source.url, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`Source ${source.id}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    verifySourceIntegrity(bytes, source.integrity);
    const temporary = `${target}.${process.pid}.partial`;
    try {
      await writeFile(temporary, bytes, { flag: "wx" });
      await rename(temporary, target);
    } finally {
      await rm(temporary, { force: true });
    }
  }
}

export async function loadJapaneseCorpus(lock: SourceLock, cacheDir: string): Promise<JapaneseCorpusInput> {
  const input: JapaneseCorpusInput = { vocabulary: [], kanji: [], referenceVocabulary: [], dictionaryWords: [], dictionaryKanji: [] };
  let metadata: { counts: Record<"vocab" | "kanji", Record<string, number>> } | undefined;
  // Files are ordered in the lock. Read corpus files before the two larger dictionary archives.
  for (const file of lock.files) {
    const content = await readPinnedSource(file, cacheDir);
    if (file.role === "licence") continue;
    if (file.role === "reference") {
      input.referenceVocabulary.push(...parseReferenceCsv(content, file.level!));
      continue;
    }
    const data = JSON.parse(content);
    if (file.role === "metadata") metadata = data;
    else if (file.role === "vocab" || file.role === "kanji") {
      if (!Array.isArray(data) || data.some((row) => row?.level !== file.level)) throw new Error(`Source ${file.id}: file/record level disagreement`);
      (file.role === "vocab" ? input.vocabulary : input.kanji).push(...data);
    } else if (file.role === "jmdict") {
      if (!Array.isArray(data.words)) throw new Error("Expected the complete JMdict words array");
      const wanted = new Set([...input.vocabulary.map((row) => String(row.jmdict_id)), ...input.referenceVocabulary.map((row) => row.jmdict_seq)]);
      input.dictionaryWords = data.words.filter((row: { id: string }) => wanted.has(row.id)).map((row: JapaneseCorpusInput["dictionaryWords"][number]) => ({
        id: row.id, kanji: row.kanji.map(({ text }) => ({ text })),
        kana: row.kana.map(({ text, appliesToKanji }) => ({ text, appliesToKanji })),
      }));
    } else if (file.role === "kanjidic") {
      if (!Array.isArray(data.characters)) throw new Error("Expected the complete KANJIDIC2 characters array");
      const wanted = new Set(input.kanji.map((row) => row.character));
      input.dictionaryKanji = data.characters.filter((row: { literal: string }) => wanted.has(row.literal)).map((row: JapaneseCorpusInput["dictionaryKanji"][number]) => ({ literal: row.literal, readingMeaning: row.readingMeaning }));
    }
  }
  for (const role of ["vocab", "kanji"] as const) for (const level of JLPT_LEVELS) {
    const rows = role === "vocab" ? input.vocabulary : input.kanji;
    if (rows.filter((row) => row.level === level).length !== metadata?.counts[role][level]) throw new Error(`Metadata count mismatch for ${role}/${level}`);
  }
  return input;
}
