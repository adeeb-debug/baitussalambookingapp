import React, { useState, useEffect } from "react";
import {
  Button,
  Typography,
  CircularProgress,
  Alert,
  Box,
  Paper,
  Divider,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  EventAvailable,
  InfoOutlined,
  CheckCircle,
} from "@mui/icons-material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { db } from "../firebase/firebaseConfig";
import { LOCATIONS } from "../utils/constants";
import { overlaps } from "../utils/timeUtils";
import {
  sendAdminNotification,
  sendUserAcknowledgement,
} from "../utils/bookingService";
import BookingFormFields from "./BookingFormFields";
import { generateRecurringDates } from "../utils/dateUtils";
import { setDoc, doc, getDoc } from "firebase/firestore";

export default function BookingForm({ user, role, bookings }) {
  const INITIAL_FORM_DATA = (user) => ({
    fullName: "",
    phoneNumber: "",
    jamaat: "",
    date: "",
    fromTime: "",
    toTime: "",
    locations: [],
    eventName: "",
    expectedPeople: "",
    expectedCars: "",
    isRecurring: false,
    recurrenceType: "weekly",
    endDate: "",
  });

  const [formData, setFormData] = useState(INITIAL_FORM_DATA(user));
  const [availableLocations, setAvailableLocations] = useState(LOCATIONS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ error: "", success: false });
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [successPopupOpen, setSuccessPopupOpen] = useState(false);
  const [conflictedLocations, setConflictedLocations] = useState([]);

  /** 🔐 CENTRAL VALIDATION */
  const validateForm = () => {
    const baseValid =
      formData.fullName &&
      formData.phoneNumber &&
      formData.jamaat &&
      formData.date &&
      formData.fromTime &&
      formData.toTime &&
      formData.locations.length > 0 &&
      formData.eventName &&
      formData.expectedPeople &&
      formData.expectedCars;

    if (formData.isRecurring) {
      return baseValid && formData.endDate; // Ensure end date is picked if recurring
    }
    return baseValid;
  };

  /** 📍 UPDATED LOCATION AVAILABILITY (with Detail) */
  useEffect(() => {
    if (!formData.date || !formData.fromTime || !formData.toTime || !bookings)
      return;

    const requestedDates =
      formData.isRecurring && formData.endDate
        ? generateRecurringDates(
            formData.date,
            formData.endDate,
            formData.recurrenceType,
          )
        : [formData.date];

    const conflicts = []; // Store objects: { location, eventName, dates: [] }

    bookings.forEach((b) => {
      if (b.status === "Cancelled" || b.status === "Rejected") return;

      // A. Check Date Overlap
      const existingDates = b.allDates || [b.date];
      const clashingDates = requestedDates.filter((d) =>
        existingDates.includes(d),
      );
      if (clashingDates.length === 0) return;

      // B. Check Time Overlap
      const REFERENCE_DATE = "2026-01-01";
      const isTimeClash = overlaps(
        dayjs(`${REFERENCE_DATE}T${formData.fromTime}`).toDate(),
        dayjs(`${REFERENCE_DATE}T${formData.toTime}`).toDate(),
        dayjs(`${REFERENCE_DATE}T${b.fromTime}`).toDate(),
        dayjs(`${REFERENCE_DATE}T${b.toTime}`).toDate(),
      );

      // C. Record the specific details
      if (isTimeClash) {
        const locs = Array.isArray(b.locations) ? b.locations : [b.location];
        locs.forEach((locName) => {
          conflicts.push({
            location: locName,
            eventName: b.eventName,
            dates: clashingDates, // These are the specific days it's blocked
          });
        });
      }
    });

    // Filter available locations (just the names for the dropdown)
    const blockedNames = conflicts.map((c) => c.location);
    const filtered = LOCATIONS.filter(
      (loc) => !blockedNames.includes(loc.name),
    );

    setAvailableLocations(filtered);
    setConflictedLocations(conflicts); // Now storing full objects
  }, [
    formData.date,
    formData.endDate,
    formData.isRecurring,
    formData.recurrenceType,
    formData.fromTime,
    formData.toTime,
    bookings,
  ]);
  /** 🚀 SUBMIT */
  /** 🚀 SUBMIT */
const handleSend = async () => {
  setStatus({ error: "", success: false });

  // 1. 🛑 CONFLICT GATEKEEPER
  // Filter the conflicts list to only see ones affecting the user's current selection
  const activeConflicts = conflictedLocations.filter((c) =>
    formData.locations.includes(c.location)
  );

  if (activeConflicts.length > 0) {
    // Generate a detailed error string
    const conflictDetails = activeConflicts
      .map((c) => {
        const dateList = c.dates.map((d) => dayjs(d).format("MMM D")).join(", ");
        return `${c.location} is booked for "${c.eventName}" on ${dateList}`;
      })
      .join(" | ");

    setStatus({
      error: `Booking Conflict: ${conflictDetails}. Please adjust your dates or locations.`,
      success: false,
    });

    // Scroll to top so the user sees the red Alert
    window.scrollTo({ top: 0, behavior: "smooth" });
    return; // Kill the process
  }

  // 2. Standard Validation
  if (!validateForm() || !acceptedDisclaimer) {
    setStatus({
      error: "Please complete all fields and accept the disclaimer.",
      success: false,
    });
    return;
  }

  setIsSubmitting(true);

  const currentYear = dayjs().year(); // 2026
  const datesToBook = formData.isRecurring
    ? generateRecurringDates(
        formData.date,
        formData.endDate,
        formData.recurrenceType
      )
    : [formData.date];

  try {
    // 3. Get sequential ID
    const counterRef = doc(db, "counters", `bookings_${currentYear}`);
    const counterSnap = await getDoc(counterRef);

    let nextNum = 1;
    if (counterSnap.exists()) {
      nextNum = counterSnap.data().lastNumber + 1;
    }

    const formattedNum = String(nextNum).padStart(4, "0");
    const bId = `${currentYear}-${formattedNum}`;

    // 4. Create Doc ID and Payload
    const customDocId = `${bId}`;
    const newDocRef = doc(db, "bookings", customDocId);

    const bookingPayload = {
      ...formData,
      bookingId: bId,
      status: "Pending",
      requestedByEmail: user.email,
      createdAt: new Date().toISOString(),
      allDates: datesToBook,
      date: datesToBook[0],
      userNotified: false,
      actionByEmail: "",
      actionByName: "",
      actionAt: null,
      approverNote: "",
    };

    // 5. Save to Firestore
    await setDoc(newDocRef, bookingPayload);
    await setDoc(
      counterRef,
      {
        lastNumber: nextNum,
        year: currentYear,
      },
      { merge: true }
    );

    // 6. Notifications
    await sendAdminNotification(db, bookingPayload, bId);
    await sendUserAcknowledgement(
      db,
      user.email,
      formData.fullName,
      bookingPayload,
      bId
    );

    setSuccessPopupOpen(true);
    setFormData(INITIAL_FORM_DATA(user));
    setAcceptedDisclaimer(false);
    setConflictedLocations([]);
  } catch (e) {
    console.error("Submission error:", e);
    setStatus({ error: e.message, success: false });
  } finally {
    setIsSubmitting(false);
  }
};
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {status.error && (
          <Alert severity="error" sx={{ mb: 2.5 }} variant="outlined">
            {status.error}
          </Alert>
        )}

        {user ? (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 4 },
              borderRadius: 4,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0px 10px 30px rgba(15,23,22,0.05)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                mb: 3,
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  bgcolor: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <EventAvailable sx={{ color: "white" }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  Booking Details
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fields marked required must be completed before submitting.
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <BookingFormFields
              formData={formData}
              setFormData={setFormData}
              availableLocations={availableLocations}
              role={role}
              conflictedLocations={conflictedLocations}
            />

            <Alert
              icon={<InfoOutlined fontSize="small" />}
              severity="info"
              variant="outlined"
              sx={{ my: 3 }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Before you submit
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.25 }}>
                <li>Jamaat Jalsa or meetings with Ameer Sb take precedence.</li>
                <li>You are responsible for cleaning after the event.</li>
                <li>No events on Fridays before 3:00 PM.</li>
              </Box>
            </Alert>

            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: "grey.50",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={acceptedDisclaimer}
                    onChange={(e) => setAcceptedDisclaimer(e.target.checked)}
                  />
                }
                label="I understand and accept the conditions."
              />
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, py: 1.6, fontSize: "1rem" }}
              disabled={isSubmitting}
              onClick={handleSend}
              startIcon={
                isSubmitting && <CircularProgress size={20} color="inherit" />
              }
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </Paper>
        ) : (
          <Alert severity="info">Please sign in to make a booking.</Alert>
        )}
      </Box>

      <Dialog
        open={successPopupOpen}
        onClose={() => setSuccessPopupOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { textAlign: "center", p: 1 } }}
      >
        <DialogContent sx={{ pt: 4 }}>
          <CheckCircle sx={{ fontSize: 56, color: "success.main", mb: 1.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Request Submitted
          </Typography>
          <Typography color="text.secondary">
            Jazakallah for submitting your request. We will review it shortly.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button
            fullWidth
            onClick={() => setSuccessPopupOpen(false)}
            variant="contained"
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
