import type { AbstractIntlMessages } from "next-intl";

// Layout scopes follow the route tree, so retained layouts never need to guess
// the active pathname. Server translations still use the complete dictionary.
export const clientMessageScopes = {
  shell: ["common", "auth", "learningJourney", "chat", "study.viewAwardCollection", "study.achievementUnlocked", "study.dismissAchievement"],
  placement: ["placement", "onboarding"],
  japanesePlacement: ["japanesePlacement", "placement", "onboarding", "study", "japaneseStudy",
    "dashboard.quickReview", "dashboard.previous", "dashboard.next"],
  learn: ["learn", "study", "japaneseStudy", "onboarding"],
  gallery: ["dashboard.nav"],
  dashboard: ["dashboard", "booking", "study", "japaneseStudy", "japanesePlacement", "onboarding",
    "paymentMethods", "paymentPolicy", "admin.teachingLanguages"],
  admin: ["admin", "dashboard", "booking", "org.roles"],
  book: ["booking", "onboarding", "paymentMethods", "paymentPolicy"],
  onboarding: ["onboarding", "paymentPolicy"],
  org: ["org", "dashboard"],
  teacherInvitation: ["teacherInvitation"],
} as const;
export type ClientMessageScope = keyof typeof clientMessageScopes;

function selectMessages(messages: AbstractIntlMessages, paths: readonly string[]): AbstractIntlMessages {
  const groups = new Map<string, string[]>();
  for (const path of paths) {
    const [key, ...tail] = path.split(".");
    groups.set(key, [...(groups.get(key) ?? []), tail.join(".")]);
  }
  return Object.fromEntries([...groups].map(([key, tails]) => {
    const value = messages[key];
    if (value === undefined) throw new Error(`Missing client message scope: ${key}`);
    if (tails.includes("")) return [key, value];
    if (typeof value !== "object") throw new Error(`Invalid client message scope: ${key}`);
    return [key, selectMessages(value, tails)];
  }));
}

export function clientMessages(messages: AbstractIntlMessages, scope: ClientMessageScope): AbstractIntlMessages {
  return selectMessages(messages, clientMessageScopes[scope]);
}
