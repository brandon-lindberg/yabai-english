import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { adminPeopleHref } from "@/lib/admin/people-query";

export default async function AdminStudentsPage() {
  redirect({ href: adminPeopleHref("role=STUDENT"), locale: await getLocale() });
}
