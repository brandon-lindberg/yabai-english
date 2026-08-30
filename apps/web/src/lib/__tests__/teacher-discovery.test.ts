import { describe, expect, test } from "vitest";
import {
  filterTeacherCards,
  sortOwnTeachersFirst,
  type TeacherCard,
} from "@/lib/teacher-discovery";

const TEACHERS: TeacherCard[] = [
  {
    id: "t1",
    displayName: "Mika",
    imageUrl: null,
    countryOfOrigin: "Japan",
    specialties: ["business", "conversation"],
    instructionLanguages: ["JP", "EN"],
    rateYen: 4200,
    activeAvailabilityCount: 3,
  },
  {
    id: "t2",
    displayName: "Alex",
    imageUrl: null,
    countryOfOrigin: "Canada",
    specialties: ["exam"],
    instructionLanguages: ["EN"],
    rateYen: 3600,
    activeAvailabilityCount: 0,
  },
];

describe("filterTeacherCards", () => {
  test("returns only teachers with active availability", () => {
    const result = filterTeacherCards(TEACHERS, {});
    expect(result.map((t) => t.id)).toEqual(["t1"]);
  });

  test("filters by specialty", () => {
    const result = filterTeacherCards(TEACHERS, { specialty: "business" });
    expect(result.map((t) => t.id)).toEqual(["t1"]);
  });

  test("filters by instruction language", () => {
    const result = filterTeacherCards(TEACHERS, { language: "EN" });
    expect(result.map((t) => t.id)).toEqual(["t1"]);
  });

  // Stripe is the only way to pay, so which provider a teacher is connected to
  // tells a student nothing they can act on. The browse card does not carry it,
  // which is what keeps it off the screen.
  test("carries no payment provider or method data", () => {
    for (const teacher of TEACHERS) {
      expect(Object.keys(teacher)).not.toContain("paymentMethods");
    }

    const card: TeacherCard = {
      id: "t3",
      displayName: "Rin",
      imageUrl: null,
      countryOfOrigin: "Japan",
      specialties: [],
      instructionLanguages: ["EN"],
      rateYen: 3500,
      activeAvailabilityCount: 1,
      // @ts-expect-error the card type must not accept payment methods
      paymentMethods: [],
    };

    expect(card.id).toBe("t3");
  });
});

describe("sortOwnTeachersFirst", () => {
  const card = (id: string, displayName: string): TeacherCard => ({
    id,
    displayName,
    countryOfOrigin: null,
    specialties: [],
    instructionLanguages: [],
    rateYen: null,
    activeAvailabilityCount: 1,
  });

  test("lifts the student's own teachers above the public listings", () => {
    const cards = [card("pub-1", "Public A"), card("mine", "My Teacher"), card("pub-2", "Public B")];

    const sorted = sortOwnTeachersFirst(cards, new Set(["mine"]));

    expect(sorted.map((c) => c.id)).toEqual(["mine", "pub-1", "pub-2"]);
  });

  test("keeps the incoming order within each group", () => {
    const cards = [
      card("pub-1", "Public A"),
      card("mine-2", "Mine Two"),
      card("pub-2", "Public B"),
      card("mine-1", "Mine One"),
    ];

    const sorted = sortOwnTeachersFirst(cards, new Set(["mine-1", "mine-2"]));

    expect(sorted.map((c) => c.id)).toEqual(["mine-2", "mine-1", "pub-1", "pub-2"]);
  });

  test("leaves the list untouched when the viewer has no teachers", () => {
    const cards = [card("pub-1", "Public A"), card("pub-2", "Public B")];

    expect(sortOwnTeachersFirst(cards, new Set()).map((c) => c.id)).toEqual([
      "pub-1",
      "pub-2",
    ]);
  });

  test("does not mutate the array it is given", () => {
    const cards = [card("pub-1", "Public A"), card("mine", "My Teacher")];

    sortOwnTeachersFirst(cards, new Set(["mine"]));

    expect(cards.map((c) => c.id)).toEqual(["pub-1", "mine"]);
  });
});
