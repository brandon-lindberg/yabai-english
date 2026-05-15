import type {
  PaymentProvider,
  TeacherPaymentAccountStatus,
  TeacherPaymentMethodType,
} from "@/generated/prisma/client";

export type TeacherPaymentAccountLike = {
  id: string;
  provider: PaymentProvider;
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
