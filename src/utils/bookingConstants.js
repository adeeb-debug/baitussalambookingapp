// src/utils/bookingConstants.js

// Define the available statuses for filtering
export const STATUSES = {
    ALL: 'All',
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
};

// Map table headers to booking properties (keys) for sorting
export const SORTABLE_COLUMNS = {
    status: 'Status',
    eventName: 'Event Name',
    requestedByName: 'Requested By',
    locationCount: 'Locations', // Key for Group Count
    date: 'Date',
    fromTime: 'Time Slot',
    expectedPeople: 'People',
    expectedCars: 'Cars',
};