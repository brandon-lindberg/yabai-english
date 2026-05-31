import type {
  PaymentProvider,
  TeacherPaymentAccountStatus,
  TeacherPaymentMethodType,
} from "@/generated/prisma/client";

export type TeacherPaymentAccountLike = {
  id: string;
  provider: PaymentProvider;
  providerAccountId?: string | null;
  status: TeacherPaymentAccountStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  methods: Array<{
    method: TeacherPaymentMethodType;
    enabled: boolean;
  }>;
};

export type EnabledTeacherPaymentMethod = {
  accountId: string;
  provider: PaymentProvider;
  method: TeacherPaymentMethodType;
  label: string;
  logoLabel: string;
  logoClassName: string;
};

export function isLocalStripeProviderAccount(providerAccountId?: string | null): boolean {
  return Boolean(providerAccountId?.startsWith("acct_local_"));
}

export function isTeacherPaymentAccountReady(account: TeacherPaymentAccountLike): boolean {
  if (
    account.status !== "ENABLED" ||
    !account.chargesEnabled ||
    !account.payoutsEnabled
  ) {
    return false;
  }

  if (
    account.provider === "STRIPE" &&
    (!account.providerAccountId || isLocalStripeProviderAccount(account.providerAccountId))
  ) {
    return false;
  }

  return true;
}

export function isStripeAccountReady(account: TeacherPaymentAccountLike): boolean {
  return account.provider === "STRIPE" && isTeacherPaymentAccountReady(account);
}

export function isLocalDevStripeAccountReady(account: TeacherPaymentAccountLike): boolean {
  return (
    account.provider === "STRIPE" &&
    isLocalStripeProviderAccount(account.providerAccountId) &&
    account.status === "ENABLED" &&
    account.chargesEnabled &&
    account.payoutsEnabled
  );
}

export type TeacherPublishAvailabilityOptions = {
  allowLocalDevStripe?: boolean;
};

export function resolveTeacherPublishAvailabilityOptions(): TeacherPublishAvailabilityOptions {
  const stripeConnectEnabled = Boolean(process.env.STRIPE_SECRET_KEY);
  return {
    allowLocalDevStripe:
      process.env.NODE_ENV !== "production" &&
      process.env.DEV_AUTH_BYPASS === "true" &&
      !stripeConnectEnabled,
  };
}

export function canTeacherPublishAvailability(
  paymentPolicyAcceptedAt: Date | string | null | undefined,
  accounts: TeacherPaymentAccountLike[],
  options?: TeacherPublishAvailabilityOptions,
): boolean {
  if (!paymentPolicyAcceptedAt) {
    return false;
  }

  if (accounts.some(isStripeAccountReady)) {
    return true;
  }

  if (options?.allowLocalDevStripe && accounts.some(isLocalDevStripeAccountReady)) {
    return true;
  }

  return false;
}

export function paymentMethodDisplay(method: TeacherPaymentMethodType): {
  label: string;
  logoLabel: string;
  logoClassName: string;
} {
  if (method === "PAYPAY") {
    return {
      label: "PayPay",
      logoLabel: "PayPay",
      logoClassName: "bg-[#ff0033] text-white",
    };
  }
  return {
    label: "Credit card",
    logoLabel: "Stripe",
    logoClassName: "bg-[#635bff] text-white",
  };
}

export function getEnabledTeacherPaymentMethods(
  accounts: TeacherPaymentAccountLike[],
): EnabledTeacherPaymentMethod[] {
  return accounts.flatMap((account) => {
    if (
      account.status !== "ENABLED" ||
      !account.chargesEnabled ||
      !account.payoutsEnabled
    ) {
      return [];
    }

    if (
      account.provider === "STRIPE" &&
      (!account.providerAccountId || isLocalStripeProviderAccount(account.providerAccountId))
    ) {
      return [];
    }

    return account.methods
      .filter((method) => method.enabled)
      .map((method) => ({
        accountId: account.id,
        provider: account.provider,
        method: method.method,
        ...paymentMethodDisplay(method.method),
      }));
  });
}

export function hasEnabledPaidPaymentMethod(
  input: TeacherPaymentAccountLike[] | EnabledTeacherPaymentMethod[],
): boolean {
  if (input.length === 0) return false;
  const first = input[0] as Partial<TeacherPaymentAccountLike>;
  if ("methods" in first) {
    return getEnabledTeacherPaymentMethods(input as TeacherPaymentAccountLike[]).length > 0;
  }
  return input.length > 0;
}
