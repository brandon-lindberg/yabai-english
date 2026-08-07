import type { ReactNode } from "react";
import { OrgSubnav } from "@/components/org/org-subnav";
import { requireOrgViewer } from "@/lib/org/require-org-viewer";

type Props = {
  children: ReactNode;
  params: Promise<{ orgId: string }>;
};

export default async function OrgLayout({ children, params }: Props) {
  /*
    The pages inside check too. That is deliberate rather than redundant: a
    layout is not a security boundary in the App Router — it and its page render
    together, so a page that skipped the check would still have run its queries.
    `requireOrgViewer` caches per request, so the second call costs nothing.
  */
  const { orgId } = await requireOrgViewer(params);

  return (
    <div className="mx-auto max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <OrgSubnav orgId={orgId} />
      {children}
    </div>
  );
}
