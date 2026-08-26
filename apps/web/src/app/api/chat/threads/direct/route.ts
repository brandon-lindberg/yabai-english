import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureAdminUserThread } from "@/lib/chat-threads";

const postSchema = z.object({
  userId: z.string().min(1),
});

/**
 * Resolves (creating it on first use) the admin's own conversation with a
 * single user, so admin direct messages never borrow a student/teacher thread.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // A ChatThread has one student slot and one teacher slot; two admins have no
  // slot to take, so admin-to-admin conversations are not representable.
  if (target.role === "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Admins cannot direct message other admins." },
      { status: 400 },
    );
  }

  const thread = await ensureAdminUserThread(session.user.id, target);
  return NextResponse.json({ threadId: thread.id });
}
