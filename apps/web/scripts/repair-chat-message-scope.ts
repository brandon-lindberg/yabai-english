/**
 * Run from apps/web: `yarn chat:repair-scope` (dry run) / `yarn chat:repair-scope --apply`.
 *
 * A ChatMessage must live in a thread whose two participants are its sender and
 * its recipient — otherwise the third party can read it. Admin messages written
 * before that invariant was enforced landed inside student/teacher threads, so
 * this moves each one into the admin's own thread with its intended recipient,
 * creating that thread if it does not exist yet.
 *
 * Idempotent: a second run finds nothing to move.
 */
import "dotenv/config";
import { Role } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";
import { ensureAdminUserThread, touchChatThread } from "../src/lib/chat-threads";

type Stray = {
  messageId: string;
  body: string;
  sourceThreadId: string;
  senderId: string;
  senderRole: Role;
  recipientId: string;
  recipientRole: Role;
  exposedTo: string[];
};

async function main() {
  const apply = process.argv.includes("--apply");

  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true } });
  const byId = new Map(users.map((u) => [u.id, u]));
  const label = (id: string) => {
    const u = byId.get(id);
    return u ? `${u.name ?? id} (${u.role})` : `<unknown ${id}>`;
  };

  const threads = await prisma.chatThread.findMany({
    select: {
      id: true,
      studentId: true,
      teacherId: true,
      messages: { select: { id: true, senderId: true, recipientId: true, body: true } },
    },
  });

  const strays: Stray[] = [];
  const unrepairable: string[] = [];
  let scanned = 0;

  for (const thread of threads) {
    const participants = new Set([thread.studentId, thread.teacherId]);
    for (const message of thread.messages) {
      scanned += 1;
      const senderOk = participants.has(message.senderId);
      const recipientOk = participants.has(message.recipientId);
      if (senderOk && recipientOk) continue;

      const sender = byId.get(message.senderId);
      const recipient = byId.get(message.recipientId);
      if (!sender || !recipient) {
        unrepairable.push(`${message.id}: sender or recipient no longer exists`);
        continue;
      }
      // Only admin conversations have a canonical home to move a message to.
      // Anything else is a bug we have not seen and must not guess at.
      if (sender.role !== Role.SUPER_ADMIN || recipient.role === Role.SUPER_ADMIN) {
        unrepairable.push(
          `${message.id}: ${label(sender.id)} -> ${label(recipient.id)} in thread ${thread.id} — needs manual review`,
        );
        continue;
      }
      strays.push({
        messageId: message.id,
        body: message.body,
        sourceThreadId: thread.id,
        senderId: sender.id,
        senderRole: sender.role,
        recipientId: recipient.id,
        recipientRole: recipient.role,
        exposedTo: [...participants].filter(
          (id) => id !== message.senderId && id !== message.recipientId,
        ),
      });
    }
  }

  console.log(`Scanned ${threads.length} threads / ${scanned} messages.`);
  console.log(`Misfiled messages: ${strays.length}`);
  console.log(`Needing manual review: ${unrepairable.length}`);
  unrepairable.forEach((line) => console.log(`  ! ${line}`));

  if (strays.length === 0) {
    console.log(apply ? "\nNothing to repair." : "\nNothing to repair (dry run).");
    return;
  }

  let moved = 0;
  for (const stray of strays) {
    const target = await (apply
      ? ensureAdminUserThread(stray.senderId, {
          id: stray.recipientId,
          role: stray.recipientRole,
        })
      : Promise.resolve({ id: "<would create/reuse admin thread>" }));

    console.log(
      `\n  ${stray.messageId}: ${label(stray.senderId)} -> ${label(stray.recipientId)}` +
        `\n    "${stray.body.slice(0, 60)}"` +
        `\n    from thread ${stray.sourceThreadId} -> ${target.id}` +
        `\n    was readable by: ${stray.exposedTo.map(label).join(", ") || "(nobody extra)"}`,
    );

    if (!apply) continue;
    await prisma.chatMessage.update({
      where: { id: stray.messageId },
      data: { threadId: target.id },
    });
    await touchChatThread(target.id);
    moved += 1;
  }

  console.log(
    apply
      ? `\nMoved ${moved} message(s) into the correct thread.`
      : `\nDry run: nothing was written. Re-run with --apply to move ${strays.length} message(s).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
