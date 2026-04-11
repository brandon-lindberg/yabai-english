export const PLACEMENT_BANK_BANDS = ["A1", "A2", "B1", "B2", "C1"] as const;
export type PlacementBankBand = (typeof PLACEMENT_BANK_BANDS)[number];

export const PLACEMENT_BANK_SECTIONS = ["grammar", "vocabulary", "reading", "functional"] as const;
export type PlacementBankSection = (typeof PLACEMENT_BANK_SECTIONS)[number];

/** Target number of JSON files per (CEFR band × section) folder. */
export const PLACEMENT_QUESTIONS_PER_BAND_SECTION = 100;

export const EXPECTED_PLACEMENT_QUESTION_TOTAL =
  PLACEMENT_BANK_BANDS.length * PLACEMENT_BANK_SECTIONS.length * PLACEMENT_QUESTIONS_PER_BAND_SECTION;
