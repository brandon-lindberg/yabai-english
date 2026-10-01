import { useTranslations } from "next-intl";
import {
  CHECKOUT_METHODS_BY_POPULARITY,
  type CheckoutMethod,
  type EnabledTeacherPaymentMethod,
} from "@/lib/payment-methods";

/** Card plus the two most popular others; the rest fold into "+N". */
const DEFAULT_VISIBLE = 3;

type BadgesProps = {
  /** Already ranked, card first — see `rankCheckoutMethods`. */
  methods: readonly CheckoutMethod[];
  max?: number;
  className?: string;
};

/**
 * The ways a student can pay, capped so a teacher who accepts everything does
 * not turn the booking form into a wall of logos. Neutral chips rather than
 * brand colours for the same reason: eight brand colours side by side is noise.
 */
export function CheckoutMethodBadges({ methods, max = DEFAULT_VISIBLE, className = "" }: BadgesProps) {
  const t = useTranslations("paymentMethods");
  if (methods.length === 0) return null;

  const visible = methods.slice(0, max);
  const hidden = methods.slice(max);
  const hiddenNames = hidden.map((method) => t(method)).join(", ");

  return (
    <ul
      aria-label={t("acceptedLabel")}
      className={`flex flex-wrap items-center gap-1.5 ${className}`.trim()}
    >
      {visible.map((method) => (
        <li
          key={method}
          className="inline-flex min-h-7 items-center rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground"
        >
          {t(method)}
        </li>
      ))}
      {hidden.length > 0 ? (
        <li className="px-1 text-xs text-muted" title={hiddenNames}>
          <span aria-hidden="true">{t("more", { count: hidden.length })}</span>
          <span className="sr-only">{t("moreLabel", { count: hidden.length, names: hiddenNames })}</span>
        </li>
      ) : null}
    </ul>
  );
}

type Props = {
  methods: EnabledTeacherPaymentMethod[];
  max?: number;
  className?: string;
};

/** Every way to pay across a teacher's enabled options, as one capped list. */
export function PaymentMethodLogos({ methods, max, className }: Props) {
  const offered = new Set(methods.flatMap((method) => method.checkoutMethods));
  const ranked = CHECKOUT_METHODS_BY_POPULARITY.filter((method) => offered.has(method));
  return <CheckoutMethodBadges methods={ranked} max={max} className={className} />;
}
