import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";

export function revalidateBookingPaths() {
  for (const locale of routing.locales) for (const path of ["/dashboard", "/dashboard/schedule", "/dashboard/schedule/reschedule", "/dashboard/schedule/refunded"]) {
    revalidatePath(`/${locale}${path}`);
  }
}
