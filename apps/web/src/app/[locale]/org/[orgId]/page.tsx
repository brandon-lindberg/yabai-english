import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgViewer } from "@/lib/org/require-org-viewer";
import {
  loadOrgMemberRows,
  rowsForSchool,
  summarizeOrgMembers,
} from "@/lib/org/org-members";
import { buttonClasses } from "@/components/ui/button";
import { DataList, DataRow } from "@/components/ui/data-row";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { StatLedger } from "@/components/ui/stat-ledger";

const SCHOOL_SHORTCUTS = [
  { path: "/schedule", labelKey: "quickSchedule" },
  { path: "/classes", labelKey: "quickClasses" },
  { path: "/members", labelKey: "quickMembers" },
  { path: "/pricing", labelKey: "quickPricing" },
] as const;

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId, viewer } = await requireOrgViewer(params);
  const t = await getTranslations("org.dashboard");

  const [org, memberRows] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      /*
        `select`, not `include`. This page reads a name and some counts; with
        `include` it also returned every column the model gains from here on,
        which is how a field ends up in a payload without anyone touching this
        file.
      */
      select: {
        name: true,
        schools: {
          select: {
            id: true,
            name: true,
            _count: { select: { scheduleSlots: { where: { active: true } } } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    // One read of the organization's memberships answers for the organization
    // and for every school in the list below — people, not rows.
    loadOrgMemberRows(prisma, orgId),
  ]);

  // The viewer's membership named this org, so it exists; this is for the types.
  if (!org) return null;

  const memberCounts = summarizeOrgMembers(memberRows);

  return (
    <main className="space-y-10">
      <PageHeader title={org.name} description={t("title")} />

      {/* Was four equal AppCards with the label above the number — the
          hero-metric grid, banned by DESIGN.md §4 and already replaced on every
          other dashboard in the app. */}
      <StatLedger
        stats={[
          { label: t("totalSchools"), value: org.schools.length },
          { label: t("totalMembers"), value: memberCounts.members },
          { label: t("totalTeachers"), value: memberCounts.teachers },
          { label: t("totalStudents"), value: memberCounts.students },
        ]}
      />

      <Section
        title={t("schoolsOverview")}
        actions={
          viewer.isOrgWide ? (
            <Link href={`/org/${orgId}/schools`} className={buttonClasses()}>
              {t("addSchool")}
            </Link>
          ) : null
        }
      >
        {org.schools.length === 0 ? (
          <p className="text-sm text-muted">{t("noActivity")}</p>
        ) : (
          /*
            One row renderer, however many schools. There were two: a plain row
            in the list, and a second, richer card built only when the org had
            exactly one school. The extra shortcuts in that branch are worth
            keeping — for a single-school org the school *is* the org, so making
            them walk through it is pure friction — but they were a reason to
            maintain the row twice. Now it is one row that carries shortcuts
            when they are useful.
          */
          <DataList>
            {org.schools.map((school) => (
              <DataRow
                key={school.id}
                actions={
                  <Link
                    href={`/org/${orgId}/schools/${school.id}`}
                    className={buttonClasses({ variant: "secondary", size: "sm" })}
                  >
                    {t("viewSchool")}
                  </Link>
                }
              >
                <p className="font-medium text-foreground">{school.name}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {t("membersCount", {
                    count: summarizeOrgMembers(rowsForSchool(memberRows, school.id)).members,
                  })}
                </p>
                {org.schools.length === 1 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SCHOOL_SHORTCUTS.map(({ path, labelKey }) => (
                      <Link
                        key={path}
                        href={`/org/${orgId}/schools/${school.id}${path}`}
                        className={buttonClasses({ variant: "ghost", size: "sm" })}
                      >
                        {t(labelKey)}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </DataRow>
            ))}
          </DataList>
        )}
      </Section>
    </main>
  );
}
