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
  Chip,
  OutlinedInput,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
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
import { LOCATIONS, JAMAAT_OPTIONS } from "../utils/constants";
import { overlaps } from "../utils/timeUtils";
import { groupBookings } from "../utils/groupBookings";
import { sendFinalConfirmation } from "../utils/bookingService";
import PendingGroupRow from "./PendingGroupRow";
import StatCard from "./StatCard";
import dayjs from "dayjs";

const AUXILIARIES = ["Khuddam", "Atfal", "Ansar", "Lajna", "Nasirat"];

/** Builds the single "jamaat" text the rest of the app reads (same as BookingForm) */
const buildJamaatLabel = (f) => {
  if (f.organisationType === "auxiliary") {
    return `${(f.auxiliaries || []).join(", ")} – ${(f.majlisNames || []).join(", ")}`;
  }
  if (f.organisationType === "jamaat") {
    return (f.jamaatNames || []).join(", ");
  }
  return "";
};

/** "28 Nov, 5 Dec, 12 Dec +3 more" */
const formatDateList = (dates, max = 4) => {
  const formatted = dates.map((d) => dayjs(d).format("D MMM"));
  return formatted.length > max
    ? `${formatted.slice(0, max).join(", ")} +${formatted.length - max} more`
    : formatted.join(", ");
};

/** Collapses one-row-per-location conflicts into one row per clashing booking */
const groupConflicts = (list) => {
  const map = {};
  list.forEach((c) => {
    const key = `${c.bookingId}|${c.dates.join(",")}`;
    if (!map[key]) {
      map[key] = {
        key,
        bookingId: c.bookingId,
        eventName: c.eventName,
        fromTime: c.fromTime,
        toTime: c.toTime,
        dates: c.dates,
        locations: [],
      };
    }
    if (!map[key].locations.includes(c.location)) {
      map[key].locations.push(c.location);
    }
  });
  return Object.values(map);
};

/** Multi-select dropdown that shows the chosen values as chips */
function MultiSelectField({ label, options, value, onChange }) {
  return (
    <FormControl fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        value={value}
        onChange={(e) =>
          onChange(
            typeof e.target.value === "string"
              ? e.target.value.split(",")
              : e.target.value,
          )
        }
        input={<OutlinedInput label={label} />}
        renderValue={(selected) => (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {selected.map((v) => (
              <Chip key={v} label={v} size="small" />
            ))}
          </Box>
        )}
      >
        {options.map((name) => (
          <MenuItem key={name} value={name}>
            {name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

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
  const [individualActionLoadingId, setIndividualActionLoadingId] =
    useState(null);
  const [groupActionLoadingId, setGroupActionLoadingId] = useState(null);

  // --- ACTION MODAL ---
  const [noteModal, setNoteModal] = useState({
    open: false,
    action: "",
    data: null, // The booking/group object
    note: "",
  });

  // --- EDIT MODAL ---
  const [editModal, setEditModal] = useState({
    open: false,
    data: null, // original group
    draft: null, // editable copy of the booking fields
  });
  const [editAvailableLocations, setEditAvailableLocations] =
    useState(LOCATIONS);
  const [editConflicts, setEditConflicts] = useState([]);
  const [newEditDate, setNewEditDate] = useState("");

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
      const matchesStatus =
        filterStatus === STATUSES.ALL || b.status === filterStatus;
      if (!matchesStatus) return false;

      const search = searchQuery.toLowerCase();
      const matchesSearch =
        (b.bookingId && b.bookingId.toLowerCase().includes(search)) ||
        b.eventName?.toLowerCase().includes(search) ||
        b.fullName?.toLowerCase().includes(search) ||
        b.requestedByName?.toLowerCase().includes(search) ||
        b.jamaat?.toLowerCase().includes(search);

      if (!matchesSearch) return false;

      // Location Filter (checking if the array contains the selected location)
      if (
        filterLocation !== STATUSES.ALL &&
        !b.locations?.includes(filterLocation)
      )
        return false;

      const bookingDateObj = dayjs(b.date);
      if (bookingDateObj.isValid()) {
        if (
          startDate &&
          bookingDateObj.isBefore(dayjs(startDate).startOf("day"))
        )
          return false;
        if (endDate && bookingDateObj.isAfter(dayjs(endDate).endOf("day")))
          return false;
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
      console.log(documentId);
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
      setSnackbar({
        open: true,
        message: "Booking deleted successfully",
        severity: "success",
      });
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Delete failed", severity: "error" });
    } finally {
      setIndividualActionLoadingId(null);
      setGroupToDelete(null);
    }
  };

  // --- EDIT HANDLERS ---
  const handleOpenEdit = (group) => {
    // Read the raw booking so fields the grouping step may not pass through are available
    const raw = bookings.find((b) => b.bookingId === group.bookingId) || group;

    const dates = (raw.allDates?.length ? raw.allDates : [raw.date]).filter(
      Boolean,
    );

    // Old bookings only have a single "jamaat" name, so treat them as a Jamaat booking
    const organisationType =
      raw.organisationType || (raw.jamaat ? "jamaat" : "");
    const jamaatNames =
      raw.jamaatNames || (!raw.organisationType && raw.jamaat ? [raw.jamaat] : []);

    setEditModal({
      open: true,
      data: group,
      draft: {
        eventName: raw.eventName || "",
        fullName: raw.fullName || "",
        phoneNumber: raw.phoneNumber || "",
        organisationType,
        auxiliaries: raw.auxiliaries || [],
        majlisNames: raw.majlisNames || [],
        jamaatNames,
        expectedPeople: raw.expectedPeople ?? "",
        expectedCars: raw.expectedCars ?? "",
        allDates: [...dates].sort(),
        isSeries: dates.length > 1 || raw.isRecurring === true,
        fromTime: raw.fromTime || "",
        toTime: raw.toTime || "",
        locations: raw.locations || [],
      },
    });
    setNewEditDate("");
  };

  // Merge a patch into the draft
  const setDraft = (patch) =>
    setEditModal((prev) => ({
      ...prev,
      draft: { ...prev.draft, ...patch },
    }));

  const updateDraftDates = (dates) =>
    setDraft({ allDates: [...new Set(dates)].sort() });

  const addEditDate = () => {
    if (!newEditDate) return;
    updateDraftDates([...(editModal.draft?.allDates || []), newEditDate]);
    setNewEditDate("");
  };

  const removeEditDate = (d) =>
    updateDraftDates((editModal.draft?.allDates || []).filter((x) => x !== d));

  // Switching Auxiliary <-> Jamaat clears the other side's selections
  const handleOrganisationType = (_, value) => {
    if (!value || value === editModal.draft?.organisationType) return;
    setDraft({
      organisationType: value,
      auxiliaries: [],
      majlisNames: [],
      jamaatNames: [],
    });
  };

  const closeEditModal = () => {
    setEditModal({ ...editModal, open: false });
    setEditConflicts([]);
    setNewEditDate("");
  };

  // --- DYNAMIC LOCATION/TIME AVAILABILITY (mirrors BookingForm) ---
  useEffect(() => {
    if (!editModal.open || !editModal.draft) return;
    const { allDates = [], fromTime, toTime } = editModal.draft;
    if (allDates.length === 0 || !fromTime || !toTime) {
      setEditAvailableLocations(LOCATIONS);
      setEditConflicts([]);
      return;
    }

    const currentBookingId = editModal.data?.bookingId;
    const conflicts = []; // { location, eventName, dates: [] }

    bookings.forEach((b) => {
      if (b.bookingId === currentBookingId) return; // don't conflict with itself
      if (b.status === "Cancelled" || b.status === "Rejected") return;

      // A. Date overlap across every date in the series
      const existingDates = b.allDates || [b.date];
      const clashingDates = allDates.filter((d) => existingDates.includes(d));
      if (clashingDates.length === 0) return;

      // B. Time overlap
      const REFERENCE_DATE = "2026-01-01";
      const isTimeClash = overlaps(
        dayjs(`${REFERENCE_DATE}T${fromTime}`).toDate(),
        dayjs(`${REFERENCE_DATE}T${toTime}`).toDate(),
        dayjs(`${REFERENCE_DATE}T${b.fromTime}`).toDate(),
        dayjs(`${REFERENCE_DATE}T${b.toTime}`).toDate(),
      );

      // C. Record details
      if (isTimeClash) {
        const locs = Array.isArray(b.locations) ? b.locations : [b.location];
        locs.forEach((locName) => {
          conflicts.push({
            location: locName,
            bookingId: b.bookingId || b.id,
            eventName: b.eventName,
            fromTime: b.fromTime,
            toTime: b.toTime,
            dates: clashingDates,
          });
        });
      }
    });

    const blockedNames = conflicts.map((c) => c.location);
    setEditAvailableLocations(
      LOCATIONS.filter((loc) => !blockedNames.includes(loc.name)),
    );
    setEditConflicts(conflicts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editModal.open,
    editModal.draft?.allDates,
    editModal.draft?.fromTime,
    editModal.draft?.toTime,
    editModal.data,
    bookings,
  ]);

  const showError = (message) =>
    setSnackbar({ open: true, message, severity: "error" });

  const handleSaveEdit = async () => {
    const { data, draft } = editModal;
    if (!data || !draft) return;

    // Basic validation
    if (!draft.eventName.trim()) return showError("Event name cannot be empty");
    if (!draft.fullName.trim()) return showError("Full name cannot be empty");
    if (
      !/^((04\d{8})|(614\d{8})|(0[2378]\d{8}))$/.test(draft.phoneNumber || "")
    )
      return showError("Enter a valid phone number");

    if (draft.organisationType === "auxiliary") {
      if (!draft.auxiliaries.length || !draft.majlisNames.length)
        return showError("Select at least one auxiliary and one majlis");
    } else if (draft.organisationType === "jamaat") {
      if (!draft.jamaatNames.length)
        return showError("Select at least one jamaat");
    } else {
      return showError("Choose Auxiliary or Jamaat");
    }

    if (!draft.expectedPeople || !draft.expectedCars)
      return showError("People and cars cannot be empty");
    if (!draft.allDates?.length || !draft.fromTime || !draft.toTime)
      return showError("Date and time cannot be empty");
    if (!draft.locations || draft.locations.length === 0)
      return showError("Select at least one location");

    // Conflict gatekeeper, same pattern as BookingForm
    const activeConflicts = editConflicts.filter((c) =>
      draft.locations.includes(c.location),
    );
    if (activeConflicts.length > 0) {
      const details = groupConflicts(activeConflicts)
        .map(
          (g) =>
            `${g.locations.join(", ")} already booked for "${g.eventName}" on ${formatDateList(g.dates)}`,
        )
        .join(" | ");
      return showError(`Conflict: ${details}`);
    }

    setGroupActionLoadingId(data.bookingId);
    try {
      const ref = doc(db, "bookings", data.bookingId);
      await updateDoc(ref, {
        eventName: draft.eventName,
        fullName: draft.fullName,
        phoneNumber: draft.phoneNumber,
        organisationType: draft.organisationType,
        auxiliaries: draft.auxiliaries,
        majlisNames: draft.majlisNames,
        jamaatNames: draft.jamaatNames,
        jamaat: buildJamaatLabel(draft),
        expectedPeople: draft.expectedPeople,
        expectedCars: draft.expectedCars,
        date: draft.allDates[0],
        allDates: draft.allDates,
        fromTime: draft.fromTime,
        toTime: draft.toTime,
        locations: draft.locations,
        lastEditedBy: user?.email || "Admin",
        lastEditedAt: new Date().toISOString(),
      });

      setSnackbar({
        open: true,
        message: "Booking updated successfully",
        severity: "success",
      });
      setEditModal({ open: false, data: null, draft: null });
      setEditConflicts([]);
      setNewEditDate("");
    } catch (err) {
      console.error("Edit error:", err);
      showError("Failed to update booking");
    } finally {
      setGroupActionLoadingId(null);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 10 }}>
        <CircularProgress />
      </Box>
    );

  const statCounts = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "Pending").length,
    approved: bookings.filter((b) => b.status === "Approved").length,
    rejected: bookings.filter(
      (b) => b.status === "Rejected" || b.status === "Cancelled",
    ).length,
  };

  const draft = editModal.draft;

  // Conflicts on locations the admin has selected (blocking) vs ones just hidden from the list
  const selectedConflictGroups = groupConflicts(
    editConflicts.filter((c) => draft?.locations?.includes(c.location)),
  );
  const hiddenConflictGroups = groupConflicts(
    editConflicts.filter((c) => !draft?.locations?.includes(c.location)),
  );

  return (
    <Box sx={{ pb: 5 }}>
      {/* STAT CARDS - MUI v6 Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<EventNote />}
            label="Total Bookings"
            value={statCounts.total}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<HourglassEmpty />}
            label="Pending"
            value={statCounts.pending}
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<CheckCircleOutline />}
            label="Approved"
            value={statCounts.approved}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<CancelOutlined />}
            label="Rejected"
            value={statCounts.rejected}
            color="error"
          />
        </Grid>
      </Grid>

      <Typography
        variant="h6"
        sx={{ fontWeight: 700, mb: 2, display: "flex", alignItems: "center" }}
      >
        <FilterList sx={{ mr: 1, color: "primary.main" }} fontSize="small" />
        Bookings List
        <Typography
          component="span"
          variant="body2"
          sx={{ ml: 1.5, color: "text.secondary", fontWeight: 500 }}
        >
          ({filteredAndGroupedBookings.length} Events)
        </Typography>
      </Typography>

      {/* --- FILTERS PAPER - MUI v6 Grid --- */}
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
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search ID, Event, Name, or Jamaat..."
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
          <Grid size={{ xs: 6, md: 2 }}>
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
          <Grid size={{ xs: 6, md: 2 }}>
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
          <Grid size={{ xs: 6, md: 2 }}>
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
          <Grid size={{ xs: 6, md: 2 }}>
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
          <Grid size={{ xs: 12, md: 1 }}>
            <Button
              startIcon={<RestartAlt />}
              onClick={resetFilters}
              variant="outlined"
              size="small"
              fullWidth
              sx={{ height: "40px" }}
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* --- TABLE --- */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}
      >
        <Table size="small">
          <TableHead sx={{ bgcolor: "grey.50" }}>
            <TableRow>
              <TableCell width={50} />
              <TableCell sx={{ fontWeight: 700 }}>Booking ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Event</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Date / Time</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Organiser</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>
                Status
              </TableCell>
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
                  <Alert severity="info" variant="outlined">
                    No bookings found.
                  </Alert>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndGroupedBookings.map((group) => (
                <PendingGroupRow
                  key={group.groupId}
                  group={group}
                  handleGroupAction={(g, a) =>
                    setNoteModal({ open: true, action: a, data: g, note: "" })
                  }
                  handleDeleteBooking={(g) => {
                    setGroupToDelete(g);
                    setDeleteDialogOpen(true);
                  }}
                  handleSendEmail={(g) => sendFinalConfirmation(db, g, user)}
                  handleEditBooking={handleOpenEdit}
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
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

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
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleExecuteDelete}
            variant="contained"
            color="error"
          >
            Delete Everything
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={noteModal.open}
        onClose={() => setNoteModal({ ...noteModal, open: false })}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Add Approver Note</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            sx={{ mt: 1 }}
            placeholder="Optional message to organiser..."
            value={noteModal.note}
            onChange={(e) =>
              setNoteModal({ ...noteModal, note: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: "grey.50" }}>
          <Button onClick={() => setNoteModal({ ...noteModal, open: false })}>
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

      {/* --- EDIT BOOKING MODAL --- */}
      <Dialog
        open={editModal.open}
        onClose={closeEditModal}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Booking</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: "16px !important",
          }}
        >
          {/* --- ORGANISER --- */}
          <Typography variant="overline" color="text.secondary">
            Organiser
          </Typography>
          <TextField
            fullWidth
            label="Full Name"
            value={draft?.fullName || ""}
            onChange={(e) => setDraft({ fullName: e.target.value })}
          />
          <TextField
            fullWidth
            label="Phone Number"
            value={draft?.phoneNumber || ""}
            onChange={(e) =>
              setDraft({ phoneNumber: e.target.value.replace(/\D/g, "") })
            }
            inputProps={{ inputMode: "numeric", maxLength: 12 }}
          />

          <Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, mb: 1, color: "text.secondary" }}
            >
              Booking on behalf of
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              color="primary"
              size="small"
              value={draft?.organisationType || ""}
              onChange={handleOrganisationType}
            >
              <ToggleButton
                value="auxiliary"
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Auxiliary
              </ToggleButton>
              <ToggleButton
                value="jamaat"
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Jamaat
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {draft?.organisationType === "auxiliary" && (
            <>
              <MultiSelectField
                label="Auxiliary"
                options={AUXILIARIES}
                value={draft.auxiliaries || []}
                onChange={(v) => setDraft({ auxiliaries: v })}
              />
              <MultiSelectField
                label="Majlis Name"
                options={JAMAAT_OPTIONS}
                value={draft.majlisNames || []}
                onChange={(v) => setDraft({ majlisNames: v })}
              />
            </>
          )}

          {draft?.organisationType === "jamaat" && (
            <MultiSelectField
              label="Jamaat Name"
              options={JAMAAT_OPTIONS}
              value={draft.jamaatNames || []}
              onChange={(v) => setDraft({ jamaatNames: v })}
            />
          )}

          <Divider />

          {/* --- EVENT --- */}
          <Typography variant="overline" color="text.secondary">
            Event
          </Typography>
          <TextField
            fullWidth
            label="Event Name"
            value={draft?.eventName || ""}
            onChange={(e) => setDraft({ eventName: e.target.value })}
          />

          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              fullWidth
              label="People"
              value={draft?.expectedPeople ?? ""}
              onChange={(e) =>
                setDraft({ expectedPeople: e.target.value.replace(/\D/g, "") })
              }
            />
            <TextField
              fullWidth
              label="Cars"
              value={draft?.expectedCars ?? ""}
              onChange={(e) =>
                setDraft({ expectedCars: e.target.value.replace(/\D/g, "") })
              }
            />
          </Box>

          <Divider />

          {/* --- WHEN --- */}
          <Typography variant="overline" color="text.secondary">
            When
          </Typography>

          {/* Recurring bookings always get the chip list, even when one date is left */}
          {draft?.isSeries ? (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Dates ({draft.allDates.length}). Time and locations apply to
                all.
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.75,
                  maxHeight: 140,
                  overflowY: "auto",
                }}
              >
                {draft.allDates.map((d) => (
                  <Chip
                    key={d}
                    size="small"
                    label={dayjs(d).format("ddd D MMM YYYY")}
                    // Can't remove the last remaining date
                    onDelete={
                      draft.allDates.length > 1
                        ? () => removeEditDate(d)
                        : undefined
                    }
                  />
                ))}
              </Box>
              <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
                <TextField
                  size="small"
                  fullWidth
                  type="date"
                  label="Add a date"
                  InputLabelProps={{ shrink: true }}
                  value={newEditDate}
                  onChange={(e) => setNewEditDate(e.target.value)}
                />
                <Button onClick={addEditDate} disabled={!newEditDate}>
                  Add
                </Button>
              </Box>
            </Box>
          ) : (
            <TextField
              fullWidth
              type="date"
              label="Date"
              InputLabelProps={{ shrink: true }}
              value={draft?.allDates?.[0] || ""}
              onChange={(e) =>
                updateDraftDates(e.target.value ? [e.target.value] : [])
              }
            />
          )}

          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              fullWidth
              type="time"
              label="From Time"
              InputLabelProps={{ shrink: true }}
              value={draft?.fromTime || ""}
              onChange={(e) => setDraft({ fromTime: e.target.value })}
            />
            <TextField
              fullWidth
              type="time"
              label="To Time"
              InputLabelProps={{ shrink: true }}
              value={draft?.toTime || ""}
              onChange={(e) => setDraft({ toTime: e.target.value })}
            />
          </Box>

          <FormControl fullWidth>
            <InputLabel>Locations</InputLabel>
            <Select
              multiple
              value={draft?.locations || []}
              onChange={(e) =>
                setDraft({
                  locations:
                    typeof e.target.value === "string"
                      ? e.target.value.split(",")
                      : e.target.value,
                })
              }
              input={<OutlinedInput label="Locations" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((loc) => (
                    <Chip key={loc} label={loc} size="small" />
                  ))}
                </Box>
              )}
            >
              {editAvailableLocations.map((loc) => (
                <MenuItem key={loc.name} value={loc.name}>
                  {loc.name}
                </MenuItem>
              ))}
            </Select>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              Only locations free for the selected date(s) and time are shown.
              Currently selected locations that become unavailable will be
              blocked from saving.
            </Typography>
            {selectedConflictGroups.length > 0 && (
              <Alert severity="error" sx={{ mt: 1.5 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, mb: 1 }}
                >
                  Booking conflict
                </Typography>
                {selectedConflictGroups.map((g) => (
                  <Box key={g.key} sx={{ mb: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      "{g.eventName}"{g.bookingId ? ` (${g.bookingId})` : ""}
                    </Typography>
                    <Typography variant="caption" sx={{ display: "block" }}>
                      {formatDateList(g.dates)}
                      {g.fromTime && g.toTime
                        ? ` · ${g.fromTime} - ${g.toTime}`
                        : ""}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.5,
                        mt: 0.5,
                      }}
                    >
                      {g.locations.map((loc) => (
                        <Chip
                          key={loc}
                          label={loc}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                ))}
                <Typography variant="caption">
                  Remove these locations or change the date/time to save.
                </Typography>
              </Alert>
            )}

            {hiddenConflictGroups.length > 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Hidden from the list because they're already booked:{" "}
                {hiddenConflictGroups
                  .map(
                    (g) =>
                      `${g.locations.length} location${g.locations.length === 1 ? "" : "s"} by "${g.eventName}" on ${formatDateList(g.dates)}`,
                  )
                  .join("; ")}
              </Typography>
            )}
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeEditModal}>Cancel</Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            disabled={groupActionLoadingId === editModal.data?.bookingId}
            startIcon={
              groupActionLoadingId === editModal.data?.bookingId && (
                <CircularProgress size={16} color="inherit" />
              )
            }
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}