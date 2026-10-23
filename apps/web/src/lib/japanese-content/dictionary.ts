import { z } from "zod";

const text = z.string().trim().min(1);
const strings = z.array(text);
export const dictionaryWordSchema = z.object({
  id: text, kanji: z.array(z.object({ text, common: z.boolean().optional(), tags: strings.optional() })),
  kana: z.array(z.object({ text, appliesToKanji: strings, common: z.boolean().optional(), tags: strings.optional() })).min(1),
  sense: z.array(z.object({
    partOfSpeech: strings, appliesToKanji: strings, appliesToKana: strings,
    gloss: z.array(z.object({ lang: text, text })),
    misc: strings.optional(), info: strings.optional(), field: strings.optional(), dialect: strings.optional(),
  })).optional(),
});
export type DictionaryWord = z.infer<typeof dictionaryWordSchema>;
export const toHiragana = (s: string) => s.normalize("NFC").replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
export const japaneseVocabularyPairKey = (word: string, reading: string) => `${word.normalize("NFC")}\0${toHiragana(reading)}`;

/** Preserve the dictionary's spelling/reading restrictions; never synthesize compounds. */
export function dictionaryAllowsPair(entry: DictionaryWord, written: string, reading: string): boolean {
  return entry.kana.some((kana) => {
    if (toHiragana(kana.text) !== toHiragana(reading)) return false;
    if (toHiragana(written) === toHiragana(reading)) return true;
    return entry.kanji.some((k) => k.text === written) &&
      (kana.appliesToKanji.includes("*") || kana.appliesToKanji.includes(written));
  });
}

/** One-based sense selection retains both entry-level and sense-level restrictions. */
export function dictionarySenseAllowsPair(entry: DictionaryWord, senseNumber: number, written: string, reading: string): boolean {
  const sense = entry.sense?.[senseNumber - 1];
  return !!sense && dictionaryAllowsPair(entry, written, reading) &&
    (sense.appliesToKanji.includes("*") || sense.appliesToKanji.includes(written)) &&
    (sense.appliesToKana.includes("*") || sense.appliesToKana.some((kana) => toHiragana(kana) === toHiragana(reading)));
}
