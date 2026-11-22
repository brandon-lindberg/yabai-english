import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link, redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getLearnerGallery } from "@/lib/achievements/learner-gallery";
import { getTeacherGallery } from "@/lib/achievements/teacher-gallery";
import { teachingHiddenAchievementCount } from "@/lib/achievements/teaching-catalogue";
import { galleryPageSize, hiddenAchievementCount } from "@/lib/achievements/gallery";
import { achievementScope } from "@/lib/achievements/rarity";
import { readUnlockRates } from "@/lib/achievements/rarity-snapshot";
import { achievementArtworkSource } from "@/lib/achievements/artwork";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";
import { SubNav, SubNavLink } from "@/components/ui/sub-nav";
import styles from "./achievement-gallery.module.css";

const path = "/dashboard/art-gallery";
type Options = { view?: string; page?: string; piece?: string };

function galleryHref(collected: boolean, page = 1, piece?: string) {
  const query = new URLSearchParams();
  if (collected) query.set("view", "collected");
  if (page > 1) query.set("page", String(page));
  if (piece) query.set("piece", piece);
  return query.size ? path + "?" + query.toString() : path;
}

async function Artwork({ id, earned, hidden, rare, large = false, eager = false }: {
  id: string;
  earned: boolean;
  hidden: boolean;
  rare?: boolean;
  large?: boolean;
  eager?: boolean;
}) {
  if (hidden && !earned) return null;
  const source = await achievementArtworkSource(id, hidden);
  return (
    <div data-achievement-rare={rare || undefined} className={`grid aspect-square place-items-center overflow-hidden rounded-sm border border-border bg-surface ${large ? "p-5" : "p-2.5 sm:p-3"} ${rare ? styles.rareArtwork : ""}`}>
      <Image src={source} width={128} height={128} alt="" unoptimized loading={eager || large ? "eager" : "lazy"}
        className={`aspect-square h-full w-full object-contain [image-rendering:pixelated] ${earned ? "" : "opacity-50 grayscale"}`} />
    </div>
  );
}

export default async function ArtGalleryPage({ searchParams }: { searchParams: Promise<Options> }) {
  const [session, locale, t, options] = await Promise.all([auth(), getLocale(), getTranslations("artGallery"), searchParams]);
  if (!session?.user?.id) return redirect({ href: "/auth/signin?callbackUrl=/dashboard/art-gallery", locale });
  const teaching = isTeacherCabinetRole(session.user.role);
  const language = session.user.learningLanguage ?? "ENGLISH";
  const scope = achievementScope(teaching, language);
  const [cards, unlockRate] = await Promise.all([
    teaching ? getTeacherGallery(prisma, session.user.id) : getLearnerGallery(prisma, session.user.id, language),
    readUnlockRates(prisma, scope),
  ]);
  const isHidden = (card: typeof cards[number]) => "hidden" in card && card.hidden;
  const surprises = teaching ? teachingHiddenAchievementCount - cards.filter(isHidden).length : hiddenAchievementCount;
  const collected = cards.filter(card => card.awardedAt !== null)
    .sort((a, b) => b.awardedAt!.getTime() - a.awardedAt!.getTime());
  const onlyCollected = options.view === "collected";
  const items = onlyCollected ? collected : cards;
  const pages = Math.max(1, Math.ceil(items.length / galleryPageSize));
  const page = Math.min(pages, Math.max(1, Number.parseInt(options.page ?? "", 10) || 1));
  const index = locale === "ja" ? 1 : 0;
  const piece = items.find(card => card.id === options.piece);
  const stateLabel = (card: typeof cards[number]) => t(card.awardedAt ? "earned" : card.progress ? "locked" : "upcoming");
  const percentage = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 });
  function rarityFor(card: typeof cards[number]) {
    const rate = unlockRate(card.id, Boolean(card.awardedAt));
    const rare = Boolean(rate?.rare && (card.progress || card.awardedAt));
    return {
      rare,
      label: rate
        ? t(rare ? "rareRate" : "unlockRate", { percent: `${rate.belowMinimum ? "<" : ""}${percentage.format(rate.fraction)}` })
        : t("ratePending"),
    };
  }

  if (piece) {
    const { rare, label } = rarityFor(piece);
    return (
      <section>
        <Link locale={locale} href={galleryHref(onlyCollected, page)} prefetch={false} className="mb-6 inline-block py-2 text-sm font-semibold underline underline-offset-4">← {t("back")}</Link>
        <div className="grid items-center gap-6 sm:grid-cols-2 sm:gap-10">
          <Artwork id={piece.id} earned={!!piece.awardedAt} hidden={isHidden(piece)} rare={rare} large />
          <div>
            <PageHeader title={piece.title[index]} description={piece.caption[index]} />
            <p className="font-bold">{stateLabel(piece)}</p>
            <p className="mt-1 text-sm tabular-nums text-muted">{label}</p>
            <p className="mt-2">{piece.rule[index]}</p>
            {piece.details && <details className="mt-3 text-sm">
              <summary className="w-fit cursor-pointer font-semibold">{t("conditions")}</summary>
              <p className="mt-2 leading-relaxed">{piece.details[index]}</p>
            </details>}
            <p className="mt-3 text-sm text-muted">{piece.awardedAt
              ? t("awarded", { date: new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "Asia/Tokyo" }).format(piece.awardedAt) })
              : piece.progress ? t("progress", piece.progress) : t("upcomingInfo")}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <PageHeader title={t("title")} description={t(teaching ? "teaching" : language === "JAPANESE" ? "japanese" : "english")}
        actions={<span className="text-sm font-semibold tabular-nums">{t("count", { earned: collected.length, total: cards.length + surprises })}</span>} />
      <SubNav label={t("views")}>
        <SubNavLink active={!onlyCollected} render={props => <Link locale={locale} href={path} prefetch={false} {...props}>{t("all")}</Link>} />
        <SubNavLink active={onlyCollected} render={props => <Link locale={locale} href={galleryHref(true)} prefetch={false} {...props}>{t("collected")}</Link>} />
      </SubNav>
      {items.length === 0 ? (
        <div className="flex flex-wrap items-center gap-4">
          <p>{t(teaching ? "teachingEmpty" : "empty")}</p>
          <Link locale={locale} href={teaching ? "/dashboard/lessons" : "/learn/study"} className={buttonClasses({ size: "sm" })}>{t(teaching ? "manageLessons" : "study")}</Link>
        </div>
      ) : (
        <ul className="grid list-none grid-cols-2 gap-x-4 gap-y-8 p-0 sm:grid-cols-4 sm:gap-x-5">
          {items.slice((page - 1) * galleryPageSize, page * galleryPageSize).map((card, i) => {
            const { rare, label } = rarityFor(card);
            return (
              <li key={card.id} className="min-w-0">
                <Link locale={locale} href={galleryHref(onlyCollected, page, card.id)} prefetch={false} className="group block rounded-sm">
                  <Artwork id={card.id} earned={!!card.awardedAt} hidden={isHidden(card)} rare={rare} eager={i === 0} />
                  <h2 className="mt-3 text-base font-bold leading-tight group-hover:underline">{card.title[index]}</h2>
                  <p className="mt-1 text-xs font-semibold text-muted">{stateLabel(card)}</p>
                </Link>
                <p className="mt-2 text-sm leading-snug">{card.rule[index]}</p>
                <p className="mt-1 text-xs tabular-nums text-muted">{label}</p>
              </li>
            );
          })}
        </ul>
      )}
      {pages > 1 && <nav aria-label={t("pages")} className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-4">
        {page > 1 ? <Link locale={locale} href={galleryHref(onlyCollected, page - 1)} prefetch={false} className={buttonClasses({ variant: "secondary", size: "sm" })}>{t("previous")}</Link> : <span />}
        <span className="text-sm tabular-nums text-muted">{t("page", { page, pages })}</span>
        {page < pages ? <Link locale={locale} href={galleryHref(onlyCollected, page + 1)} prefetch={false} className={buttonClasses({ variant: "secondary", size: "sm" })}>{t("next")}</Link> : <span />}
      </nav>}
      {!onlyCollected && surprises > 0 && <aside className="mt-8 flex items-center gap-4 border-t border-border pt-5">
        <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center border border-dashed border-border text-xl font-bold text-muted">?</span>
        <div><h2 className="font-semibold">{t("hidden", { count: surprises })}</h2><p className="text-sm text-muted">{t("hiddenHelp")}</p></div>
      </aside>}
    </section>
  );
}
