import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";

/** After a booking is created, bust cache for the teacher roster dashboard page. */
export function revalidateDashboardStudentRosterPaths(): void {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/dashboard/students`);
  }
}
