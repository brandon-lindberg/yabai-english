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

export function InvoiceDownloadLinks({
  invoiceId,
  englishLabel = "Download invoice (English)",
  japaneseLabel = "Download invoice (Japanese)",
}: {
  invoiceId: string;
  englishLabel?: string;
  japaneseLabel?: string;
}) {
  return (
    <DocumentDownloadLinks
      basePath={`/api/invoices/${invoiceId}/pdf`}
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
