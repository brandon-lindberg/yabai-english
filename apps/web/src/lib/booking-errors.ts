const SLOT_TAKEN = "That slot was just booked by another student.";
const LEAD_TIME = "Bookings must be made at least 48 hours in advance.";

export function mapBookingApiError(error: string) {
  if (error === SLOT_TAKEN) {
    return "This slot was just booked by another student. Please choose another time.";
  }
  if (error === LEAD_TIME) {
    return LEAD_TIME;
  }
  return error;
}
