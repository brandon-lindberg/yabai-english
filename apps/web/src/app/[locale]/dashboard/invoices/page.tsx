import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import {
  TeacherInvoicesExportPanel,
  type TeacherInvoiceStudentOption,
} from "@/components/dashboard/teacher-invoices-export-panel";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";
import { prisma } from "@/lib/prisma";

export default async function DashboardTeacherInvoicesPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const locale = await getLocale();
  if (!isTeacherCabinetRole(session.user.role)) {
    redirect({ href: "/dashboard", locale });
  }

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) {
    redirect({ href: "/dashboard", locale });
    return null;
  }

  const invoiceRows = await prisma.invoice.findMany({
    where: { booking: { teacherId: profile.id } },
    select: {
      student: { select: { id: true, name: true, email: true } },
    },
  });

  const byStudentId = new Map<string, TeacherInvoiceStudentOption>();
  for (const row of invoiceRows) {
    const s = row.student;
    if (!byStudentId.has(s.id)) {
      byStudentId.set(s.id, {
        id: s.id,
        label: s.name ?? s.email ?? s.id,
      });
    }
  }
  const studentOptions = [...byStudentId.values()].sort((a, b) =>
    a.label.localeCompare(b.label, locale, { sensitivity: "base" }),
  );

  const t = await getTranslations("dashboard.invoicesPage");
  return (
    <main>
      <PageHeader title={t("title")} description={t("description")} />
      <TeacherInvoicesExportPanel studentOptions={studentOptions} />
    </main>
  );
}
