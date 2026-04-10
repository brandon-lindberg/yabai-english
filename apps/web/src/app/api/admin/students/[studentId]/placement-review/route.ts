import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildPlacementReviewUpdate } from "@/lib/placement-review";

type Props = {
  params: Promise<{ studentId: string }>;
};

const postSchema = z.object({
  placedLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  adminNote: z.string().trim().max(1000).optional(),
});

export async function POST(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { studentId } = await params;
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { role: true, studentProfile: { select: { id: true } } },
  });
  if (!student || student.role !== "STUDENT" || !student.studentProfile) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const update = buildPlacementReviewUpdate(parsed.data);
  const profile = await prisma.studentProfile.update({
    where: { userId: studentId },
    data: update,
    select: {
      userId: true,
      placedLevel: true,
      placementNeedsReview: true,
      placementReviewReason: true,
    },
  });

  return NextResponse.json(profile);
}
