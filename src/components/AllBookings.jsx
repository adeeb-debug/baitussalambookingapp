// src/components/AllBookings.js
import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from "@mui/material";
import {
  FilterList,
  Search,
  RestartAlt,
  EventNote,
  HourglassEmpty,
  CheckCircleOutline,
  CancelOutlined,
} from "@mui/icons-material";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { STATUSES } from "../utils/statuses";
import { groupBookings } from "../utils/groupBookings";
import { sendFinalConfirmation } from "../utils/bookingService";
import PendingGroupRow from "./PendingGroupRow";
import StatCard from "./StatCard";
import dayjs from "dayjs";

export default function AllBookings({ bookings = [], loading, user, role }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState(STATUSES.ALL);
  const [filterLocation, setFilterLocation] = useState(STATUSES.ALL);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  // --- DELETE DIALOG STATES ---
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);

  // --- LOADING STATES ---
  const [individualActionLoadingId, setIndividualActionLoadingId] = useState(null);
  const [groupActionLoadingId, setGroupActionLoadingId] = useState(null);

  // --- ACTION MODAL ---
  const [noteModal, setNoteModal] = useState({
    open: false,
    action: "",
    data: null, // The booking/group object
    note: "",
  });

  useEffect(() => {
    const idFromUrl = searchParams.get("id");
    if (idFromUrl) {
      setSearchQuery(idFromUrl);
      setFilterStatus(STATUSES.ALL);
    }
  }, [searchParams]);

  const resetFilters = () => {
    setFilterStatus(STATUSES.ALL);
    setFilterLocation(STATUSES.ALL);
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setSearchParams({});
  };

  const uniqueLocations = useMemo(() => {
    const locations = new Set(bookings.flatMap((b) => b.locations || []));
    return [STATUSES.ALL, ...Array.from(locations).sort()];
  }, [bookings]);

  const filteredAndGroupedBookings = useMemo(() => {
    let result = bookings.filter((b) => {
      const matchesStatus = filterStatus === STATUSES.ALL || b.status === filterStatus;
      if (!matchesStatus) return false;

      const search = searchQuery.toLowerCase();
      const matchesSearch =
        (b.bookingId && b.bookingId.toLowerCase().includes(search)) ||
        b.eventName?.toLowerCase().includes(search) ||
        b.fullName?.toLowerCase().includes(search) ||
        b.requestedByName?.toLowerCase().includes(search);
      
      if (!matchesSearch) return false;

      // Location Filter (checking if the array contains the selected location)
      if (filterLocation !== STATUSES.ALL && !b.locations?.includes(filterLocation)) return false;

      const bookingDateObj = dayjs(b.date);
      if (bookingDateObj.isValid()) {
        if (startDate && bookingDateObj.isBefore(dayjs(startDate).startOf("day"))) return false;
        if (endDate && bookingDateObj.isAfter(dayjs(endDate).endOf("day"))) return false;
      }
      return true;
    });

    // We still use groupBookings to keep the structure PendingGroupRow expects
    return groupBookings(result, filterLocation);
  }, [bookings, filterStatus, filterLocation, searchQuery, startDate, endDate]);

  const handleConfirmDecision = async () => {
    const { action, data, note } = noteModal;
    await handleAction(data, action, note);
    setNoteModal({ ...noteModal, open: false, note: "" });
  };

 const handleAction = async (group, action, note) => {
  // Use bookingId for the loading spinner as it's the human reference
  setGroupActionLoadingId(group.bookingId); 
  
  try {
    // CRITICAL: We must use the full Firestore Document ID 
    // This is the "2026-03-28_2026-0018" string
    const documentId = group.bookingId; 
    console.log(documentId)
    const ref = doc(db, "bookings", documentId);
    
    const updateData = {
      status: action,
      approverNote: note || "",
      actionByEmail: user?.email || "System",
      actionByName: user?.displayName || user?.email || "Admin",
      actionAt: new Date().toISOString(),
      userNotified: true,
    };

    await updateDoc(ref, updateData);

    // Pass the merged data to the email service
    await sendFinalConfirmation(db, { ...group, ...updateData }, user);

    setSnackbar({
      open: true,
      message: `Successfully ${action} and organiser notified.`,
      severity: "success",
    });
  } catch (err) {
    console.error("Update error:", err);
    setSnackbar({ open: true, message: "Action failed", severity: "error" });
  } finally {
    setGroupActionLoadingId(null);
  }
};
  const handleExecuteDelete = async () => {
    if (!groupToDelete) return;
    setDeleteDialogOpen(false);
    setIndividualActionLoadingId(groupToDelete.groupId);

    try {
      await deleteDoc(doc(db, "bookings", groupToDelete.groupId));
      setSnackbar({ open: true, message: "Booking deleted successfully", severity: "success" });
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Delete failed", severity: "error" });
    } finally {
      setIndividualActionLoadingId(null);
      setGroupToDelete(null);
    }
  };

  if (loading) return (
    <Box sx={{ display: "flex", justifyContent: "center", p: 10 }}>
      <CircularProgress />
    </Box>
  );

  const statCounts = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "Pending").length,
    approved: bookings.filter((b) => b.status === "Approved").length,
    rejected: bookings.filter((b) => b.status === "Rejected" || b.status === "Cancelled").length,
  };

return (
    <Box sx={{ pb: 5 }}>
      {/* STAT CARDS - MUI v6 Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={<EventNote />} label="Total Bookings" value={statCounts.total} color="primary" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={<HourglassEmpty />} label="Pending" value={statCounts.pending} color="warning" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={<CheckCircleOutline />} label="Approved" value={statCounts.approved} color="success" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon={<CancelOutlined />} label="Rejected" value={statCounts.rejected} color="error" />
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: "flex", alignItems: "center" }}>
        <FilterList sx={{ mr: 1, color: "primary.main" }} fontSize="small" />
        Bookings List
        <Typography component="span" variant="body2" sx={{ ml: 1.5, color: "text.secondary", fontWeight: 500 }}>
          ({filteredAndGroupedBookings.length} Events)
        </Typography>
      </Typography>

      {/* --- FILTERS PAPER - MUI v6 Grid --- */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth size="small" placeholder="Search ID, Event, or Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{ startAdornment: (<InputAdornment position="start"><Search fontSize="small" /></InputAdornment>) }} />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <FormControl fullWidth size="small"><InputLabel>Status</InputLabel>
              <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
                {Object.values(STATUSES).map((s) => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <FormControl fullWidth size="small"><InputLabel>Location</InputLabel>
              <Select value={filterLocation} label="Location" onChange={(e) => setFilterLocation(e.target.value)}>
                {uniqueLocations.map((loc) => (<MenuItem key={loc} value={loc}>{loc}</MenuItem>))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <TextField fullWidth size="small" type="date" label="From" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <TextField fullWidth size="small" type="date" label="To" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid size={{ xs: 12, md: 1 }}>
            <Button startIcon={<RestartAlt />} onClick={resetFilters} variant="outlined" size="small" fullWidth sx={{ height: "40px" }}>Reset</Button>
          </Grid>
        </Grid>
      </Paper>

      {/* --- TABLE --- */}
      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "grey.50" }}>
            <TableRow>
              <TableCell width={50} />
              <TableCell sx={{ fontWeight: 700 }}>Booking ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Event</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Date / Time</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Organiser</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Actioned By</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndGroupedBookings.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 8 }}><Alert severity="info" variant="outlined">No bookings found.</Alert></TableCell></TableRow>
            ) : (
              filteredAndGroupedBookings.map((group) => (
                <PendingGroupRow
                  key={group.groupId}
                  group={group}
                  handleGroupAction={(g, a) => setNoteModal({ open: true, action: a, data: g, note: "" })}
                  handleDeleteBooking={(g) => { setGroupToDelete(g); setDeleteDialogOpen(true); }}
                  handleSendEmail={(g) => sendFinalConfirmation(db, g, user)}
                  individualActionLoadingId={individualActionLoadingId}
                  groupActionLoadingId={groupActionLoadingId}
                  role={role}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* --- MODALS & SNACKBARS --- */}
      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700, color: "error.main" }}>Confirm Deletion</DialogTitle>
        <DialogContent><Typography>Are you sure you want to delete <strong>{groupToDelete?.eventName}</strong>?</Typography></DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleExecuteDelete} variant="contained" color="error">Delete Everything</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={noteModal.open} onClose={() => setNoteModal({ ...noteModal, open: false })} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Add Approver Note</DialogTitle>
        <DialogContent>
          <TextField fullWidth multiline rows={3} sx={{ mt: 1 }} placeholder="Optional message to organiser..." value={noteModal.note} onChange={(e) => setNoteModal({ ...noteModal, note: e.target.value })} />
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: "grey.50" }}>
          <Button onClick={() => setNoteModal({ ...noteModal, open: false })}>Cancel</Button>
          <Button onClick={handleConfirmDecision} variant="contained" color={noteModal.action === "Approved" ? "success" : "error"}>Confirm {noteModal.action}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}