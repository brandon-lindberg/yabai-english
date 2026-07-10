import { getLocale, getTranslations } from "next-intl/server";
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

export async function LegalDocView({ doc }: Pick<Props, "doc">) {
  const locale = await getLocale();
  const t = await getTranslations("legal");
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
