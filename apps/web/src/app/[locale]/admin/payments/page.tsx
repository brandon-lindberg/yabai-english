import { getTranslations } from "next-intl/server";
import { AdminRefundsTable } from "@/components/admin/admin-refunds-table";
import { PageHeader } from "@/components/ui/page-header";
import { AdminWebhookRecovery } from "@/components/admin/admin-webhook-recovery";
import { Link } from "@/i18n/navigation";
import { actionLinkClass } from "@/components/ui/inline-link";

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ person?: string; booking?: string }> }) {
  const t = await getTranslations("admin.refundsPage");
  const { person, booking } = await searchParams;
  const personId = typeof person === "string" && person.length <= 200 ? person : undefined;
  const bookingId = typeof booking === "string" && booking.length <= 200 ? booking : undefined;
  const filtered = Boolean(personId || bookingId);
  return (
    <main>
      <PageHeader title={t("title")} description={filtered ? t(bookingId ? "filteredBooking" : "filteredPerson") : t("subtitle")}
        actions={filtered && <>
          {bookingId && <Link className={actionLinkClass} href={`/admin/lessons/${bookingId}`}>{t("viewBooking")}</Link>}
          <Link className={actionLinkClass} href="/admin/payments">{t("allExceptions")}</Link>
        </>} />
      <nav aria-label={t("queueNavigation")} className="mb-6 flex flex-wrap gap-4 text-sm">
        <a className={actionLinkClass} href="#student-reimbursements">{t("reimbursements")}</a>
        <a className={actionLinkClass} href="#platform-fee-returns">{t("platformFees")}</a>
        {!filtered && <a className={actionLinkClass} href="#stripe-deliveries">{t("deliveriesTitle")}</a>}
      </nav>
      <div className="space-y-8">
        <AdminRefundsTable personId={personId} bookingId={bookingId} />
        {!filtered && <AdminWebhookRecovery />}
      </div>
    </main>
  );
}
