import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isViewerBlockedByCounterpart } from "@/lib/chat-blocking";
import { emitChatUpdate } from "@/lib/realtime-server";

const bodySchema = z.object({
  action: z.enum(["block", "unblock", "report"]),
  reason: z.string().trim().max(1000).optional(),
});

type Props = {
  params: Promise<{ threadId: string }>;
};

export async function POST(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { threadId } = await params;
  const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isStudent = thread.studentId === session.user.id;
  const isTeacher = thread.teacherId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && isViewerBlockedByCounterpart(thread, session.user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isStudent && !isTeacher && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const { action, reason } = parsed.data;
  const reportReason = reason?.trim();
  if (action === "report" && !reportReason) {
    return NextResponse.json(
      { error: "Report reason is required." },
      { status: 400 },
    );
  }

  const updateData: Record<string, unknown> = {};
  if (action === "block") {
    if (isStudent) updateData.studentBlockedAt = now;
    else if (isTeacher) updateData.teacherBlockedAt = now;
    else if (isAdmin) {
      updateData.studentBlockedAt = now;
      updateData.teacherBlockedAt = now;
    }
  } else if (action === "unblock") {
    if (isStudent) updateData.studentBlockedAt = null;
    else if (isTeacher) updateData.teacherBlockedAt = null;
    else if (isAdmin) {
      updateData.studentBlockedAt = null;
      updateData.teacherBlockedAt = null;
    }
  } else if (action === "report") {
    if (isStudent) {
      updateData.studentReportedAt = now;
      updateData.studentReportReason = reportReason;
      updateData.studentBlockedAt = now;
    } else if (isTeacher) {
      updateData.teacherReportedAt = now;
      updateData.teacherReportReason = reportReason;
      updateData.teacherBlockedAt = now;
    } else if (isAdmin) {
      updateData.studentReportedAt = now;
      updateData.teacherReportedAt = now;
      updateData.studentReportReason = reportReason;
      updateData.teacherReportReason = reportReason;
      updateData.studentBlockedAt = now;
      updateData.teacherBlockedAt = now;
    }
  }

  const updated = await prisma.chatThread.update({
    where: { id: threadId },
    data: updateData,
  });

  await Promise.all([
    emitChatUpdate(updated.studentId, updated.id),
    emitChatUpdate(updated.teacherId, updated.id),
  ]);

  return NextResponse.json(updated);
}
