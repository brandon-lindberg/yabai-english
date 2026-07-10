import type { Metadata } from "next";
import { generateLegalDocMetadata, LegalDocView } from "@/components/legal/legal-doc-view";

export async function generateMetadata(): Promise<Metadata> {
  return generateLegalDocMetadata({
    doc: "terms-students",
    titleKey: "termsStudentsPageTitle",
    descriptionKey: "termsStudentsMetaDescription",
  });
}

export default function StudentTermsPage() {
  return <LegalDocView doc="terms-students" />;
}
