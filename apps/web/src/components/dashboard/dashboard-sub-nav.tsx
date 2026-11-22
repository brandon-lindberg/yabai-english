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
  { key: "lessons", href: "/dashboard/lessons", audience: "teacher" },
  { key: "students", href: "/dashboard/students", audience: "teacher" },
  { key: "invoices", href: "/dashboard/invoices", audience: "teacher" },
  { key: "myTeachers", href: "/dashboard/my-teachers", icon: "graduationCap", audience: "student" },
  { key: "taxonomy", href: "/dashboard/taxonomy", audience: "teacher" },
] as const satisfies readonly {
  key: string;
  href: ComponentProps<typeof Link>["href"];
  icon?: ComponentProps<typeof InterfaceIcon>["name"];
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
  const mobileIcons = isStudent && !isTeacher;

  return (
    <SubNav
      label={t("ariaLabel")}
      listClassName={mobileIcons ? "max-md:grid max-md:w-full max-md:grid-cols-5 max-md:gap-0" : undefined}
    >
      {tabs.map((item) => {
        const { key, href } = item;
        if ("audience" in item) {
          if (item.audience === "teacher" && !isTeacher) return null;
          if (item.audience === "student" && !isStudent) return null;
          if (item.audience === "student-or-teacher" && !isStudent && !isTeacher) return null;
        }

        const icon = mobileIcons && "icon" in item ? item.icon : undefined;
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
                aria-label={icon ? label : undefined}
                title={icon ? label : undefined}
                className={icon ? `${className} max-md:grid max-md:min-h-11 max-md:place-items-center max-md:p-0` : className}
              >
                {icon ? (
                  <>
                    <span className="md:hidden"><InterfaceIcon name={icon} /></span>
                    <span className="hidden md:inline">{label}</span>
                  </>
                ) : label}
              </Link>
            )}
          />
        );
      })}
    </SubNav>
  );
}
