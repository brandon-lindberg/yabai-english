import type {
  PaymentProvider,
  TeacherPaymentAccountStatus,
  TeacherPaymentMethodType,
} from "@/generated/prisma/client";

/**
 * Stripe is the only provider students can check out with, and the only one we
 * can refund. The stored `PaymentProvider` enum stays wider so rows written
 * before that was true remain readable — narrow to this at every boundary that
 * accepts a provider from outside.
 */
export const SUPPORTED_PAYMENT_PROVIDERS = ["STRIPE"] as const;
export type SupportedPaymentProvider = (typeof SUPPORTED_PAYMENT_PROVIDERS)[number];

export const SUPPORTED_PAYMENT_METHODS = ["CARD", "PAYPAY"] as const;

/**
 * Keeps only the accounts we can actually operate, narrowing the stored
 * provider as it goes. Read sites use this so a legacy row for a provider we no
 * longer support cannot reach a surface that assumes Stripe.
 */
export function onlySupportedProviderAccounts<T extends { provider: PaymentProvider }>(
  accounts: T[],
): Array<T & { provider: SupportedPaymentProvider }> {
  return accounts.filter(
    (account): account is T & { provider: SupportedPaymentProvider } =>
      (SUPPORTED_PAYMENT_PROVIDERS as readonly PaymentProvider[]).includes(account.provider),
  );
}

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
  /** Stripe payment method types the account offers at Checkout. */
  checkoutMethods?: string[];
};

export type EnabledTeacherPaymentMethod = {
  accountId: string;
  provider: PaymentProvider;
  method: TeacherPaymentMethodType;
  label: string;
  logoLabel: string;
  logoClassName: string;
  /** What a student can pay with through this option, most popular first. */
  checkoutMethods: CheckoutMethod[];
};

/**
 * The ways to pay we know how to show, most popular with students in Japan
 * first. Doubles as an allowlist: a Stripe account can have methods available
 * that Checkout never offers for a yen charge (SEPA, Cash App…), and naming
 * those would promise options the student will not find.
 *
 * `paypay` is not a Stripe method; it is here for legacy KOMOJU rows.
 */
export const CHECKOUT_METHODS_BY_POPULARITY = [
  "card",
  "apple_pay",
  "google_pay",
  "paypay",
  "link",
  "alipay",
  "wechat_pay",
] as const;
export type CheckoutMethod = (typeof CHECKOUT_METHODS_BY_POPULARITY)[number];

/**
 * Methods we never offer, whatever a teacher has turned on in Stripe. Checkout
 * is told to leave these out, and they are absent from the list above so they
 * are never shown either.
 *
 * `konbini`: the student pays at a convenience store up to days later, long
 * after the booking hold has released the slot to other students.
 */
export const EXCLUDED_CHECKOUT_METHODS = ["konbini"] as const;

/**
 * Orders an account's Checkout methods by popularity, dropping any we do not
 * show. Card always leads: it is what every ready Stripe account charges with,
 * and accounts not yet re-synced have an empty list until they are.
 */
export function rankCheckoutMethods(types: readonly string[] | undefined): CheckoutMethod[] {
  const offered = new Set(types ?? []);
  offered.add("card");
  return CHECKOUT_METHODS_BY_POPULARITY.filter((type) => offered.has(type));
}

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
        checkoutMethods:
          method.method === "PAYPAY"
            ? (["paypay"] as CheckoutMethod[])
            : rankCheckoutMethods(account.checkoutMethods),
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
