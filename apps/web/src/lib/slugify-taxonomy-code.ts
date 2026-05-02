/**
 * Convert a free-form display name into a stable, URL-safe taxonomy code.
 * Strips non-ASCII (so Japanese-only inputs return ""), lowercases,
 * collapses runs of separators into a single hyphen, and trims to 64 chars.
 */
export function slugifyTaxonomyCode(input: string): string {
  const ascii = input.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const trimmed = ascii.replace(/^-+|-+$/g, "");
  if (trimmed.length <= 64) return trimmed;
  return trimmed.slice(0, 64).replace(/-+$/, "");
}
