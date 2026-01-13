// src/utils/timeUtils.js

/**
 * Checks if two time intervals overlap.
 * Assumes aStart/aEnd and bStart/bEnd are Date objects.
 */
export function overlaps(aStart, aEnd, bStart, bEnd) {
    // Overlap occurs if one interval starts before the other ends, AND
    // the other interval starts before the first one ends.
    return aStart < bEnd && bStart < aEnd;
}