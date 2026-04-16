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
  if (user.role !== "ADMIN") {
    redirect({ href: "/dashboard", locale });
    return null;
  }
  return (
    <div className="mx-auto max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <AdminSubnav />
      {children}
    </div>
  );
}
