import { BookingStatus, type Prisma } from "@/generated/prisma/client";

/**
 * How long an unpaid booking keeps its slot to itself.
 *
 * A student who abandons checkout would otherwise hold the slot forever:
 * nobody else can book it, and the student cannot see that they are the one
 * holding it.
 *
 * The deadline is a column the server writes — never derived on read and never
 * taken from a browser clock — so every reader agrees on when a hold lapses.
 * There is no worker in this deployment, and a sweep that had not run yet would
 * leave the slot stuck; a stored deadline needs nothing to run at all.
 */
export const PENDING_PAYMENT_HOLD_MS = 3 * 60 * 60 * 1000;

/** The deadline to store on a booking that is holding a slot as of `now`. */
export function newHoldExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + PENDING_PAYMENT_HOLD_MS);
}

export function isHoldExpired(
  holdExpiresAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!holdExpiresAt) return true;
  return now.getTime() > holdExpiresAt.getTime();
}

/**
 * Matches the bookings that currently occupy their slot. Use this everywhere a
 * slot's availability is decided, so "still held" means one thing across the
 * booking page, the create path and every reschedule path.
 *
 * Deliberately not for listings or reporting: a lapsed booking is still a real
 * row that its student should see.
 */
export function slotHoldingBookingWhere(now: Date = new Date()): Prisma.BookingWhereInput {
  return {
    OR: [
      { status: BookingStatus.CONFIRMED },
      { status: BookingStatus.PENDING_PAYMENT, holdExpiresAt: { gte: now } },
    ],
  };
}
