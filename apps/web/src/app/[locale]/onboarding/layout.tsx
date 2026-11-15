import type { ReactNode } from "react";
import { FeatureMessages } from "@/components/i18n/feature-messages";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <FeatureMessages scope="onboarding">{children}</FeatureMessages>;
}
