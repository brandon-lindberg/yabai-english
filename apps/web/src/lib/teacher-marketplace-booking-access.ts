/**
 * Gates direct booking UI/API for teachers who hide from the marketplace.
 * Org membership and chat blocks are enforced separately at call sites.
 */
export function studentMayAccessTeacherBookingFlow(args: {
  marketplaceHidden: boolean;
  viewerStudentId: string | null;
  isStudentOnRoster: boolean;
}): boolean {
  if (!args.marketplaceHidden) return true;
  if (!args.viewerStudentId) return false;
  return args.isStudentOnRoster;
}
