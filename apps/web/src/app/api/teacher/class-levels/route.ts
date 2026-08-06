import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeacherProfile } from "@/lib/taxonomy/require-teacher-profile";
import {
  createTaxonomyEntry,
  listTaxonomy,
  parseJsonBody,
  taxonomyCreateSchema,
  type TaxonomyDelegate,
} from "@/lib/taxonomy/taxonomy-crud";

const delegate = prisma.teacherClassLevel as unknown as TaxonomyDelegate;

export async function GET(): Promise<NextResponse> {
  const guard = await requireTeacherProfile();
  if (!guard.ok) return guard.res;

  const classLevels = await listTaxonomy(delegate, {
    column: "teacherId",
    id: guard.teacherId,
  });
  return NextResponse.json({ classLevels });
}

export async function POST(req: Request): Promise<NextResponse> {
  const guard = await requireTeacherProfile();
  if (!guard.ok) return guard.res;

  const body = await parseJsonBody(req, taxonomyCreateSchema);
  if (!body.ok) return body.res;

  const created = await createTaxonomyEntry({
    delegate,
    scope: { column: "teacherId", id: guard.teacherId },
    input: body.data,
    conflictMessage: "A class level with this name already exists.",
  });
  if (!created.ok) return created.res;

  return NextResponse.json({ classLevel: created.record }, { status: 201 });
}
