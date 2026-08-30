import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { LegalDocument } from "@/components/legal/legal-document";
import { isLegalLocale, loadLegalMarkdown, type LegalDocId } from "@/lib/legal/load-legal-markdown";

type Props = {
  doc: LegalDocId;
  titleKey:
    | "termsTeachersPageTitle"
    | "termsStudentsPageTitle"
    | "refundTeachersPageTitle"
    | "refundStudentsPageTitle";
  descriptionKey:
    | "termsTeachersMetaDescription"
    | "termsStudentsMetaDescription"
    | "refundTeachersMetaDescription"
    | "refundStudentsMetaDescription";
};

export async function generateLegalDocMetadata({ doc, titleKey, descriptionKey }: Props) {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: t(titleKey),
    description: t(descriptionKey),
  };
}

/** Where a student is sent if they land on the teacher's half of the marketplace terms. */
const STUDENT_EQUIVALENT = {
  "terms-teachers": "/legal/terms/students",
  "refund-teachers": "/legal/refund/students",
} as const;

export async function LegalDocView({ doc }: Pick<Props, "doc">) {
  const locale = await getLocale();
  const t = await getTranslations("legal");

  // Hiding the nav link is not the same as denying access: a student following
  // an old link or a search result would still land on terms that are not
  // theirs. Send them to the agreement that actually binds them.
  const studentEquivalent = STUDENT_EQUIVALENT[doc as keyof typeof STUDENT_EQUIVALENT];
  if (studentEquivalent) {
    const session = await auth();
    if (session?.user?.role === "STUDENT") {
      redirect({ href: studentEquivalent as "/legal/terms/students", locale });
    }
  }

  const legalLocale = isLegalLocale(locale) ? locale : "ja";
  const markdown = await loadLegalMarkdown(doc, legalLocale);

  return (
    <div>
      <LegalDocument markdown={markdown} />
      <p className="mt-12 max-w-3xl border-t border-border pt-6 text-xs leading-relaxed text-muted">
        {t("footerNotice")}
      </p>
    </div>
  );
}
