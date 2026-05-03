const invoiceLinkClassName =
  "rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-[var(--app-hover)]";

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
    <>
      <a
        href={`/api/invoices/${invoiceId}/pdf?lang=en`}
        className={invoiceLinkClassName}
      >
        {englishLabel}
      </a>
      <a
        href={`/api/invoices/${invoiceId}/pdf?lang=ja`}
        className={invoiceLinkClassName}
      >
        {japaneseLabel}
      </a>
    </>
  );
}
