import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Saving availability deletes every row and recreates it from the request, so
 * any column the request does not carry is destroyed — silently, on a teacher's
 * next unrelated edit. `assignedStudentId` would have been lost that way.
 *
 * This pins the shape: every column a teacher owns must appear in the write.
 * A new column fails here until it is either round-tripped or listed below as
 * deliberately server-owned.
 */
const ROOT = process.cwd();

/** Columns the server sets, which a client must never supply. */
const SERVER_OWNED = new Set([
  "id",
  "teacherId",
  "teacher",
  "active",
  "assignedStudent", // relation; the id beside it is what round-trips
  "classLevel",
  "classType",
  "teacherLessonOffering",
]);

function availabilitySlotColumns(): string[] {
  const schema = readFileSync(path.join(ROOT, "prisma/schema.prisma"), "utf8");
  const block = schema.match(/model AvailabilitySlot \{([\s\S]*?)\n\}/)![1]!;
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//") && !line.startsWith("@@") && !line.startsWith("/"))
    .map((line) => line.split(/\s+/)[0]!)
    .filter((name) => !SERVER_OWNED.has(name));
}

describe("availability save round-trip", () => {
  const route = readFileSync(
    path.join(ROOT, "src/app/api/teacher/availability/route.ts"),
    "utf8",
  );
  const createBlock = route.slice(
    route.indexOf("createMany({"),
    route.indexOf("});", route.indexOf("createMany({")),
  );

  test("there are columns to check", () => {
    expect(availabilitySlotColumns().length).toBeGreaterThan(5);
  });

  test("every teacher-owned column is written on save", () => {
    const missing = availabilitySlotColumns().filter(
      (column) => !createBlock.includes(`${column}:`),
    );

    // If this fails, the column is dropped every time a teacher saves. Either
    // carry it through the request, or add it to SERVER_OWNED above.
    expect(missing).toEqual([]);
  });

  test("the editor sends every column the save writes", () => {
    const editor = readFileSync(
      path.join(ROOT, "src/components/dashboard/teacher-availability-calendar.tsx"),
      "utf8",
    );
    const payload = editor.slice(
      editor.indexOf("const payload = rules.map("),
      editor.indexOf("const parsed = teacherAvailabilitySchema"),
    );

    const missing = availabilitySlotColumns().filter(
      (column) => !payload.includes(`${column}:`) && !payload.includes(`slot.${column}`),
    );
    expect(missing).toEqual([]);
  });
});
