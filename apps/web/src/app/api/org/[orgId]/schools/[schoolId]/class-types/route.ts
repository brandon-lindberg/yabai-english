import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/org/require-school-access";
import {
  createTaxonomyEntry,
  listTaxonomy,
  parseJsonBody,
  taxonomyCreateSchema,
  type TaxonomyDelegate,
} from "@/lib/taxonomy/taxonomy-crud";

type RouteContext = { params: Promise<{ orgId: string; schoolId: string }> };

const delegate = prisma.schoolClassType as unknown as TaxonomyDelegate;

export async function GET(_req: Request, ctx: RouteContext) {
  const access = await requireSchoolAccess(ctx.params);
  if (!access.ok) return access.res;

  const classTypes = await listTaxonomy(delegate, {
    column: "schoolId",
    id: access.schoolId,
  });
  return NextResponse.json({ classTypes });
}

export async function POST(req: Request, ctx: RouteContext) {
  const access = await requireSchoolAccess(ctx.params, { adminOnly: true });
  if (!access.ok) return access.res;

  const body = await parseJsonBody(req, taxonomyCreateSchema);
  if (!body.ok) return body.res;

  const created = await createTaxonomyEntry({
    delegate,
    scope: { column: "schoolId", id: access.schoolId },
    input: body.data,
    conflictMessage: "A class type with this name already exists.",
  });
  if (!created.ok) return created.res;

  return NextResponse.json({ classType: created.record }, { status: 201 });
}
