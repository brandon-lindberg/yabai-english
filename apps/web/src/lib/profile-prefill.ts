/**
 * Prefill display name for profile forms: prefer saved profile value, then Google `User.name`,
 * then email local-part (common when name was not synced yet).
 */
export function resolveDisplayNameForForm(input: {
  profileDisplayName: string | null | undefined;
  userName: string | null | undefined;
  userEmail: string | null | undefined;
}): { initial: string; showPrefillHint: boolean } {
  const saved = input.profileDisplayName?.trim();
  if (saved) return { initial: saved, showPrefillHint: false };
  const fromName = input.userName?.trim();
  if (fromName) return { initial: fromName, showPrefillHint: true };
  const email = input.userEmail?.trim();
  if (email?.includes("@")) {
    const local = email.split("@")[0]?.trim() ?? "";
    if (local) return { initial: local, showPrefillHint: true };
  }
  return { initial: "", showPrefillHint: false };
}
