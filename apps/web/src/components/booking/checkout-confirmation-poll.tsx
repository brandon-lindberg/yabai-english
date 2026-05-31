"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Props = {
  bookingId: string;
  initialStatus: string;
  stripeSuccess: boolean;
};

export function CheckoutConfirmationPoll({
  bookingId,
  initialStatus,
  stripeSuccess,
}: Props) {
  const t = useTranslations("booking");
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    if (!stripeSuccess || initialStatus === "CONFIRMED") {
      return;
    }

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      void fetch(`/api/bookings/${bookingId}`)
        .then((res) => res.json())
        .then((data: { status?: string }) => {
          if (data.status === "CONFIRMED") {
            setStatus("CONFIRMED");
            window.clearInterval(timer);
            router.refresh();
          }
        })
        .catch(() => undefined);

      if (attempts >= 12) {
        window.clearInterval(timer);
      }
    }, 2000);

    return () => window.clearInterval(timer);
  }, [bookingId, initialStatus, router, stripeSuccess]);

  if (stripeSuccess && status !== "CONFIRMED") {
    return (
      <p className="mt-4 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted">
        {t("checkoutConfirmingPayment")}
      </p>
    );
  }

  if (status === "CONFIRMED") {
    return (
      <p className="mt-4 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
        {t("checkoutPaymentConfirmed")}
      </p>
    );
  }

  return null;
}
