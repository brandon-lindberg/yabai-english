import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { legalNavLinksForRole } from "@/lib/legal/legal-nav-links";
import { actionLinkClass } from "@/components/ui/inline-link";

export default async function LegalLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("legal");
  const session = await auth();
  // Students and teachers agree to different marketplace terms, so each side is
  // only offered its own. A signed-out visitor sees all of them: someone
  // deciding whether to teach here has to read the teacher terms first.
  const links = legalNavLinksForRole(session?.user?.role ?? null);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6">
      <nav
        aria-label={t("navAria")}
        className="mb-8 flex flex-wrap gap-x-4 gap-y-2 border-b border-border pb-4 text-sm"
      >
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={actionLinkClass}>
            {t(link.labelKey)}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
