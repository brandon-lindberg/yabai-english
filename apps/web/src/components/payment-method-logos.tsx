import type { EnabledTeacherPaymentMethod } from "@/lib/payment-methods";

type Props = {
  methods: EnabledTeacherPaymentMethod[];
  className?: string;
};

export function PaymentMethodLogos({ methods, className = "" }: Props) {
  if (methods.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {methods.map((method) => (
        <span
          key={`${method.provider}:${method.method}:${method.accountId}`}
          aria-label={`${method.logoLabel} available`}
          className={`inline-flex min-h-7 items-center rounded-md px-2.5 py-1 text-xs font-bold ${method.logoClassName}`}
          title={method.label}
        >
          {method.logoLabel}
        </span>
      ))}
    </div>
  );
}
