// src/utils/useGroupedBookings.js

import { useMemo } from 'react';
import { STATUSES } from './bookingConstants'; 
// Assuming STATUSES = { ALL: 'All', PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' }

// Helper function to group and process raw bookings
const groupAndProcessBookings = (bookings, filterStatus, filterLocation) => {
    const grouped = {};

    // Ensure bookings is an array before iterating
    const safeBookings = Array.isArray(bookings) ? bookings : []; 

    safeBookings.forEach(booking => {
        
        // FIX 1 (CRITICAL): Default missing properties to guaranteed strings.
        // If status is missing, default it to PENDING so it can be reviewed,
        // or ensure it's a string for comparison.
        const bookingStatus = booking.status || STATUSES.PENDING; 
        
        // If location is missing, default it to 'All' so it passes the location filter by default.
        const bookingLocation = booking.location || STATUSES.ALL; 
        
        // If groupId is missing, create a unique one using its ID (or a timestamp as fallback)
        const bookingGroupId = booking.groupId || 'no_group_' + (booking.id || Date.now()); 

        // 1. Check if the booking matches the status filter
        // We now compare against the guaranteed 'bookingStatus'
        const statusMatch = filterStatus === STATUSES.ALL || bookingStatus === filterStatus;
        
        // 2. Check if the booking matches the location filter
        const locationMatch = filterLocation === STATUSES.ALL || bookingLocation === filterLocation;

        if (!statusMatch || !locationMatch) {
            return; // Skip this booking if it doesn't meet the filter criteria
        }

        const groupId = bookingGroupId; 

        if (!grouped[groupId]) {
            grouped[groupId] = {
                groupId: groupId,
                ...booking, 
                bookings: [], 
                locationCount: 0,
                // Use the safely defined status/location
                status: bookingStatus, 
                location: bookingLocation, 
            };
        }
        
        grouped[groupId].bookings.push(booking);
        grouped[groupId].locationCount++;
        
        // Update Group Status Logic (using currentBookings which now contain the status guard)
        const currentBookings = grouped[groupId].bookings;
        const hasPending = currentBookings.some(b => b.status === STATUSES.PENDING);
        const allApproved = currentBookings.every(b => b.status === STATUSES.APPROVED);
        const allRejected = currentBookings.every(b => b.status === STATUSES.REJECTED);
            
        if (hasPending) {
            grouped[groupId].status = STATUSES.PENDING;
        } else if (allApproved) {
            grouped[groupId].status = STATUSES.APPROVED;
        } else if (allRejected) {
            grouped[groupId].status = STATUSES.REJECTED;
        } else {
            // Mixed status only applies if there are multiple bookings in the group
            grouped[groupId].status = currentBookings.length > 1 ? 'Mixed' : bookingStatus; 
        }
    });

    return Object.values(grouped);
};


// Custom hook to handle all filtering and sorting logic
export function useGroupedBookings(bookings, filterStatus, filterLocation, sortConfig) {
    // Get unique locations for the filter dropdown
    const uniqueLocations = useMemo(() => {
        const safeBookings = Array.isArray(bookings) ? bookings : [];
        // Filter out any non-string/falsy location names before creating the Set
        const locations = new Set(safeBookings.map(b => b.location).filter(l => l && typeof l === 'string'));
        return [STATUSES.ALL, ...Array.from(locations).sort()];
    }, [bookings]);
    
    // Filter, Group, and Sort the bookings
    const groupedAndSortedBookings = useMemo(() => {
        let items = groupAndProcessBookings(bookings, filterStatus, filterLocation);

        if (sortConfig.key) {
            items.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue === undefined || aValue === null) return sortConfig.direction === 'ascending' ? 1 : -1;
                if (bValue === undefined || bValue === null) return sortConfig.direction === 'ascending' ? -1 : 1;

                if (sortConfig.key === 'date') {
                    const aDate = new Date(a.date);
                    const bDate = new Date(b.date);
                    if (aDate < bDate) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (aDate > bDate) return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                
                if (['expectedPeople', 'expectedCars', 'locationCount'].includes(sortConfig.key)) {
                    const aNum = parseInt(aValue, 10) || 0;
                    const bNum = parseInt(bValue, 10) || 0;
                    if (aNum < bNum) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (aNum > bNum) return sortConfig.direction === 'ascending' ? 1 : -1;
                }

                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                
                return 0;
            });
        }
        
        return items;
    }, [bookings, filterStatus, filterLocation, sortConfig]);

    return { groupedBookings: groupedAndSortedBookings, uniqueLocations };
}