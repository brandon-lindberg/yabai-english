/** Fail before identities can be silently overwritten by a Map or an import. */
export function requireUnique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label}`);
}

/** Compare members regardless of order, retaining multiplicity for duplicate detection. */
export const sameStringMembers = (a: string[], b: string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
