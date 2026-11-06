import type { ReactNode } from "react";
import { auth } from "@/auth";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const locale = await getLocale();
  const user = session?.user;
  if (!user) {
    redirect({ href: "/", locale });
    return null;
  }
  if (user.role !== "SUPER_ADMIN") {
    redirect({ href: "/dashboard", locale });
    return null;
  }
  return (
    <div className="admin-workspace mx-auto grid w-full min-w-0 max-w-7xl flex-1 content-start gap-6 px-4 py-6 sm:px-6 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-8 md:py-8">
      <AdminSubnav />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
