import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeacherProfile } from "@/lib/taxonomy/require-teacher-profile";
import {
  findOwnedTaxonomyEntry,
  parseJsonBody,
  taxonomyUpdateSchema,
  type TaxonomyDelegate,
} from "@/lib/taxonomy/taxonomy-crud";

type RouteContext = { params: Promise<{ levelId: string }> };

const delegate = prisma.teacherClassLevel as unknown as TaxonomyDelegate;

export async function PATCH(req: Request, ctx: RouteContext): Promise<NextResponse> {
  const guard = await requireTeacherProfile();
  if (!guard.ok) return guard.res;

  const { levelId } = await ctx.params;
  const owned = await findOwnedTaxonomyEntry({
    delegate,
    scope: { column: "teacherId", id: guard.teacherId },
    id: levelId,
  });
  if (!owned.ok) return owned.res;

  const body = await parseJsonBody(req, taxonomyUpdateSchema);
  if (!body.ok) return body.res;

  const classLevel = await delegate.update({ where: { id: levelId }, data: body.data });
  return NextResponse.json({ classLevel });
}

export async function DELETE(_req: Request, ctx: RouteContext): Promise<NextResponse> {
  const guard = await requireTeacherProfile();
  if (!guard.ok) return guard.res;

  const { levelId } = await ctx.params;
  const owned = await findOwnedTaxonomyEntry({
    delegate,
    scope: { column: "teacherId", id: guard.teacherId },
    id: levelId,
  });
  if (!owned.ok) return owned.res;

  // Soft delete: the code stays reserved so re-adding the same name reactivates
  // the original row rather than colliding with the unique index.
  await delegate.update({ where: { id: levelId }, data: { active: false } });
  return NextResponse.json({ success: true });
}
