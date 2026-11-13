import { z } from "zod";
import { AccountStatus, Role } from "@/generated/prisma/enums";
import { learningLanguageSchema } from "@/lib/learning-language";

export const adminPeopleSortValues = [
  "createdAt_desc", "createdAt_asc", "name_asc", "name_desc", "email_asc", "email_desc",
  "role_asc", "role_desc", "accountStatus_asc", "accountStatus_desc",
] as const;

export const adminPeopleQuery = z.object({
  role: z.nativeEnum(Role).optional(),
  subject: learningLanguageSchema.optional(),
  status: z.nativeEnum(AccountStatus).optional(),
  q: z.string().trim().max(200).optional(),
  sort: z.enum(adminPeopleSortValues).default("createdAt_desc"),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminPeopleQuery = z.infer<typeof adminPeopleQuery>;
export const defaultPeopleQuery = adminPeopleQuery.parse({});

export function adminPeopleSearch(query: AdminPeopleQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value && value !== defaultPeopleQuery[key as keyof AdminPeopleQuery]) params.set(key, String(value));
  }
  return params.toString();
}

export function adminPeopleHref(search?: string) {
  const query = adminPeopleQuery.safeParse(Object.fromEntries(new URLSearchParams(search)));
  const safeSearch = query.success ? adminPeopleSearch(query.data) : "";
  return safeSearch ? `/admin/users?${safeSearch}` : "/admin/users";
}
