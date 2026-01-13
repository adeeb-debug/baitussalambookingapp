// src/components/UserBookings.jsx - UI/UX Improved Version
// FIX: Refactored groupedUserBookings logic for accurate composite status.
// ADD: New status 'Partially Approved' for mixed results (Approved/Rejected/Cancelled).

import React, { useState, useMemo } from "react";
import {
    Box,
    Typography,
    IconButton,
    CircularProgress,
    Alert,
    List,
    ListItem,
    Grid,
    Chip,
    Tooltip,
    Divider,
    Button,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PhoneIcon from "@mui/icons-material/Phone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import EventIcon from "@mui/icons-material/Event";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
// ADDED icon for Partial Status
import AccountTreeIcon from '@mui/icons-material/AccountTree'; 

import {
    doc,
    writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

// Helper function to get status icon (Updated to include 'Partially Approved')
const getStatusIcon = (status) => {
    switch (status) {
        case "Approved":
            return <CheckCircleOutlineIcon />;
        case "Pending":
        case "In Review": // Use In Review for overall pending status
            return <WarningAmberIcon />;
        case "Rejected":
        case "Cancelled":
            return <CancelOutlinedIcon />;
        case "Partially Approved": // New Status
            return <AccountTreeIcon />;
        default:
            return null;
    }
};

// Helper function to get status color (Updated to include 'Partially Approved')
const getStatusColor = (status) => {
    switch (status) {
        case "Approved":
            return "success";
        case "Pending":
        case "In Review":
            return "warning";
        case "Rejected":
        case "Cancelled":
            return "error";
        case "Partially Approved": // New Status - Use secondary color or a specific neutral color
            return "secondary"; 
        default:
            return "default";
    }
};

/**
 * Calculates the composite status of the entire event group.
 * Hierarchy:
 * 1. PENDING: If ANY is Pending.
 * 2. REJECTED: If ALL are Rejected/Cancelled (and no Pending).
 * 3. APPROVED: If ALL are Approved (and no Pending/Rejected/Cancelled).
 * 4. PARTIALLY APPROVED: If status mix contains Approved and Rejected/Cancelled (and no Pending).
 */
const calculateGroupStatus = (bookings) => {
    const statuses = bookings.map(b => b.status);
    const totalCount = statuses.length;
    
    const isPending = statuses.some(s => s === "Pending");
    const isApproved = statuses.some(s => s === "Approved");
    const isRejectedOrCancelled = statuses.some(s => s === "Rejected" || s === "Cancelled");
    
    const approvedCount = statuses.filter(s => s === "Approved").length;
    const rejectedCount = statuses.filter(s => s === "Rejected" || s === "Cancelled").length;

    if (isPending) {
        // If anything is pending, the group is still in review
        return "In Review"; 
    }
    
    if (approvedCount === totalCount) {
        // All parts are approved
        return "Approved";
    }

    if (rejectedCount === totalCount) {
        // All parts are rejected/cancelled
        return "Rejected"; 
    }

    if (isApproved && isRejectedOrCancelled) {
        // Mix of approved and rejected/cancelled
        return "Partially Approved";
    }
    
    // Fallback (e.g., all cancelled, or some other unexpected state)
    return "In Review"; 
}


export default function UserBookings({ user, bookings, loading }) {
    const [deletingGroupId, setDeletingGroupId] = useState(null);

    // --------------------------------------------------
    // 1. DATA GROUPING LOGIC (REFRESHED)
    // --------------------------------------------------
    const groupedUserBookings = useMemo(() => {
        if (!user || !bookings) return [];

        const userBookings = bookings.filter((b) => b.requestedBy === user.email);
        const grouped = {};

        userBookings.forEach((b) => {
            const groupId = b.groupId || "no_group_" + b.id;

            if (!grouped[groupId]) {
                grouped[groupId] = {
                    groupId: groupId,
                    eventName: b.eventName,
                    requestedByName: b.requestedByName,
                    date: b.date,
                    fromTime: b.fromTime,
                    toTime: b.toTime,
                    phoneNumber: b.phoneNumber,
                    // Note: We don't set status here, we calculate it at the end
                    bookings: [],
                    rejectionReason: null, // Capture reason regardless of what the final status is
                };
            }

            grouped[groupId].bookings.push(b);

            // Capture the first rejection reason found in the group for display, even if it's not the final overall status
            if (b.status === "Rejected" && !grouped[groupId].rejectionReason) {
                grouped[groupId].rejectionReason = b.rejectionReason;
            }
        });
        
        // Calculate the final composite status for each group
        Object.values(grouped).forEach(group => {
            group.status = calculateGroupStatus(group.bookings);
        });


        // Sort by date descending
        return Object.values(grouped).sort(
            (a, b) => new Date(b.date) - new Date(a.date)
        );
    }, [user, bookings]);
    
    // ... (rest of the component logic)
    
    // --------------------------------------------------
    // 2. CONDITIONAL EARLY RETURN CHECK (Login Required)
    // --------------------------------------------------
    if (!user) {
        return (
            <Box sx={{ p: 0, width: "100%" }}>
                <Typography
                    variant="h5"
                    component="h2"
                    gutterBottom
                    sx={{ fontWeight: 600, color: "primary.main", mt: 0, mb: 3, borderBottom: "2px solid #ddd", pb: 1, }}
                >
                    Your Bookings
                </Typography>
                <Alert severity="info" sx={{ width: "100%" }}>
                    Please Sign In to view your booking requests.
                </Alert>
            </Box>
        );
    }

    // --------------------------------------------------
    // 3. GROUP DELETION LOGIC (Re-used)
    // --------------------------------------------------
    const deleteGroup = async (group) => {
        if (
            !window.confirm(
                `Are you sure you want to cancel the entire event "${group.eventName}" and delete all ${group.bookings.length} associated location requests? This action cannot be undone.`
            )
        ) {
            return;
        }

        setDeletingGroupId(group.groupId);

        try {
            const batch = writeBatch(db);

            group.bookings.forEach((b) => {
                const bookingRef = doc(db, "bookings", b.id);
                batch.delete(bookingRef);
            });

            await batch.commit();

            alert(
                `Event "${group.eventName}" and all ${group.bookings.length} locations successfully cancelled.`
            );
        } catch (err) {
            console.error("Group deletion error:", err);
            alert("Failed to delete the entire event: " + err.message);
        } finally {
            setDeletingGroupId(null);
        }
    };

    // --------------------------------------------------
    // 4. MAIN RENDER (Refined UI)
    // --------------------------------------------------
    return (
        <Box sx={{ p: 0, width: "100%" }}>
            <Typography
                variant="h5"
                component="h2"
                gutterBottom
                sx={{ fontWeight: 600, color: "primary.main", mt: 0, mb: 3, borderBottom: "2px solid #ddd", pb: 1, }}
            >
                Your Active Events
            </Typography>

            {/* Loading State */}
            {loading && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                    <CircularProgress size={24} />
                </Box>
            )}

            {/* Empty State */}
            {!loading && groupedUserBookings.length === 0 && (
                <Alert severity="info" sx={{ width: "100%", py: 2 }}>
                    You have no active or recent booking requests.
                </Alert>
            )}

            {/* Event List */}
            <List sx={{ display: "flex", flexDirection: "column", gap: 3, p: 0 }}>
                {groupedUserBookings.map((group) => {
                    const statusColor = getStatusColor(group.status);
                    const isDeleting = deletingGroupId === group.groupId;

                    return (
                        <ListItem
                            key={group.groupId}
                            disablePadding
                            sx={{
                                p: 3,
                                border: 1,
                                // Use the calculated composite status color for the border
                                borderColor: `${statusColor}.light`, 
                                borderRadius: 2,
                                bgcolor: "white",
                                boxShadow: 2,
                                transition: "box-shadow 0.3s",
                                "&:hover": { boxShadow: 4 },
                            }}
                        >
                            <Grid container spacing={2} sx={{ width: "100%" }}>
                                {/* -------------------- EVENT SUMMARY (LEFT COLUMN) -------------------- */}
                                <Grid item xs={12} md={8}>
                                    <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                        {/* Event Name */}
                                        <Typography
                                            variant="h6"
                                            component="div"
                                            sx={{ fontWeight: 700, color: "primary.dark", display: "flex", alignItems: "center", gap: 1 }}
                                        >
                                            <EventIcon color="primary" />
                                            {group.eventName || "Unnamed Event"}
                                        </Typography>
                                        
                                        {/* Status Chip (Mobile/Tablet Friendly) */}
                                        <Chip
                                            icon={getStatusIcon(group.status)}
                                            label={group.status}
                                            color={statusColor}
                                            size="small"
                                            sx={{ display: { xs: 'flex', md: 'none' } }} // Show chip on smaller screens
                                        />
                                    </Box>

                                    {/* Date & Time */}
                                    <Typography variant="body1" color="text.primary" sx={{ ml: 3, fontWeight: 600, mb: 1 }}>
                                        {group.date} from {group.fromTime} to {group.toTime}
                                    </Typography>
                                    
                                    {/* Phone Number */}
                                    <Typography variant="body2" color="text.secondary" sx={{ ml: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <PhoneIcon fontSize="small" />
                                        Contact: {group.phoneNumber}
                                    </Typography>

                                    <Divider sx={{ my: 2 }} />

                                    {/* Locations List */}
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                        Locations Booked ({group.bookings.length}):
                                    </Typography>
                                    <List dense disablePadding>
                                        {group.bookings.map((b) => (
                                            <ListItem
                                                key={b.id}
                                                disableGutters
                                                sx={{ 
                                                    pl: 1, 
                                                    py: 0.5, 
                                                    mb: 0.5, 
                                                    bgcolor: "grey.100", 
                                                    borderRadius: 0.5, 
                                                    // FIX: Used theme colors instead of hardcoded hex values where possible.
                                                    borderLeft: `3px solid ${getStatusColor(b.status) === 'success' ? '#4CAF50' : getStatusColor(b.status) === 'warning' ? '#FFC107' : '#F44336'}`, 
                                                }}
                                            >
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", justifyContent: 'space-between' }}>
                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                        <LocationOnIcon fontSize="small" color="action" />
                                                        <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
                                                            {b.location}
                                                        </Typography>
                                                    </Box>
                                                    <Chip
                                                        label={b.status}
                                                        color={getStatusColor(b.status)}
                                                        size="small"
                                                        sx={{ height: '20px', fontSize: '0.7rem' }}
                                                    />
                                                </Box>
                                            </ListItem>
                                        ))}
                                    </List>
                                </Grid>

                                {/* -------------------- STATUS & ACTIONS (RIGHT COLUMN) -------------------- */}
                                <Grid item xs={12} md={4} sx={{ borderLeft: { md: '1px solid #eee' }, pl: { md: 3 } }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', gap: 2 }}>
                                        
                                        {/* Status Display (Desktop Only) */}
                                        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                                            <Typography variant="overline" color="text.secondary">
                                                Overall Status
                                            </Typography>
                                            <Chip
                                                icon={getStatusIcon(group.status)}
                                                label={group.status}
                                                color={statusColor}
                                                sx={{ 
                                                    width: '100%', 
                                                    height: '36px', 
                                                    fontSize: '1rem', 
                                                    fontWeight: 600,
                                                    mt: 0.5
                                                }}
                                            />
                                        </Box>

                                        {/* Rejection Reason - Now only shown if there is a reason recorded */}
                                        {group.rejectionReason && (
                                            <Alert severity="error" sx={{ mt: 1, p: 1 }}>
                                                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                                    Reason Found:
                                                </Typography>
                                                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                                    {group.rejectionReason}
                                                </Typography>
                                            </Alert>
                                        )}
                                    </Box>
                                </Grid>
                            </Grid>
                        </ListItem>
                    );
                })}
            </List>
        </Box>
    );
}