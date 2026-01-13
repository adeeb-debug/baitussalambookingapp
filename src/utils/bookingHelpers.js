// src/utils/bookingHelpers.js

import React from 'react';
import { Box, Typography, List } from '@mui/material';
import { ArrowDownward, ArrowUpward } from '@mui/icons-material';

// Helper function to get the current sort icon
export const getSortIcon = (key, sortConfig) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />;
};

// Helper function to render status chips
export const renderStatusChip = (status, theme) => {
    const statusColor = {
        'Pending': theme.palette.secondary.main, 
        'Approved': theme.palette.success.main, 
        'Rejected': theme.palette.error.main,  
        'Cancelled': theme.palette.grey[500],
        'Mixed': theme.palette.warning.dark,
    };
    
    // If status is not found, use a grey fallback color
    const color = statusColor[status] || theme.palette.grey[500];

    return (
        <Box 
            component="span"
            sx={{
                fontWeight: 700, 
                color: 'white', 
                bgcolor: color, 
                p: '4px 8px', 
                borderRadius: 1,
                textTransform: 'uppercase',
                fontSize: '0.7rem' 
            }}
        >
            {status || 'N/A'}
        </Box>
    );
};

// Helper function to format extra details for group header tooltip
export const formatGroupDetails = (group) => {
    // --- ROBUSTNESS FIXES ---
    // 1. Ensure group.bookings is an array before filtering
    const safeBookings = Array.isArray(group.bookings) ? group.bookings : [];
    const pendingCount = safeBookings.filter(b => b.status === 'Pending').length;
    
    // 2. Safely format the requestedAt date (CRITICAL CRASH FIX)
    const formattedRequestedAt = group.requestedAt 
        ? new Date(group.requestedAt).toLocaleString() 
        : 'N/A';

    return (
        <List dense sx={{ py: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                {group.eventName || 'N/A'}
            </Typography>
            <Typography variant="caption" display="block">
                **Total Locations:** {group.locationCount || 0}
            </Typography>
            <Typography variant="caption" display="block">
                **Pending Approval:** {pendingCount}
            </Typography>
            <Typography variant="caption" display="block">
                **Contact:** {group.phoneNumber || 'N/A'}
            </Typography>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                *Requested: {formattedRequestedAt}*
            </Typography>
        </List>
    );
}