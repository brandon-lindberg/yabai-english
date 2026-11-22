"use client";

import type { ComponentProps } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { SubNav, SubNavLink } from "@/components/ui/sub-nav";

const tabs = [
  { key: "overview", href: "/dashboard", icon: "home" },
  { key: "schedule", href: "/dashboard/schedule", icon: "calendar" },
  { key: "profile", href: "/dashboard/profile", icon: "profile" },
  { key: "achievements", href: "/dashboard/art-gallery", icon: "trophy", audience: "student-or-teacher" },
  { key: "lessons", href: "/dashboard/lessons", icon: "bookOpen", audience: "teacher" },
  { key: "students", href: "/dashboard/students", icon: "people", audience: "teacher" },
  { key: "invoices", href: "/dashboard/invoices", icon: "receipt", audience: "teacher" },
  { key: "myTeachers", href: "/dashboard/my-teachers", icon: "graduationCap", audience: "student" },
  { key: "taxonomy", href: "/dashboard/taxonomy", icon: "tags", audience: "teacher" },
] as const satisfies readonly {
  key: string;
  href: ComponentProps<typeof Link>["href"];
  icon: ComponentProps<typeof InterfaceIcon>["name"];
  audience?: "student" | "teacher" | "student-or-teacher";
}[];

export function DashboardSubNav({
  isTeacher = false,
  isStudent = false,
}: {
  isTeacher?: boolean;
  isStudent?: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations("dashboard.nav");
  const locale = useLocale();

  // Settings and integrations have their own navigation.
  if (pathname.includes("/dashboard/settings") || pathname.includes("/dashboard/integrations")) return null;

  const active = tabs.find(({ key, href }) => key !== "overview" && pathname.includes(href))?.key ?? "overview";
  const mobileColumns = isTeacher
    ? "max-md:grid-cols-4 min-[384px]:max-md:grid-cols-8 md:gap-x-4 lg:gap-x-6"
    : "max-md:grid-cols-5";

  return (
    <SubNav
      label={t("ariaLabel")}
      listClassName={`max-md:grid max-md:w-full max-md:gap-0 ${mobileColumns}`}
    >
      {tabs.map((item) => {
        const { key, href, icon } = item;
        if ("audience" in item) {
          if (item.audience === "teacher" && !isTeacher) return null;
          if (item.audience === "student" && !isStudent) return null;
          if (item.audience === "student-or-teacher" && !isStudent && !isTeacher) return null;
        }

        const label = t(key);
        const isGallery = key === "achievements";
        return (
          <SubNavLink
            key={key}
            active={active === key}
            render={({ className, ...props }) => (
              <Link
                {...props}
                href={href}
                locale={isGallery ? locale : undefined}
                prefetch={isGallery ? false : undefined}
                aria-label={label}
                title={label}
                className={`${className} max-md:grid max-md:min-h-11 max-md:place-items-center max-md:p-0`}
              >
                <span className="md:hidden"><InterfaceIcon name={icon} /></span>
                <span className="hidden md:inline">{label}</span>
              </Link>
            )}
          />
        );
      })}
    </SubNav>
  );
}
