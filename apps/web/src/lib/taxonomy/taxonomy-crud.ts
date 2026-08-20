import { NextResponse } from "next/server";
import { z } from "zod";
import { slugifyTaxonomyCode } from "@/lib/slugify-taxonomy-code";

/**
 * Class levels and class types are the same CRUD, four times over.
 *
 * `teacher/class-levels`, `teacher/class-types`, and their school-scoped twins
 * under `org/…` were eight route files, ~850 lines, that a name-normalising
 * diff showed to be identical apart from one comment and a line wrap. Each
 * carried its own copy of the create-or-reactivate logic, the sort-order
 * calculation and the ownership check.
 *
 * Both models are `{ id, code, labelEn, labelJa, sortOrder, active }` scoped by
 * one owner column, so the delegate and the scope are parameters and the
 * behaviour lives here once.
 */

export const taxonomyCreateSchema = z
  .object({
    labelEn: z.string().trim().min(1).max(100),
    labelJa: z.string().trim().max(100).optional().nullable(),
    /** Optional override; auto-derived from labelEn if omitted. */
    code: z.string().trim().min(1).max(64).optional(),
  })
  .strip();

export const taxonomyUpdateSchema = z.object({
  code: z.string().trim().min(1).max(64).optional(),
  labelEn: z.string().trim().min(1).max(100).optional(),
  labelJa: z.string().trim().max(100).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  active: z.boolean().optional(),
});

type TaxonomyRecord = {
  id: string;
  code: string;
  labelEn: string;
  labelJa: string | null;
  sortOrder: number;
  active: boolean;
};

/**
 * The slice of a Prisma model delegate this module uses. Structural rather than
 * importing four generated types, so a fifth taxonomy needs no change here.
 */
export type TaxonomyDelegate = {
  findMany: (args: unknown) => Promise<TaxonomyRecord[]>;
  findUnique: (args: unknown) => Promise<TaxonomyRecord | null>;
  create: (args: unknown) => Promise<TaxonomyRecord>;
  update: (args: unknown) => Promise<TaxonomyRecord>;
};

/** Which owner column scopes this taxonomy, and to which id. */
export type TaxonomyScope = { column: "teacherId" | "schoolId"; id: string };

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/** Parse a request body, distinguishing bad JSON from a failed schema. */
export async function parseJsonBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; res: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, res: jsonError("Invalid JSON", 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

export async function listTaxonomy(delegate: TaxonomyDelegate, scope: TaxonomyScope) {
  return delegate.findMany({
    where: { [scope.column]: scope.id, active: true },
    orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }],
  });
}

/**
 * Create an entry, or bring back one that was soft-deleted under the same code.
 *
 * Reactivating rather than inserting is what stops a teacher who removes
 * "Beginner" and adds it again from colliding with the unique `(owner, code)`
 * index.
 */
export async function createTaxonomyEntry({
  delegate,
  scope,
  input,
  conflictMessage,
}: {
  delegate: TaxonomyDelegate;
  scope: TaxonomyScope;
  input: z.infer<typeof taxonomyCreateSchema>;
  conflictMessage: string;
}): Promise<{ ok: true; record: TaxonomyRecord } | { ok: false; res: NextResponse }> {
  const code =
    (input.code && slugifyTaxonomyCode(input.code)) || slugifyTaxonomyCode(input.labelEn);
  if (!code) {
    return { ok: false, res: jsonError("Name must contain at least one letter or digit.", 400) };
  }

  // The composite unique index, not a filtered scan: `(owner, code)` is unique,
  // so this is the precise lookup rather than "first row that happens to match".
  const existing = await delegate.findUnique({
    where: { [`${scope.column}_code`]: { [scope.column]: scope.id, code } },
    select: { id: true, active: true },
  });
  if (existing?.active) {
    return { ok: false, res: jsonError(conflictMessage, 409) };
  }

  const last = await delegate.findMany({
    where: { [scope.column]: scope.id },
    orderBy: { sortOrder: "desc" },
    take: 1,
    select: { sortOrder: true },
  });
  const sortOrder = (last[0]?.sortOrder ?? -1) + 1;

  const data = {
    code,
    labelEn: input.labelEn,
    labelJa: input.labelJa ?? null,
    sortOrder,
  };

  const record = existing
    ? await delegate.update({ where: { id: existing.id }, data: { ...data, active: true } })
    : await delegate.create({ data: { [scope.column]: scope.id, ...data } });

  return { ok: true, record };
}

/**
 * Load an entry only if it belongs to the caller's scope.
 *
 * Every detail route re-implemented this. Returning 404 rather than 403 for
 * someone else's id is deliberate — it does not confirm the id exists.
 */
export async function findOwnedTaxonomyEntry({
  delegate,
  scope,
  id,
}: {
  delegate: TaxonomyDelegate;
  scope: TaxonomyScope;
  id: string;
}): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const existing = (await delegate.findUnique({
    where: { id },
    select: { id: true, [scope.column]: true },
  })) as (TaxonomyRecord & Record<string, unknown>) | null;

  if (!existing || existing[scope.column] !== scope.id) {
    return { ok: false, res: jsonError("Not found", 404) };
  }
  return { ok: true };
}
