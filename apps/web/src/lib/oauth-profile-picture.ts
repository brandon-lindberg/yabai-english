import type { PrismaClient } from "@/generated/prisma/client";

/**
 * OIDC / OAuth profiles often expose the avatar as `picture` (Google, standard OIDC).
 * Auth.js user normalization may use `image` instead.
 */
export function pickOidcProfilePicture(profile: unknown): string | null {
  if (!profile || typeof profile !== "object") return null;
  const rec = profile as Record<string, unknown>;
  const raw = rec.picture ?? rec.image;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function syncUserImageIfChanged(
  db: Pick<PrismaClient, "user">,
  userId: string,
  pictureUrl: string | null,
): Promise<void> {
  if (!pictureUrl) return;
  const row = await db.user.findUnique({
    where: { id: userId },
    select: { image: true },
  });
  if (row?.image === pictureUrl) return;
  await db.user.update({
    where: { id: userId },
    data: { image: pictureUrl },
  });
}
