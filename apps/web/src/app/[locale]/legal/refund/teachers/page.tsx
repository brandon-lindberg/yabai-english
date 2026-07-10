import type { Metadata } from "next";
import { generateLegalDocMetadata, LegalDocView } from "@/components/legal/legal-doc-view";

export async function generateMetadata(): Promise<Metadata> {
  return generateLegalDocMetadata({
    doc: "refund-teachers",
    titleKey: "refundTeachersPageTitle",
    descriptionKey: "refundTeachersMetaDescription",
  });
}

export default function TeacherRefundPolicyPage() {
  return <LegalDocView doc="refund-teachers" />;
}
