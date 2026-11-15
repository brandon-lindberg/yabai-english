import type { ReactNode } from "react";
import { FeatureMessages } from "@/components/i18n/feature-messages";

export default function TeacherInvitationLayout({ children }: { children: ReactNode }) {
  return <FeatureMessages scope="teacherInvitation">{children}</FeatureMessages>;
}
