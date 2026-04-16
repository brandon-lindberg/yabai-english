import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { emitChatUpdate } from "@/lib/realtime-server";

type Props = {
  params: Promise<{ threadId: string }>;
};

export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await params;
  const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
  if (!thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isStudent = thread.studentId === session.user.id;
  const isTeacher = thread.teacherId === session.user.id;
  if (!isStudent && !isTeacher) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = isStudent ? { studentArchivedAt: new Date() } : { teacherArchivedAt: new Date() };
  await prisma.chatThread.update({
    where: { id: threadId },
    data,
  });

  await Promise.all([
    emitChatUpdate(thread.studentId, thread.id),
    emitChatUpdate(thread.teacherId, thread.id),
  ]);

  return NextResponse.json({ ok: true });
}
