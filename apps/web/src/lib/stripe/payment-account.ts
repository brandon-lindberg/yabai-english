/** A payment's captured account takes precedence over a mutable teacher connection. */
export function stripeAccountForPayment(payment: {
  metadataJson?: unknown;
  teacherPaymentAccount?: { providerAccountId?: string | null } | null;
}): string | null {
  const metadata = payment.metadataJson;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata) && "connectedAccountId" in metadata) {
    // A malformed captured value is an error, not permission to route historical money elsewhere.
    return typeof metadata.connectedAccountId === "string" && metadata.connectedAccountId.startsWith("acct_")
      ? metadata.connectedAccountId : null;
  }
  return payment.teacherPaymentAccount?.providerAccountId ?? null;
}
