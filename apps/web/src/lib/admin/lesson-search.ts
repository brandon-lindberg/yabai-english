import "server-only";
import { DateTime } from "luxon";
import { z } from "zod";
import { BookingStatus } from "@/generated/prisma/enums";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { learningLanguageSchema } from "@/lib/learning-language";
import { resolveViewerTimeZone, validViewerTimeZone } from "@/lib/viewer-time-zone";
import { buildMonthCells, dayKeyToIsoAtNoon } from "@/lib/slot-calendar";
import type { AdminLessonCalendarQuery } from "./lesson-calendar";
import { adminLessonsForPerson, pendingPrivateReschedules, upcomingAdminLessonsWhere } from "./lesson-filters";

const pageSize = 20;
export const adminLessonQuery = z.object({
  q: z.string().trim().max(200).optional(),
  person: z.string().min(1).max(200).optional(),
  subject: learningLanguageSchema.optional(),
  status: z.nativeEnum(BookingStatus).optional(),
  view: z.enum(["all", "upcoming", "history", "reschedules"]).default("all"),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  zone: z.string().max(100).refine((zone) => Boolean(validViewerTimeZone(zone))).optional(),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
}).refine(({ from, to }) => !from || !to || from <= to, { path: ["to"] });

export type AdminLessonQuery = z.infer<typeof adminLessonQuery>;
export const defaultAdminLessonQuery = adminLessonQuery.parse({});

export function adminLessonSearch(query: AdminLessonQuery) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value && value !== defaultAdminLessonQuery[key as keyof AdminLessonQuery]) search.set(key, String(value));
  }
  return search.toString();
}

export function adminLessonsHref(search?: string) {
  const parsed = adminLessonQuery.safeParse(Object.fromEntries(new URLSearchParams(search)));
  const safe = parsed.success ? adminLessonSearch(parsed.data) : "";
  return safe ? `/admin/lessons?${safe}` : "/admin/lessons";
}

const participantSelect = { id: true, name: true, email: true } as const;
const lessonSelect = {
  id: true, startsAt: true, status: true, learningLanguage: true, privateRescheduleStatus: true, meetUrl: true,
  lessonProduct: { select: { nameEn: true, nameJa: true, tier: true, durationMin: true } },
  student: { select: participantSelect },
  teacher: { select: { displayName: true, user: { select: participantSelect } } },
} satisfies Prisma.BookingSelect;

export async function loadAdminLessons(db: PrismaClient, query: AdminLessonQuery, now: Date) {
  const filters: Prisma.BookingWhereInput[] = [];
  if (query.view === "upcoming") filters.push(upcomingAdminLessonsWhere(now));
  if (query.view === "history") filters.push({ startsAt: { lt: now } });
  if (query.view === "reschedules") filters.push(pendingPrivateReschedules);
  if (query.person) filters.push(adminLessonsForPerson(query.person));
  if (query.subject) filters.push({ learningLanguage: query.subject });
  if (query.status) filters.push({ status: query.status });
  if (query.from || query.to) {
    const zone = resolveViewerTimeZone(query.zone);
    filters.push({ startsAt: {
      ...(query.from ? { gte: DateTime.fromISO(query.from, { zone }).startOf("day").toJSDate() } : {}),
      ...(query.to ? { lt: DateTime.fromISO(query.to, { zone }).plus({ days: 1 }).startOf("day").toJSDate() } : {}),
    } });
  }
  if (query.q) {
    const q = query.q;
    const contains = { contains: q.replace(/[\\%_]/g, "\\$&"), mode: "insensitive" } as const;
    filters.push({ OR: [
      { id: q }, { studentId: q }, { teacherId: q }, { teacher: { userId: q } },
      { student: { name: contains } }, { student: { email: contains } },
      { teacher: { displayName: contains } }, { teacher: { user: { name: contains } } }, { teacher: { user: { email: contains } } },
      { lessonProduct: { nameEn: contains } }, { lessonProduct: { nameJa: contains } },
    ] });
  }
  const where = { AND: filters };
  const order = query.view === "upcoming" || query.view === "reschedules" ? "asc" : "desc";
  return db.$transaction(async (tx) => {
    const total = await tx.booking.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(query.page, totalPages);
    const bookings = await tx.booking.findMany({
      where, select: lessonSelect,
      orderBy: [{ startsAt: order }, { id: order }],
      skip: (page - 1) * pageSize, take: pageSize,
    });
    return { bookings, page, totalPages, total };
  }, { isolationLevel: "RepeatableRead" });
}

export function loadAdminLessonDetail(db: PrismaClient, id: string) {
  return db.booking.findUnique({
    where: { id },
    select: {
      ...lessonSelect,
      endsAt: true, quotedPriceYen: true,
      rescheduleCount: true, rescheduleRequestedAt: true, rescheduleResolvedAt: true,
      invoice: { select: { invoiceNo: true, amountYen: true, paidAt: true } },
      payments: { select: {
        id: true, provider: true, status: true, method: true, amountYen: true, paidAt: true, providerPaymentId: true,
        recovery: { select: { state: true, feeRecoveryPending: true } },
      } },
      refunds: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { id: true, status: true, amountYen: true, providerRefundId: true, creditNoteNo: true, createdAt: true },
      },
    },
  });
}

export function loadAdminPersonSchedule(db: PrismaClient, personId: string, query: AdminLessonCalendarQuery, now: Date) {
  const anchor = DateTime.fromISO(query.date ?? now.toISOString().slice(0, 10), { zone: "utc" });
  let start = anchor;
  let end = anchor;
  if (query.view === "week") {
    start = anchor.startOf("week");
    end = start.plus({ days: 6 });
  } else if (query.view === "month") {
    const cells = buildMonthCells(dayKeyToIsoAtNoon(anchor.toISODate()!, "UTC"), "en", "UTC");
    start = DateTime.fromISO(cells[0].dayKey, { zone: "utc" });
    end = DateTime.fromISO(cells[cells.length - 1].dayKey, { zone: "utc" });
  }
  // The calendar groups in the admin's browser zone. Padding covers either
  // side of UTC midnight, including the adjacent week when opening on today.
  const padding = !query.date && query.view === "week" ? 8 : 1;
  return db.booking.findMany({
    where: {
      ...adminLessonsForPerson(personId),
      startsAt: { gte: start.minus({ days: padding }).toJSDate(), lt: end.plus({ days: padding + 1 }).toJSDate() },
    },
    select: { ...lessonSelect, endsAt: true, holdExpiresAt: true },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
  });
}
