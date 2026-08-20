import type { ReactNode } from "react";
import { SchoolSubnav } from "@/components/org/school-subnav";
import { requireSchoolViewer } from "@/lib/org/require-school-viewer";

type Props = {
  children: ReactNode;
  params: Promise<{ orgId: string; schoolId: string }>;
};

export default async function SchoolLayout({ children, params }: Props) {
  const { orgId, schoolId, viewer } = await requireSchoolViewer(params, "anyMember");

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
