import type { Metadata } from "next";
import { generateLegalDocMetadata, LegalDocView } from "@/components/legal/legal-doc-view";

export async function generateMetadata(): Promise<Metadata> {
  return generateLegalDocMetadata({
    doc: "refund-students",
    titleKey: "refundStudentsPageTitle",
    descriptionKey: "refundStudentsMetaDescription",
  });
}

export default function StudentRefundPolicyPage() {
  return <LegalDocView doc="refund-students" />;
}
