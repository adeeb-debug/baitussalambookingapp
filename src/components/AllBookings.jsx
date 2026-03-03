// src/components/AllBookings.js
import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom"; // Add this hook
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
  TextField,
  InputAdornment,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { FilterList, Search, RestartAlt } from "@mui/icons-material";
import { doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { STATUSES } from "../utils/statuses";
import { groupBookings } from "../utils/groupBookings";
import { sendUserConfirmation } from "../utils/bookingService";
import PendingGroupRow from "./PendingGroupRow";
import dayjs from "dayjs";

export default function AllBookings({ bookings = [], loading, user }) {
  // --- Filter SECTION STATES ---
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState(STATUSES.ALL);
  const [filterLocation, setFilterLocation] = useState(STATUSES.ALL);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // --- DELETE DIALOG STATES ---
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);

  // --- LOADING STATES ---
  const [individualActionLoadingId, setIndividualActionLoadingId] =
    useState(null);
  const [groupActionLoadingId, setGroupActionLoadingId] = useState(null);

  // --Approver's Note--
  const [noteModal, setNoteModal] = useState({
    open: false,
    action: "", // "Approved" or "Rejected"
    targetType: "", // "group" or "individual"
    data: null, // Stores the group object or bookingId
    note: "",
  });


  const handleConfirmDecision = async () => {
    const { action, targetType, data, note } = noteModal;

    if (targetType === "group") {
      await handleGroupAction(data, action, note); // Pass note to your batch function
    } else {
      await handleIndividualAction(data, action, note); // Pass note to individual function
    }

    setNoteModal({ ...noteModal, open: false, note: "" }); // Reset
  };

  // 2. Capture the ID from the URL on load
  useEffect(() => {
    const idFromUrl = searchParams.get("id");
    if (idFromUrl) {
      setSearchQuery(idFromUrl);
      // Optional: Set status to ALL to make sure it's found even if not pending
      setFilterStatus(STATUSES.ALL);
    }
  }, [searchParams]);

  // --- DELETE BOOKING LOGIC ---
  const confirmDelete = (group) => {
    setGroupToDelete(group);
    setDeleteDialogOpen(true);
  };

  const handleExecuteDelete = async () => {
    if (!groupToDelete) return;

    setDeleteDialogOpen(false);
    setIndividualActionLoadingId(groupToDelete.groupId);

    try {
      const batch = writeBatch(db);
      groupToDelete.bookings.forEach((booking) => {
        const docRef = doc(db, "bookings", booking.id);
        batch.delete(docRef);
      });
      await batch.commit();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Delete failed. Check console.");
    } finally {
      setIndividualActionLoadingId(null);
      setGroupToDelete(null);
    }
  };

  // --- RESET FILTERS ---
  const resetFilters = () => {
    setFilterStatus(STATUSES.ALL);
    setFilterLocation(STATUSES.ALL);
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setSearchParams({});
  };

  // --- GRAB LOCATIONS TO BE USED IN FILTER LOGIC ---
  const uniqueLocations = useMemo(() => {
    const locations = new Set(bookings.map((b) => b.location).filter(Boolean));
    return [STATUSES.ALL, ...Array.from(locations).sort()];
  }, [bookings]);

  // --- FILTER SECTION LOGIC ---
  const filteredAndGroupedBookings = useMemo(() => {
    let result = bookings.filter((b) => {
      const matchesStatus =
        filterStatus === STATUSES.ALL || b.status === filterStatus;
      if (filterStatus === STATUSES.PENDING && b.userNotified) return false;
      if (!matchesStatus) return false;

      const search = searchQuery.toLowerCase();
      const matchesSearch =
        b.bookingId.toLowerCase().includes(search) ||
        b.eventName?.toLowerCase().includes(search) ||
        b.requestedByName?.toLowerCase().includes(search) ||
        b.requestedByEmail?.toLowerCase().includes(search);
      if (!matchesSearch) return false;

      const bookingDateObj = dayjs(b.date);
      if (bookingDateObj.isValid()) {
        if (startDate) {
          // Start of the selected day (00:00:00)
          const startBound = dayjs(startDate).startOf("day");
          if (bookingDateObj.isBefore(startBound)) return false;
        }

        if (endDate) {
          // End of the selected day (23:59:59)
          const endBound = dayjs(endDate).endOf("day");
          if (bookingDateObj.isAfter(endBound)) return false;
        }
      }
      return true;
    });

    return groupBookings(result, filterLocation);
  }, [bookings, filterStatus, filterLocation, searchQuery, startDate, endDate]);

  // --- ADMIN USER DIALOG FOR SENDING EMAIL ---
  const handleSendEmail = async (group) => {
    if (
      !window.confirm(`Send final decision email to ${group.requestedByEmail}?`)
    )
      return;
    setGroupActionLoadingId(group.groupId);
    try {
      // Pass the 'user' object as the 3rd argument here
      await sendUserConfirmation(
        db,
        {
          ...group,
          eventName: group.eventName,
          requestedByEmail: group.requestedByEmail,
        },
        user,
      );

      alert("Success: User has been notified.");
    } catch (err) {
      console.error(err);
      alert("Failed to send email.");
    } finally {
      setGroupActionLoadingId(null);
    }
  };

  //--APPROVE/REJECT A COMPLETE BOOKING--
  const handleGroupAction = async (group, action, note) => {
    const pendingBookings = group.bookings.filter(
      (b) => b.status === "Pending",
    );
    if (pendingBookings.length === 0) return;

    setGroupActionLoadingId(group.groupId);
    try {
      const batch = writeBatch(db);
      pendingBookings.forEach((booking) => {
        const ref = doc(db, "bookings", booking.id);
        batch.update(ref, {
          status: action, // Use the 'user' prop directly here
          approverNote: note || "",
          actionByEmail: user?.email,
          actionByName: user?.displayName || user?.email,
          actionAt: new Date().toISOString(),
        });
      });
      await batch.commit();
    } catch (err) {
      console.error(err);
      alert("Failed to update group");
    } finally {
      setGroupActionLoadingId(null);
    }
  };

  //--APPROVE/REJECT ONE SINGLE LOCATION--
  const handleIndividualAction = async (bookingId, action, note) => {
    setIndividualActionLoadingId(bookingId);
    try {
      const ref = doc(db, "bookings", bookingId);
      await updateDoc(ref, {
        status: action,
        approverNote: note || "", // ✅ ADDED: Saves the specific note for this room
        actionByEmail: user?.email,
        actionByName: user?.displayName || user?.email,
        actionAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(err);
      alert("Update failed");
    } finally {
      setIndividualActionLoadingId(null);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 10 }}>
        <CircularProgress />
      </Box>
    );

    const openNoteModal = (targetType, data, action) => {
  setNoteModal({
    open: true,
    action: action,
    targetType: targetType,
    data: data,
    note: "" // Reset note for each new action
  });
};
  return (
    <Box sx={{ pb: 5 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 3 }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            letterSpacing: "-0.5px",
          }}
        >
          <FilterList sx={{ mr: 1.5, color: "primary.main" }} />
          Bookings List
          <Typography
            component="span"
            variant="h6"
            sx={{ ml: 2, color: "text.secondary", fontWeight: 400 }}
          >
            ({filteredAndGroupedBookings.length} Events)
          </Typography>
        </Typography>
      </Stack>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                {Object.values(STATUSES).map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Location</InputLabel>
              <Select
                value={filterLocation}
                label="Location"
                onChange={(e) => setFilterLocation(e.target.value)}
              >
                {uniqueLocations.map((loc) => (
                  <MenuItem key={loc} value={loc}>
                    {loc}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="From"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="To"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={1}>
            <Button
              startIcon={<RestartAlt />}
              onClick={resetFilters}
              variant="outlined"
              size="small"
              fullWidth
              sx={{ borderRadius: "8px", height: "40px" }}
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}
      >
        <Table size="small">
          <TableHead sx={{ bgcolor: "grey.50" }}>
            <TableRow>
              <TableCell />
              <TableCell sx={{ fontWeight: 700 }}>Booking ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Event</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Date / Time</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Organiser</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>
                Details
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>
                Status
              </TableCell>
              {/* Ensure this displays if isAdmin is true */}
              <TableCell align="center" sx={{ fontWeight: 700 }}>
                Actions
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>
                Actioned By
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndGroupedBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                  <Alert
                    severity="info"
                    variant="outlined"
                    sx={{ display: "inline-flex" }}
                  >
                    No bookings found matching these criteria.
                  </Alert>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndGroupedBookings.map((group) => (
                <PendingGroupRow
                  key={group.groupId}
                  group={group}
                  handleGroupAction={(g, a) => openNoteModal("group", g, a)}
                  handleIndividualAction={(id, a) => openNoteModal("individual", id, a)}
                  handleDeleteBooking={confirmDelete}
                  handleSendEmail={handleSendEmail}
                  individualActionLoadingId={individualActionLoadingId}
                  groupActionLoadingId={groupActionLoadingId}
                  isAdmin={true} // Hardcoded to true because only admins can access this route anyway
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle sx={{ fontWeight: 700, color: "error.main" }}>
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete{" "}
            <strong>{groupToDelete?.eventName}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will remove all {groupToDelete?.bookings.length} location
            records and cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleExecuteDelete}
            variant="contained"
            color="error"
          >
            Delete Everything
          </Button>
        </DialogActions>
      </Dialog>
      {/* --- APPROVER'S NOTE DIALOG --- */}
      <Dialog
        open={noteModal.open}
        onClose={() => setNoteModal({ ...noteModal, open: false })}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Approver's Note
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            Add an optional note to the organiser.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            placeholder="Please add your note here..."
            value={noteModal.note}
            onChange={(e) =>
              setNoteModal({ ...noteModal, note: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: "grey.50" }}>
          <Button
            onClick={() => setNoteModal({ ...noteModal, open: false })}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDecision}
            variant="contained"
            color={noteModal.action === "Approved" ? "success" : "error"}
          >
            Confirm {noteModal.action}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
