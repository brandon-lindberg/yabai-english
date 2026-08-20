import type { Metadata } from "next";
import { generateLegalDocMetadata, LegalDocView } from "@/components/legal/legal-doc-view";

export async function generateMetadata(): Promise<Metadata> {
  return generateLegalDocMetadata({
    doc: "terms-teachers",
    titleKey: "termsTeachersPageTitle",
    descriptionKey: "termsTeachersMetaDescription",
  });
}

export default function TeacherTermsPage() {
  return <LegalDocView doc="terms-teachers" />;
}
