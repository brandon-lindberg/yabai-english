const invoiceLinkClassName =
  "rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-[var(--app-hover)]";

function DocumentDownloadLinks({
  basePath,
  englishLabel,
  japaneseLabel,
}: {
  basePath: string;
  englishLabel: string;
  japaneseLabel: string;
}) {
  return (
    <>
      <a href={`${basePath}?lang=en`} className={invoiceLinkClassName}>
        {englishLabel}
      </a>
      <a href={`${basePath}?lang=ja`} className={invoiceLinkClassName}>
        {japaneseLabel}
      </a>
    </>
  );
}

/**
 * `bookingId` addresses the invoice by the booking instead, for rows where one
 * may not have been issued yet — a paid-then-refunded lesson has an invoice
 * owed but not necessarily written, and there is no id to link to. That route
 * mints it and redirects here.
 */
export function InvoiceDownloadLinks({
  invoiceId,
  bookingId,
  englishLabel = "Download invoice (English)",
  japaneseLabel = "Download invoice (Japanese)",
}: {
  invoiceId?: string;
  bookingId?: string;
  englishLabel?: string;
  japaneseLabel?: string;
}) {
  return (
    <DocumentDownloadLinks
      basePath={
        invoiceId ? `/api/invoices/${invoiceId}/pdf` : `/api/bookings/${bookingId}/invoice`
      }
      englishLabel={englishLabel}
      japaneseLabel={japaneseLabel}
    />
  );
}

/** The 適格返還請求書 for a refunded lesson, beside its original invoice. */
export function CreditNoteDownloadLinks({
  refundId,
  englishLabel = "Download credit note (English)",
  japaneseLabel = "Download credit note (Japanese)",
}: {
  refundId: string;
  englishLabel?: string;
  japaneseLabel?: string;
}) {
  return (
    <DocumentDownloadLinks
      basePath={`/api/refunds/${refundId}/credit-note`}
      englishLabel={englishLabel}
      japaneseLabel={japaneseLabel}
    />
  );
}
