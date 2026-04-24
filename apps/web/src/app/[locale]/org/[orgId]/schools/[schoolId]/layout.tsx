import type { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { SchoolSubnav } from "@/components/org/school-subnav";
import { getViewerSchoolRole } from "@/lib/org-viewer-role";

type Props = {
  children: ReactNode;
  params: Promise<{ orgId: string; schoolId: string }>;
};

export default async function SchoolLayout({ children, params }: Props) {
  const { orgId, schoolId } = await params;
  const session = await auth();
  const locale = await getLocale();

  if (!session?.user?.id) {
    redirect({ href: "/auth/signin", locale });
    return null;
  }

  const viewer = await getViewerSchoolRole(session.user.id, orgId, schoolId);
  if (!viewer) {
    redirect({ href: `/org/${orgId}`, locale });
    return null;
  }

  return (
    <div>
      <SchoolSubnav
        orgId={orgId}
        schoolId={schoolId}
        isSchoolAdmin={viewer.isSchoolAdmin}
        isSchoolTeacher={viewer.isSchoolTeacher}
      />
      {children}
    </div>
  );
}
