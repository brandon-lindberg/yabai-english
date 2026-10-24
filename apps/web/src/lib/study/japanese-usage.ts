/** Learner labels for JMdict codes in the pinned catalog; source codes stay unchanged. */
export const japaneseUsageLabels: Readonly<Record<string, readonly [string, string]>> = {
  n: ["Noun", "名詞"], "n-pref": ["Noun used as a prefix", "接頭語的に使う名詞"], "n-suf": ["Noun used as a suffix", "接尾語的に使う名詞"],
  pn: ["Pronoun", "代名詞"], num: ["Number", "数詞"], ctr: ["Counter", "助数詞"],
  "adj-i": ["I-adjective", "イ形容詞"], "adj-ix": ["I-adjective (いい・よい type)", "イ形容詞（いい・よい型）"],
  "adj-na": ["Na-adjective", "ナ形容詞"], "adj-no": ["Noun used with の", "「の」で名詞を修飾"],
  "adj-f": ["Noun or verb used before a noun", "名詞の前で修飾する名詞・動詞"], "adj-pn": ["Prenoun modifier", "連体詞"],
  "adj-t": ["Taru adjective", "タル形容詞"], "adj-nari": ["Nari adjective (classical)", "ナリ活用形容動詞（古語）"],
  adv: ["Adverb", "副詞"], "adv-to": ["Adverb used with と", "「と」を伴う副詞"],
  aux: ["Auxiliary", "補助語"], "aux-adj": ["Auxiliary adjective", "補助形容詞"], "aux-v": ["Auxiliary verb", "補助動詞"],
  conj: ["Conjunction", "接続詞"], exp: ["Expression", "表現"], int: ["Interjection", "感動詞"],
  pref: ["Prefix", "接頭語"], suf: ["Suffix", "接尾語"], prt: ["Particle", "助詞"],
  v1: ["Ichidan verb", "一段動詞"], "v1-s": ["Ichidan verb (くれる type)", "一段動詞（くれる型）"],
  "v2a-s": ["Nidan verb ending in う (classical)", "二段動詞（う・古語）"],
  v5aru: ["Godan verb (special ある type)", "五段動詞（ある特殊型）"],
  v5b: ["Godan verb (ぶ ending)", "五段動詞（ぶ）"], v5g: ["Godan verb (ぐ ending)", "五段動詞（ぐ）"],
  v5k: ["Godan verb (く ending)", "五段動詞（く）"], "v5k-s": ["Godan verb (行く type)", "五段動詞（行く型）"],
  v5m: ["Godan verb (む ending)", "五段動詞（む）"], v5n: ["Godan verb (ぬ ending)", "五段動詞（ぬ）"],
  v5r: ["Godan verb (る ending)", "五段動詞（る）"], "v5r-i": ["Godan verb (irregular る type)", "五段動詞（る・不規則型）"],
  v5s: ["Godan verb (す ending)", "五段動詞（す）"], v5t: ["Godan verb (つ ending)", "五段動詞（つ）"],
  v5u: ["Godan verb (う ending)", "五段動詞（う）"], "v5u-s": ["Godan verb (special う type)", "五段動詞（う特殊型）"],
  vi: ["Intransitive verb", "自動詞"], vt: ["Transitive verb", "他動詞"], vk: ["Kuru verb", "カ行変格動詞（来る）"],
  vs: ["Noun used with する", "「する」を伴う名詞"], "vs-i": ["Suru verb (included)", "サ行変格動詞（するを含む）"],
  "vs-s": ["Suru verb (special form)", "サ行変格動詞（特殊型）"], vz: ["Zuru verb", "「ずる」で終わる動詞"],
  abbr: ["Abbreviation", "略語"], arch: ["Archaic usage", "古語"], rare: ["Rare usage", "まれな用法"],
  derog: ["Derogatory usage", "侮蔑的な用法"], form: ["Formal usage", "改まった用法"], poet: ["Poetic usage", "詩的な用法"],
  "on-mim": ["Onomatopoeic or mimetic word", "擬音語・擬態語"],
  uk: ["Usually written in kana", "通常は仮名で表記"], ateji: ["Phonetic kanji spelling (ateji)", "当て字"],
  rK: ["Rare kanji spelling", "まれな漢字表記"], rk: ["Rare kana spelling", "まれな仮名表記"],
  sK: ["Kanji form for dictionary lookup only", "辞書検索用の漢字表記"], ok: ["Outdated kana spelling", "古い仮名表記"],
  io: ["Irregular okurigana", "不規則な送り仮名"], gikun: ["Special kanji reading (gikun or jukujikun)", "義訓・熟字訓"],
  Buddh: ["Buddhism", "仏教"], finc: ["Finance", "金融"], shogi: ["Shogi", "将棋"],
  "after an author's name": ["after an author's name", "著者名の後に付く"],
  "after the name of a male of equal or lower status": ["after the name of a male of equal or lower status", "同等または目下の男性の名前の後に付く"],
  "concerning the actions of the listener or concerning the ideas expressed or understood by the listener; with a neg. sentence, implies that something isn't as much as one might think": ["concerning the actions of the listener or concerning the ideas expressed or understood by the listener; with a negative sentence, implies that something isn't as much as one might think", "聞き手の行動や、聞き手が述べたり理解したりする考えについて使う。否定文では、思うほどではないという意味を表す"],
  "esp. たち": ["especially when read たち", "特に「たち」と読む場合"],
  "esp. 一人, １人": ["especially the spellings 一人 and １人", "特に「一人」「１人」の表記"],
  "precedes the thing being counted; e.g. ３か月, ５か所; also written as ヶ or ケ": ["before the thing being counted, e.g. ３か月 or ５か所; also written ヶ or ケ", "数える対象の前に置く（例：３か月、５か所）。「ヶ」「ケ」とも表記"],
  "slightly formal or feminine": ["slightly formal or feminine", "やや改まった表現、または女性的な表現"],
  "sometimes pronounced ぴん": ["sometimes pronounced ぴん", "「ぴん」と発音することもある"],
  "used after a noun or na-adjective; also ったれ": ["after a noun or na-adjective; also ったれ", "名詞・ナ形容詞の後に付く。「ったれ」の形も使う"],
  "used to express agreement with something said": ["expresses agreement with something said", "相手の発言への同意を表す"],
  "used to indicate an incorrect answer, etc.": ["indicates an incorrect answer, etc.", "不正解などを示す"],
  "usu. 〜と": ["usually used as 〜と", "通常は「〜と」の形で使う"],
  "usu. 翔る": ["usually written 翔る", "通常は「翔る」と表記"],
  "with neg. sentence": ["used in negative sentences", "否定文で使う"],
  "余 is ateji": ["余 is a phonetic kanji spelling (ateji)", "「余」は当て字"],
  "陸 is used in legal documents": ["陸 is used in legal documents", "「陸」は法的文書で使う"],
};

export function describeJapaneseUsage(value: string, locale: string) {
  const label = Object.hasOwn(japaneseUsageLabels, value) ? japaneseUsageLabels[value] : undefined;
  const lang = label && locale.startsWith("ja") ? "ja" : "en";
  return { text: label ? label[lang === "ja" ? 1 : 0] : value, lang, translated: !!label };
}

type UsageSource = { content: { pos?: string[] }; referenceSupplement?: {
  written?: { tags?: string[] } | null; reading: { tags?: string[] };
  senses: { misc?: string[]; info?: string[]; field?: string[]; dialect?: string[] }[];
} };
/** One member-specific extraction for compiler, review inventory and learner labels. */
export function japaneseVocabularyUsage(record: UsageSource): string[] {
  return [...new Set([
    ...(record.content.pos ?? []), ...(record.referenceSupplement?.written?.tags ?? []), ...(record.referenceSupplement?.reading.tags ?? []),
    ...(record.referenceSupplement?.senses.flatMap(sense => [...(sense.misc ?? []), ...(sense.info ?? []), ...(sense.field ?? []), ...(sense.dialect ?? [])]) ?? []),
  ])];
}
