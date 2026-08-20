import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Guards the rule that let an answer key onto a public route.
 *
 * `include:` returns every scalar column a Prisma model has — including any
 * column it gains later. That is how `Exercise.content` (answer key and all)
 * ended up in the unauthenticated /api/courses payload without anyone editing
 * that file, and how every marketplace teacher's `googleCalendarRefreshToken`
 * was being read on each render of the browse page.
 *
 * So: models that carry a secret must be queried with `select:`, which fails
 * closed — a new sensitive column is absent until someone asks for it by name.
 *
 * This is a lint, not a proof. It cannot see through helpers, and it does not
 * claim a query is safe just because it uses `select`.
 */

const SRC = path.join(__dirname, "..", "..");

/**
 * Prisma models with at least one column that must never be serialised.
 * Keep this list in step with prisma/schema.prisma.
 */
const SECRET_BEARING_MODELS: Record<string, string> = {
  teacherProfile: "googleCalendarRefreshToken",
  googleIntegrationAccount: "accessToken / refreshToken / tokenMetadataJson",
  account: "access_token / refresh_token / id_token",
  session: "sessionToken",
  verificationToken: "token",
  placementBankQuestion: "correctIndex",
};

/**
 * Files that genuinely need the secret they fetch.
 *
 * This list is the point of the test as much as the assertion is: it is the
 * audited set of places that touch a token or an answer key. Adding to it
 * should be a deliberate act with a reason, not a way to quiet a failure.
 */
const ALLOWED = [
  // Google credentials — these are the code that actually calls Google.
  "lib/google-calendar.ts",
  "lib/google/oauth-service.ts",
  "lib/google/post-meeting.ts",
  "lib/booking-payment-confirmation.ts",
  "lib/teacher-calendar-status.ts",
  "lib/calendar-token.ts",
  // Creates the Meet/Calendar event when a booking confirms, so it reads the
  // teacher's refresh token. Returns the booking, never the teacher.
  "app/api/bookings/route.ts",
  // The answer key lives here and is stripped by `toPublicQuestion` before it
  // reaches /api/placement.
  "lib/placement-bank/placement-bank-access.ts",
  "lib/placement-test.ts",
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "generated" || entry === "__tests__") continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Find `prisma.<model>.find*({ ... })` calls and report whether the options
 * object opens with `include:` rather than `select:`. Brace-matched rather than
 * regex-matched so a nested `include` on a relation does not count.
 */
function findsUsingInclude(source: string, model: string): number {
  const pattern = new RegExp(`prisma\\.${model}\\.find\\w*\\(\\s*\\{`, "g");
  let count = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    const start = match.index + match[0].length;
    let depth = 1;
    let i = start;
    for (; i < source.length && depth > 0; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") depth--;
    }
    const body = source.slice(start, i - 1);

    // Only top-level keys of the options object matter.
    let topLevel = "";
    let nest = 0;
    for (const ch of body) {
      if (ch === "{" || ch === "[" || ch === "(") nest++;
      else if (ch === "}" || ch === "]" || ch === ")") nest--;
      else if (nest === 0) topLevel += ch;
    }

    if (/(^|,)\s*include\s*:/.test(topLevel)) count++;
  }
  return count;
}

describe("secret-bearing models are queried with select, not include", () => {
  const files = walk(SRC).filter((f) => {
    const rel = path.relative(SRC, f).replace(/\\/g, "/");
    return !ALLOWED.includes(rel);
  });

  for (const [model, secret] of Object.entries(SECRET_BEARING_MODELS)) {
    test(`prisma.${model} — would expose ${secret}`, () => {
      const offenders: string[] = [];
      for (const file of files) {
        const source = readFileSync(file, "utf8");
        if (!source.includes(`prisma.${model}.find`)) continue;
        const hits = findsUsingInclude(source, model);
        if (hits > 0) {
          offenders.push(`${path.relative(SRC, file).replace(/\\/g, "/")} (${hits})`);
        }
      }

      expect(
        offenders,
        `Use \`select:\` so ${secret} is not fetched. Offenders:\n  ${offenders.join("\n  ")}`,
      ).toEqual([]);
    });
  }
});

describe("exercise content is stripped before it leaves the server", () => {
  /**
   * `Exercise.content` holds the answer key inline, so it is not covered by the
   * model rule above — every path that serialises it must run it through
   * `toPublicExerciseContent`.
   */
  const serialisingFiles = [
    "app/api/courses/route.ts",
    "app/[locale]/learn/lesson/[lessonId]/page.tsx",
  ];

  for (const rel of serialisingFiles) {
    test(rel, () => {
      const source = readFileSync(path.join(SRC, rel), "utf8");
      expect(source).toContain("toPublicExerciseContent");
    });
  }

  test("no route sends a raw exercise content column to the client", () => {
    const offenders: string[] = [];
    for (const file of walk(path.join(SRC, "app"))) {
      const source = readFileSync(file, "utf8");
      // Passing raw content to the server-side grader is the correct use; it is
      // handing it to a client that is not.
      if (source.includes("gradeExercise")) continue;
      if (/content:\s*(ex|exercise)\.content\b/.test(source)) {
        offenders.push(path.relative(SRC, file).replace(/\\/g, "/"));
      }
    }
    expect(offenders).toEqual([]);
  });
});
