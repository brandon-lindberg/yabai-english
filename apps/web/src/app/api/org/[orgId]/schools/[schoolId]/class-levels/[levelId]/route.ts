import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/org/require-school-access";
import {
  findOwnedTaxonomyEntry,
  parseJsonBody,
  taxonomyUpdateSchema,
  type TaxonomyDelegate,
} from "@/lib/taxonomy/taxonomy-crud";

type RouteContext = {
  params: Promise<{ orgId: string; schoolId: string; levelId: string }>;
};

const delegate = prisma.schoolClassLevel as unknown as TaxonomyDelegate;

export async function PATCH(req: Request, ctx: RouteContext): Promise<NextResponse> {
  const access = await requireSchoolAccess(
    ctx.params as Promise<{ orgId: string; schoolId: string }>,
    { adminOnly: true },
  );
  if (!access.ok) return access.res;

  const { levelId } = await ctx.params;
  const owned = await findOwnedTaxonomyEntry({
    delegate,
    scope: { column: "schoolId", id: access.schoolId },
    id: levelId,
  });
  if (!owned.ok) return owned.res;

  const body = await parseJsonBody(req, taxonomyUpdateSchema);
  if (!body.ok) return body.res;

  const classLevel = await delegate.update({ where: { id: levelId }, data: body.data });
  return NextResponse.json({ classLevel });
}

export async function DELETE(_req: Request, ctx: RouteContext): Promise<NextResponse> {
  const access = await requireSchoolAccess(
    ctx.params as Promise<{ orgId: string; schoolId: string }>,
    { adminOnly: true },
  );
  if (!access.ok) return access.res;

  const { levelId } = await ctx.params;
  const owned = await findOwnedTaxonomyEntry({
    delegate,
    scope: { column: "schoolId", id: access.schoolId },
    id: levelId,
  });
  if (!owned.ok) return owned.res;

  // Soft delete: the code stays reserved so re-adding the same name reactivates
  // the original row rather than colliding with the unique index.
  await delegate.update({ where: { id: levelId }, data: { active: false } });
  return NextResponse.json({ success: true });
}
