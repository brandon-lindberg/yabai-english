import type { Role } from "@/generated/prisma/enums";

export type LegalNavLink = {
  href:
    | "/legal/terms"
    | "/legal/terms/students"
    | "/legal/terms/teachers"
    | "/legal/refund/students"
    | "/legal/refund/teachers"
    | "/legal/privacy";
  labelKey: string;
};

/** Marketplace documents that only apply to the other side of the marketplace. */
export const teacherOnlyLegalPaths = [
  "/legal/terms/teachers",
  "/legal/refund/teachers",
] as const;

export const studentOnlyLegalPaths = [
  "/legal/terms/students",
  "/legal/refund/students",
] as const;

const GENERAL: LegalNavLink = { href: "/legal/terms", labelKey: "navTerms" };
const PRIVACY: LegalNavLink = { href: "/legal/privacy", labelKey: "navPrivacy" };
const STUDENT: LegalNavLink[] = [
  { href: "/legal/terms/students", labelKey: "navTermsStudents" },
  { href: "/legal/refund/students", labelKey: "navRefundStudents" },
];
const TEACHER: LegalNavLink[] = [
  { href: "/legal/terms/teachers", labelKey: "navTermsTeachers" },
  { href: "/legal/refund/teachers", labelKey: "navRefundTeachers" },
];

/**
 * The legal documents to offer a given viewer.
 *
 * Students and teachers sign different marketplace agreements, so showing a
 * student the teacher's fee and payout terms only invites them to read terms
 * that are not theirs and do not bind them. Signed-out visitors see everything:
 * someone deciding whether to teach here has to be able to read the teacher
 * terms before they have an account.
 */
export function legalNavLinksForRole(role: Role | null | undefined): LegalNavLink[] {
  if (role === "STUDENT") return [GENERAL, ...STUDENT, PRIVACY];
  if (role === "TEACHER") return [GENERAL, ...TEACHER, PRIVACY];
  return [GENERAL, ...TEACHER, ...STUDENT, PRIVACY];
}
