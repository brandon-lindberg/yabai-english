import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isViewerBlockedByCounterpart } from "@/lib/chat-blocking";
import { emitChatUpdate } from "@/lib/realtime-server";

const bodySchema = z.object({
  twoWayEnabled: z.boolean(),
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
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    include: {
      student: { select: { role: true } },
      teacher: { select: { role: true } },
    },
  });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (isViewerBlockedByCounterpart(thread, session.user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAdmin = session.user.role === Role.SUPER_ADMIN;
  const isThreadTeacher =
    session.user.role === Role.TEACHER && session.user.id === thread.teacherId;
  // An admin conversation borrows the slot its counterpart does not occupy, so
  // a teacher messaging the studio is also "the thread's teacher". Who may talk
  // to an admin is the admin's call alone, so the counterpart never toggles it.
  const involvesAdmin =
    thread.student.role === Role.SUPER_ADMIN ||
    thread.teacher.role === Role.SUPER_ADMIN;
  if (!isAdmin && (!isThreadTeacher || involvesAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.chatThread.update({
    where: { id: threadId },
    data: {
      twoWayEnabled: parsed.data.twoWayEnabled,
      twoWayEnabledByRole: session.user.role,
    },
  });
  await Promise.all([
    emitChatUpdate(updated.studentId, updated.id),
    emitChatUpdate(updated.teacherId, updated.id),
  ]);

  return NextResponse.json(updated);
}
