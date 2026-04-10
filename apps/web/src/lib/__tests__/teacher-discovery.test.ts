import { describe, expect, test } from "vitest";
import { filterTeacherCards, type TeacherCard } from "@/lib/teacher-discovery";

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
});
