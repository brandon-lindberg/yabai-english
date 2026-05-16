type StripeAccountSnapshot = {
  charges_enabled?: boolean | null;
  payouts_enabled?: boolean | null;
  requirements?: {
    currently_due?: string[] | null;
    past_due?: string[] | null;
  } | null;
};

export function resolveStripeAccountStatus(account: StripeAccountSnapshot) {
  const requirementsDue = [
    ...(account.requirements?.currently_due ?? []),
    ...(account.requirements?.past_due ?? []),
  ];
  const chargesEnabled = Boolean(account.charges_enabled);
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const ready = chargesEnabled && payoutsEnabled && requirementsDue.length === 0;

  return {
    status: ready ? "ENABLED" as const : requirementsDue.length > 0 ? "REQUIREMENTS_DUE" as const : "PENDING" as const,
    chargesEnabled,
    payoutsEnabled,
    requirementsDue,
    methodEnabled: ready,
  };
}
