import type { ReactNode } from "react";
import { SchoolSubnav } from "@/components/org/school-subnav";

type Props = {
  children: ReactNode;
  params: Promise<{ orgId: string; schoolId: string }>;
};

export default async function SchoolLayout({ children, params }: Props) {
  const { orgId, schoolId } = await params;

  return (
    <div>
      <SchoolSubnav orgId={orgId} schoolId={schoolId} />
      {children}
    </div>
  );
}
