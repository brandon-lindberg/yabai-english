"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SubNav, SubNavLink } from "@/components/ui/sub-nav";

export function AdminPeopleNav({ active }: { active: "directory" | "tiers" }) {
  const t = useTranslations("admin");
  return (
    <SubNav label={t("nav.users")}>
      <SubNavLink active={active === "directory"} render={(props) => <Link href="/admin/users" {...props}>{t("usersPage.directory")}</Link>} />
      <SubNavLink active={active === "tiers"} render={(props) => <Link href="/admin/teacher-tiers" {...props}>{t("nav.teacherTiers")}</Link>} />
    </SubNav>
  );
}
