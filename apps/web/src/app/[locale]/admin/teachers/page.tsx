import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { adminPeopleHref } from "@/lib/admin/people-query";

export default async function AdminTeachersPage() {
  redirect({ href: adminPeopleHref("role=TEACHER"), locale: await getLocale() });
}
