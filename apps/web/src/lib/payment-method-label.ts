import type { TeacherPaymentMethodType } from "@/generated/prisma/client";

export type PaymentMethodLabelLanguage = "en" | "ja";

/**
 * The one place a payment method is named. Invoices reach accountants as PDFs
 * and as CSVs, and the transaction type has to read the same on both.
 */
const paymentMethodLabels: Record<
  PaymentMethodLabelLanguage,
  Record<TeacherPaymentMethodType, string>
> = {
  en: { CARD: "Credit card", PAYPAY: "PayPay" },
  ja: { CARD: "クレジットカード", PAYPAY: "PayPay" },
};

/** Empty string when the booking has no recorded payment. */
export function paymentMethodLabel(
  method: TeacherPaymentMethodType | null | undefined,
  language: PaymentMethodLabelLanguage = "en",
): string {
  return method ? paymentMethodLabels[language][method] : "";
}
