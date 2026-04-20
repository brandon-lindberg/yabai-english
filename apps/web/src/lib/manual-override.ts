export function canShowManualOverrideToggle(role: "STUDENT" | "TEACHER" | "SUPER_ADMIN") {
  return role === "TEACHER" || role === "SUPER_ADMIN";
}

export function validateManualOverrideReason(
  manualOverride: boolean,
  reason: string,
) {
  const normalized = reason.trim();
  if (!manualOverride) {
    return { ok: true as const, normalizedReason: null };
  }
  if (!normalized) {
    return { ok: false as const, normalizedReason: null };
  }
  return { ok: true as const, normalizedReason: normalized };
}
