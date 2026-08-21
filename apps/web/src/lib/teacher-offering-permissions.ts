/**
 * Which of a teacher's lesson offerings are theirs to author.
 *
 * Two kinds exist that a teacher may *use* but must not create or edit:
 *
 *  - the **free trial**, provisioned for them at a fixed ¥0;
 *  - an **admin-granted below-minimum class**, where a SUPER_ADMIN has allowed a
 *    rate under {@link MIN_PUBLIC_LESSON_RATE_YEN} as a deliberate concession.
 *
 * Both sit in the same table as ordinary priced classes, so anything that reads
 * or rewrites a teacher's offerings has to tell them apart — the rate editor
 * must not show them, and saving rates must not delete them.
 */

export type OfferingAuthorship = {
  isFreeTrial?: boolean | null;
  /** SUPER_ADMIN who granted a rate below the public minimum, if any. */
  adminRateOverrideByUserId?: string | null;
};

export function isTeacherEditableOffering(offering: Readonly<OfferingAuthorship>): boolean {
  if (offering.isFreeTrial) return false;
  if (offering.adminRateOverrideByUserId) return false;
  return true;
}

/**
 * Splits offerings into the ones a teacher's own save may replace, and the ones
 * it must leave untouched.
 */
export function partitionOfferingsByTeacherEditable<T extends OfferingAuthorship>(
  offerings: readonly T[],
): { editable: T[]; preserved: T[] } {
  const editable: T[] = [];
  const preserved: T[] = [];
  for (const offering of offerings) {
    (isTeacherEditableOffering(offering) ? editable : preserved).push(offering);
  }
  return { editable, preserved };
}
