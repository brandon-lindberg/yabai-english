import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { actionLinkClass } from "@/components/ui/inline-link";

/**
 * Why you cannot apply to teach here yet.
 *
 * Public and static: no session is read, so it renders the same for a signed-out
 * visitor as for anyone else — which is the point, since the people who need it
 * do not have an account.
 *
 * It says one awkward thing plainly rather than softening it. "Invite only" with
 * no form and no waiting list is a closed door, and a page that implied
 * otherwise would collect hope it cannot honour. What it can offer is the truth
 * about what happens next, and a reason to look again.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("becomeTeacher");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

function Section({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-6">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-[62ch] leading-relaxed text-muted">{body}</p>
      {children ? <p className="mt-3">{children}</p> : null}
    </section>
  );
}

export default async function BecomeATeacherPage() {
  const t = await getTranslations("becomeTeacher");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-16 sm:px-6">
      <PageHeader title={t("title")} description={t("intro")} />

      <Section title={t("statusTitle")} body={t("statusBody")} />

      <Section title={t("nextTitle")} body={t("nextBody")} />

      <Section title={t("questionsTitle")} body={t("questionsBody")}>
        <Link href="/contact" className={actionLinkClass}>
          {t("questionsCta")}
        </Link>
      </Section>
    </main>
  );
}
