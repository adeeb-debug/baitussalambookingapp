import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
import { FilterList } from "@mui/icons-material";
import { doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

import { STATUSES } from "../utils/statuses";
import { groupBookings } from "../utils/groupBookings";
import { sendUserConfirmation } from "../utils/bookingService"; // Import the new service
import PendingGroupRow from "./PendingGroupRow";

export default function AdminPanel({ user, isAdmin, bookings, loading }) {

  const [filterStatus, setFilterStatus] = useState(STATUSES.PENDING);
  const [filterLocation, setFilterLocation] = useState(STATUSES.ALL);

  const [individualActionLoadingId, setIndividualActionLoadingId] = useState(null);
  const [groupActionLoadingId, setGroupActionLoadingId] = useState(null);

  const uniqueLocations = useMemo(() => {
    const locations = new Set(bookings.map((b) => b.location).filter(Boolean));
    return [STATUSES.ALL, ...Array.from(locations).sort()];
  }, [bookings]);

  const groupedBookings = useMemo(() => {
    // Logic: If filter is "Pending", only show bookings that haven't been notified yet
    // This keeps the "Pending" queue clean.
    const statusFiltered = bookings.filter((b) => {
      const matchesStatus = filterStatus === STATUSES.ALL || b.status === filterStatus;
      
      // If looking at Pending queue, hide ones already notified
      if (filterStatus === STATUSES.PENDING) {
        return matchesStatus && !b.userNotified;
      }
      return matchesStatus;
    });

    return groupBookings(statusFiltered, filterLocation);
  }, [bookings, filterStatus, filterLocation]);

  // ---------------- EMAIL ACTION ----------------
  const handleSendEmail = async (group) => {
    if (!window.confirm(`Send final decision email to ${group.requestedBy}?`)) return;

    setGroupActionLoadingId(group.groupId);
    try {
      await sendUserConfirmation(db, group);
      alert("Success: User has been notified.");
    } catch (err) {
      console.error(err);
      alert("Failed to send email/update records.");
    } finally {
      setGroupActionLoadingId(null);
    }
  };

  // ---------------- GROUP ACTION ----------------
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

  // ---------------- INDIVIDUAL ACTION ----------------
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

  // ---------------- GUARDS ----------------
  if (!user || !isAdmin) {
    return <Alert severity="error">Admin Panel access denied.</Alert>;
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const queueTitle = filterStatus === STATUSES.ALL ? "All Bookings" : `${filterStatus} Bookings`;

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        <FilterList sx={{ mr: 1 }} />
        {queueTitle}
        <Typography component="span" variant="h6" sx={{ ml: 2 }}>
          ({groupedBookings.length} Events)
        </Typography>
      </Typography>

      {/* FILTERS */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                {Object.values(STATUSES).map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Location</InputLabel>
              <Select
                value={filterLocation}
                label="Location"
                onChange={(e) => setFilterLocation(e.target.value)}
              >
                {uniqueLocations.map((loc) => (
                  <MenuItem key={loc} value={loc}>{loc}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* TABLE */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Event</TableCell>
              <TableCell>Date / Time</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell align="center">People / Cars</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {groupedBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Alert severity="info">No bookings found</Alert>
                </TableCell>
              </TableRow>
            ) : (
              groupedBookings.map((group) => (
                <PendingGroupRow
                  key={group.groupId}
                  group={group}
                  handleGroupAction={handleGroupAction}
                  handleIndividualAction={handleIndividualAction}
                  handleSendEmail={handleSendEmail} // Pass the new handler here
                  individualActionLoadingId={individualActionLoadingId}
                  groupActionLoadingId={groupActionLoadingId}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}