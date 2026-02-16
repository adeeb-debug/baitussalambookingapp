import React, { useState, useMemo } from "react";
import {
  Box, Typography, Paper, Alert, CircularProgress, FormControl,
  InputLabel, Select, MenuItem, Grid, TableContainer, Table,
  TableHead, TableBody, TableRow, TableCell, TextField, InputAdornment, Button, Stack
} from "@mui/material";
import { FilterList, Search, RestartAlt } from "@mui/icons-material";
import { doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

import { STATUSES } from "../utils/statuses";
import { groupBookings } from "../utils/groupBookings";
import { sendUserConfirmation } from "../utils/bookingService"; 
import PendingGroupRow from "./PendingGroupRow";

// Helper to convert "26-01-2026" to a JS Date Object
const parseFirebaseDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return null;
  const [day, month, year] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export default function AllBookings({ isAdmin, bookings, loading }) {
  // --- FILTER STATES ---
  const [filterStatus, setFilterStatus] = useState(STATUSES.ALL);
  const [filterLocation, setFilterLocation] = useState(STATUSES.ALL);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // --- LOADING STATES ---
  const [individualActionLoadingId, setIndividualActionLoadingId] = useState(null);
  const [groupActionLoadingId, setGroupActionLoadingId] = useState(null);

  // --- HELPERS ---
  const resetFilters = () => {
    setFilterStatus(STATUSES.ALL);
    setFilterLocation(STATUSES.ALL);
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
  };

  const uniqueLocations = useMemo(() => {
    const locations = new Set(bookings.map((b) => b.location).filter(Boolean));
    return [STATUSES.ALL, ...Array.from(locations).sort()];
  }, [bookings]);

  // --- FILTER & GROUP LOGIC ---
  const filteredAndGroupedBookings = useMemo(() => {
    let result = bookings.filter((b) => {
      // 1. Status Filter
      const matchesStatus = filterStatus === STATUSES.ALL || b.status === filterStatus;
      if (filterStatus === STATUSES.PENDING && b.userNotified) return false;
      if (!matchesStatus) return false;

      // 2. Search Filter (Case Insensitive)
      const search = searchQuery.toLowerCase();
      const matchesSearch = 
        b.eventName?.toLowerCase().includes(search) ||
        b.requestedByName?.toLowerCase().includes(search) ||
        b.requestedByEmail?.toLowerCase().includes(search);
      if (!matchesSearch) return false;

      // 3. Date Range Filter (Handling DD-MM-YYYY)
      const bookingDateObj = parseFirebaseDate(b.date);
      
      if (bookingDateObj) {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0); // Start of day
          if (bookingDateObj < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999); // End of day
          if (bookingDateObj > end) return false;
        }
      }

      return true;
    });

    return groupBookings(result, filterLocation);
  }, [bookings, filterStatus, filterLocation, searchQuery, startDate, endDate]);

  // --- EMAIL ACTION ---
  const handleSendEmail = async (group) => {
    if (!window.confirm(`Send final decision email to ${group.requestedByEmail}?`)) return;
    setGroupActionLoadingId(group.groupId);
    try {
      await sendUserConfirmation(db, {
        ...group,
        eventName: group.eventName,
        requestedByEmail: group.requestedByEmail,
      });
      alert("Success: User has been notified.");
    } catch (err) {
      console.error(err);
      alert("Failed to send email.");
    } finally {
      setGroupActionLoadingId(null);
    }
  };

  // --- GROUP ACTION ---
  const handleGroupAction = async (group, action) => {
    const pendingBookings = group.bookings.filter((b) => b.status === "Pending");
    if (pendingBookings.length === 0) return;
    if (!window.confirm(`Change ${pendingBookings.length} bookings to ${action}?`)) return;

    setGroupActionLoadingId(group.groupId);
    try {
      const batch = writeBatch(db);
      pendingBookings.forEach((booking) => {
        const ref = doc(db, "bookings", booking.id);
        batch.update(ref, { status: action });
      });
      await batch.commit();
    } catch (err) {
      console.error(err);
      alert("Failed to update group");
    } finally {
      setGroupActionLoadingId(null);
    }
  };

  // --- INDIVIDUAL ACTION ---
  const handleIndividualAction = async (bookingId, action) => {
    if (!window.confirm(`Are you sure you want to ${action}?`)) return;
    setIndividualActionLoadingId(bookingId);
    try {
      const ref = doc(db, "bookings", bookingId);
      await updateDoc(ref, { status: action });
    } catch (err) {
      console.error(err);
      alert("Update failed");
    } finally {
      setIndividualActionLoadingId(null);
    }
  };

  if (loading) return (
    <Box sx={{ display: "flex", justifyContent: "center", p: 10 }}><CircularProgress /></Box>
  );

  return (
    <Box sx={{ pb: 5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, display: "flex", alignItems: "center", letterSpacing: '-0.5px' }}>
          <FilterList sx={{ mr: 1.5, color: "primary.main" }} />
          Admin Queue
          <Typography component="span" variant="h6" sx={{ ml: 2, color: "text.secondary", fontWeight: 400 }}>
            ({filteredAndGroupedBookings.length} Events)
          </Typography>
        </Typography>
      </Stack>

      {/* FILTER PANEL */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search event, organiser, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
                {Object.values(STATUSES).map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Location</InputLabel>
              <Select value={filterLocation} label="Location" onChange={(e) => setFilterLocation(e.target.value)}>
                {uniqueLocations.map((loc) => <MenuItem key={loc} value={loc}>{loc}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth size="small" type="date" label="From"
              value={startDate} onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth size="small" type="date" label="To"
              value={endDate} onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
                  <Button 
          startIcon={<RestartAlt />} 
          onClick={resetFilters} 
          variant="outlined" 
          size="small"
          sx={{ borderRadius: '8px' }}
        >
          Clear Filters
        </Button>
        </Grid>
      </Paper>

      {/* DATA TABLE */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "grey.50" }}>
            <TableRow>
              <TableCell />
              <TableCell sx={{ fontWeight: 700 }}>Event</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Date / Time</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Organiser</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Details</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
              {isAdmin && <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndGroupedBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                  <Alert severity="info" variant="outlined" sx={{ display: 'inline-flex' }}>
                    No bookings found matching these criteria.
                  </Alert>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndGroupedBookings.map((group) => (
                <PendingGroupRow
                  key={group.groupId}
                  group={group}
                  handleGroupAction={handleGroupAction}
                  handleIndividualAction={handleIndividualAction}
                  handleSendEmail={handleSendEmail}
                  individualActionLoadingId={individualActionLoadingId}
                  groupActionLoadingId={groupActionLoadingId}
                  isAdmin={isAdmin}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}