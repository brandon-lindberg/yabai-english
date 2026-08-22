import { createUserNotification } from "@/lib/notifications";
import {
  summarizeStripeRequirements,
  type StripeAccountPhase,
  type StripeRequirementHint,
} from "@/lib/teacher-stripe-setup";

/** Where a teacher lands to see the detail behind any of these notifications. */
export const TEACHER_PAYMENTS_SETTINGS_HREF = "/dashboard/settings?tab=payments";

/** The walkthrough for Stripe's onboarding questions. */
export const STRIPE_ONBOARDING_GUIDE_HREF = "/guides/stripe-onboarding";

/**
 * Phases worth interrupting a teacher for. `in_progress` is deliberately absent:
 * it only ever means "you have not finished the form you are already looking
 * at", which is not news.
 */
const NOTIFIABLE_PHASES = new Set<StripeAccountPhase>([
  "ready",
  "in_review",
  "action_required",
  "restricted",
]);

export function isNotifiableStripePhase(phase: StripeAccountPhase): boolean {
  return NOTIFIABLE_PHASES.has(phase);
}

/** Plain-text hints, because notifications store text and not message keys. */
const REQUIREMENT_TEXT: Record<StripeRequirementHint, { en: string; ja: string }> = {
  identity: {
    en: "identity verification (an ID document may be requested)",
    ja: "本人確認（身分証明書の提出を求められる場合があります）",
  },
  bank: {
    en: "your payout bank account details",
    ja: "振込先の銀行口座情報",
  },
  business: {
    en: "your business details",
    ja: "事業情報",
  },
  other: {
    en: "additional information",
    ja: "追加情報",
  },
};

function describeRequirements(requirementsDue: string[]): { en: string; ja: string } | null {
  const hints = summarizeStripeRequirements(requirementsDue);
  if (hints.length === 0) return null;
  return {
    en: hints.map((hint) => REQUIREMENT_TEXT[hint].en).join(", "),
    ja: hints.map((hint) => REQUIREMENT_TEXT[hint].ja).join("、"),
  };
}

type PhaseMessage = { titleEn: string; titleJa: string; bodyEn: string; bodyJa: string; href: string };

function buildMessage(
  phase: StripeAccountPhase,
  requirementsDue: string[],
): PhaseMessage | null {
  switch (phase) {
    case "ready":
      return {
        titleEn: "Stripe approved your account",
        titleJa: "Stripe アカウントが承認されました",
        bodyEn: "Students can now pay you for lessons. Nothing else is needed.",
        bodyJa: "生徒がレッスン料をお支払いできるようになりました。追加の操作は不要です。",
        href: TEACHER_PAYMENTS_SETTINGS_HREF,
      };
    case "in_review":
      return {
        titleEn: "Stripe is reviewing your account",
        titleJa: "Stripe がアカウントを審査中です",
        bodyEn:
          "Your details are submitted and Stripe is checking them. This is a normal part of setup — there is nothing for you to do, and paid lessons turn on automatically once it finishes. Reviews usually take a few business days.",
        bodyJa:
          "情報の送信は完了し、Stripe が内容を確認しています。これは通常の手続きで、お客様に必要な操作はありません。審査が完了すると有料レッスンは自動的に有効になります。審査は通常数営業日かかります。",
        href: TEACHER_PAYMENTS_SETTINGS_HREF,
      };
    case "action_required": {
      // Naming the missing piece is the whole point of this one — "Stripe needs
      // something" with no hint of what sends the teacher hunting through the
      // Stripe dashboard.
      const detail = describeRequirements(requirementsDue);
      return {
        titleEn: "Stripe needs more information",
        titleJa: "Stripe に追加情報が必要です",
        bodyEn: detail
          ? `Stripe is waiting on ${detail.en}. Payments stay off until you provide it. Our setup guide explains each question.`
          : "Stripe is waiting on more information before payments can go live. Open Stripe to see exactly what is missing — our setup guide explains each question.",
        bodyJa: detail
          ? `Stripe が${detail.ja}を待っています。ご提供いただくまで決済は有効になりません。各質問の回答方法はセットアップガイドをご覧ください。`
          : "決済を有効にする前に、Stripe が追加情報を必要としています。不足している項目は Stripe でご確認ください。各質問の回答方法はセットアップガイドをご覧ください。",
        href: TEACHER_PAYMENTS_SETTINGS_HREF,
      };
    }
    case "restricted":
      return {
        titleEn: "Stripe has restricted your account",
        titleJa: "Stripe アカウントが制限されています",
        bodyEn:
          "Stripe cannot enable payments for this account, and it will not clear on its own. Sign in to your Stripe dashboard and contact Stripe support to resolve it.",
        bodyJa:
          "このアカウントでは決済を有効にできません。時間の経過で解消することはありません。Stripe ダッシュボードにログインし、Stripe サポートにお問い合わせください。",
        href: TEACHER_PAYMENTS_SETTINGS_HREF,
      };
    default:
      return null;
  }
}

/**
 * Tells a teacher their Stripe status changed, so they learn it from the bell
 * rather than by opening settings on the off chance.
 *
 * Fires only on a real transition. `account.updated` arrives for changes that
 * have nothing to do with onboarding — a payout schedule edit, a metadata write
 * — and re-announcing "Stripe is reviewing your account" on each of those would
 * train teachers to ignore the ones that matter.
 */
export async function notifyTeacherOfStripePhaseChange(input: {
  userId: string;
  previousPhase: StripeAccountPhase;
  nextPhase: StripeAccountPhase;
  requirementsDue?: string[];
}): Promise<boolean> {
  if (input.previousPhase === input.nextPhase) return false;
  if (!isNotifiableStripePhase(input.nextPhase)) return false;

  const message = buildMessage(input.nextPhase, input.requirementsDue ?? []);
  if (!message) return false;

  await createUserNotification({
    userId: input.userId,
    titleEn: message.titleEn,
    titleJa: message.titleJa,
    bodyEn: message.bodyEn,
    bodyJa: message.bodyJa,
    href: message.href,
  });
  return true;
}
