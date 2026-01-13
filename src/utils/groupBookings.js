import { STATUSES } from "./statuses";

export const groupBookings = (bookings, filterLocation) => {
  const grouped = {};

  bookings.forEach((booking) => {
    if (
      filterLocation !== STATUSES.ALL &&
      booking.location !== filterLocation
    ) {
      return;
    }

    const groupId = booking.groupId || `no_group_${booking.id}`;

    if (!grouped[groupId]) {
      grouped[groupId] = {
        groupId,
        ...booking,
        bookings: [],
        locationCount: 0,
      };
    }

    grouped[groupId].bookings.push(booking);
    grouped[groupId].locationCount++;
  });

  return Object.values(grouped).sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
};
