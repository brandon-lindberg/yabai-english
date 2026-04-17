import { NextResponse } from "next/server";
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
  const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (isViewerBlockedByCounterpart(thread, session.user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const isThreadTeacher =
    session.user.role === "TEACHER" && session.user.id === thread.teacherId;
  if (!isAdmin && !isThreadTeacher) {
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
