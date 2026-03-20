import { STATUSES } from "./statuses";

export const groupBookings = (bookings, filterLocation) => {
  return bookings
    .filter((booking) => {
      // Filter logic: Check if selected location is inside the 'locations' array
      if (filterLocation === STATUSES.ALL) return true;
      return booking.locations?.includes(filterLocation);
    })
    .map((booking) => ({
      ...booking,
      groupId: booking.id, // Use doc ID as the group identifier
      bookings: [booking],  // Table expects an array, so we wrap the single doc
      locationCount: booking.locations?.length || 0,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};