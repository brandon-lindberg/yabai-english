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
  params: Promise<{ orgId: string; schoolId: string; typeId: string }>;
};

const delegate = prisma.schoolClassType as unknown as TaxonomyDelegate;

export async function PATCH(req: Request, ctx: RouteContext): Promise<NextResponse> {
  const access = await requireSchoolAccess(
    ctx.params as Promise<{ orgId: string; schoolId: string }>,
    { adminOnly: true },
  );
  if (!access.ok) return access.res;

  const { typeId } = await ctx.params;
  const owned = await findOwnedTaxonomyEntry({
    delegate,
    scope: { column: "schoolId", id: access.schoolId },
    id: typeId,
  });
  if (!owned.ok) return owned.res;

  const body = await parseJsonBody(req, taxonomyUpdateSchema);
  if (!body.ok) return body.res;

  const classType = await delegate.update({ where: { id: typeId }, data: body.data });
  return NextResponse.json({ classType });
}

export async function DELETE(_req: Request, ctx: RouteContext): Promise<NextResponse> {
  const access = await requireSchoolAccess(
    ctx.params as Promise<{ orgId: string; schoolId: string }>,
    { adminOnly: true },
  );
  if (!access.ok) return access.res;

  const { typeId } = await ctx.params;
  const owned = await findOwnedTaxonomyEntry({
    delegate,
    scope: { column: "schoolId", id: access.schoolId },
    id: typeId,
  });
  if (!owned.ok) return owned.res;

  // Soft delete: the code stays reserved so re-adding the same name reactivates
  // the original row rather than colliding with the unique index.
  await delegate.update({ where: { id: typeId }, data: { active: false } });
  return NextResponse.json({ success: true });
}
