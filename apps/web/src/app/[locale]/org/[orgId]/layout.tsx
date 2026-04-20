import type { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { OrgSubnav } from "@/components/org/org-subnav";

type Props = {
  children: ReactNode;
  params: Promise<{ orgId: string }>;
};

export default async function OrgLayout({ children, params }: Props) {
  const session = await auth();
  const locale = await getLocale();

  if (!session?.user?.id) {
    redirect({ href: "/auth/signin", locale });
    return null;
  }

  const { orgId } = await params;

  return (
    <div className="mx-auto max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <OrgSubnav orgId={orgId} />
      {children}
    </div>
  );
}
