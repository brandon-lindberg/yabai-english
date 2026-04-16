import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  preferredCalendarId: z.string().optional(),
  defaultNotesFolderId: z.string().optional(),
  autoCreateMeetLink: z.boolean().optional(),
  autoShareNotesWithAttendees: z.boolean().optional(),
  artifactSyncEnabled: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const settings = await prisma.googleIntegrationSettings.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      preferredCalendarId: parsed.data.preferredCalendarId,
      defaultNotesFolderId: parsed.data.defaultNotesFolderId,
      autoCreateMeetLink: parsed.data.autoCreateMeetLink ?? true,
      autoShareNotesWithAttendees: parsed.data.autoShareNotesWithAttendees ?? true,
      artifactSyncEnabled: parsed.data.artifactSyncEnabled ?? false,
    },
    update: parsed.data,
  });

  return NextResponse.json({ settings });
}
