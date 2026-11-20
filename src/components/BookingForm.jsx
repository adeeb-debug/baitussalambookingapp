import React, { useState, useEffect, useRef } from "react";
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
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import { EventAvailable, InfoOutlined, CheckCircle } from "@mui/icons-material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { db } from "../firebase/firebaseConfig";
import { LOCATIONS } from "../utils/constants";
import { overlaps } from "../utils/timeUtils";
import BookingFormFields from "./BookingFormFields";
import { generateRecurringDates } from "../utils/dateUtils";
import { doc, runTransaction } from "firebase/firestore";

/**
 * Builds the single "jamaat" text that the rest of the app (emails,
 * My Bookings, All Bookings, etc.) already reads.
 *   Auxiliary -> "Khuddam, Lajna – Clyde, Cranbourne"
 *   Jamaat    -> "Melbourne, Sydney"
 */
const buildJamaatLabel = (f) => {
  if (f.organisationType === "auxiliary") {
    const aux = (f.auxiliaries || []).join(", ");
    const majlis = (f.majlisNames || []).join(", ");
    return `${aux} – ${majlis}`;
  }
  if (f.organisationType === "jamaat") {
    return (f.jamaatNames || []).join(", ");
  }
  return "";
};

const STEPS = ["About you", "When and where", "Event details", "Review"];
const REVIEW_STEP = STEPS.length - 1;
const SECTIONS = ["about", "when", "event"]; // BookingFormFields section per step

const INITIAL_FORM_DATA = () => ({
  fullName: "",
  phoneNumber: "",
  jamaat: "", // filled automatically on submit from the fields below
  organisationType: "", // "auxiliary" | "jamaat"
  auxiliaries: [],
  majlisNames: [],
  jamaatNames: [],
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

/** One label/value row in the review step, with an Edit link */
function ReviewRow({ label, value, onEdit }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 2,
        py: 1,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
          {value || "—"}
        </Typography>
      </Box>
      {onEdit && (
        <Button size="small" onClick={onEdit} sx={{ flexShrink: 0 }}>
          Edit
        </Button>
      )}
    </Box>
  );
}

export default function BookingForm({ user, role, bookings }) {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [availableLocations, setAvailableLocations] = useState(LOCATIONS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ error: "", success: false });
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [successPopupOpen, setSuccessPopupOpen] = useState(false);
  const [conflictedLocations, setConflictedLocations] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false); // inline errors after a failed Next
  const topRef = useRef(null);

  /** Scroll to the top of the form whenever the step changes */
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeStep]);

  /** 🏛️ ORGANISATION VALIDATION (auxiliary or jamaat) */
  const isOrganisationValid = () => {
    if (formData.organisationType === "auxiliary") {
      return formData.auxiliaries.length > 0 && formData.majlisNames.length > 0;
    }
    if (formData.organisationType === "jamaat") {
      return formData.jamaatNames.length > 0;
    }
    return false;
  };

  /** Conflicts that affect the locations currently selected */
  const getActiveConflicts = () =>
    conflictedLocations.filter((c) => formData.locations.includes(c.location));

  const buildConflictMessage = (activeConflicts) => {
    const details = activeConflicts
      .map((c) => {
        const dateList = c.dates.map((d) => dayjs(d).format("MMM D")).join(", ");
        return `${c.location} is booked for "${c.eventName}" on ${dateList}`;
      })
      .join(" | ");
    return `Booking conflict: ${details}. Please adjust your dates or locations.`;
  };

  /** 🔐 PER-STEP VALIDATION — returns an error string, or "" when valid */
  const validateStep = (step) => {
    switch (step) {
      case 0:
        if (!formData.fullName || !formData.phoneNumber) {
          return "Enter your full name and phone number.";
        }
        if (!isOrganisationValid()) {
          return "Choose your organisation and select at least one name.";
        }
        return "";
      case 1: {
        if (!formData.date || !formData.fromTime || !formData.toTime) {
          return "Choose a date, start time and end time.";
        }
        if (formData.toTime <= formData.fromTime) {
          return "The end time must be after the start time.";
        }
        if (formData.isRecurring && !formData.endDate) {
          return "Choose an end date for the recurring booking.";
        }
        if (formData.locations.length === 0) {
          return "Select at least one location.";
        }
        const active = getActiveConflicts();
        if (active.length > 0) return buildConflictMessage(active);
        return "";
      }
      case 2:
        if (
          !formData.eventName ||
          !formData.expectedPeople ||
          !formData.expectedCars
        ) {
          return "Enter the event name, expected people and expected cars.";
        }
        return "";
      default:
        return "";
    }
  };

  /** 📍 LOCATION AVAILABILITY (with detail) — unchanged logic */
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

    const conflicts = []; // { location, eventName, dates: [] }

    bookings.forEach((b) => {
      if (b.status === "Cancelled" || b.status === "Rejected") return;

      // A. Date overlap
      const existingDates = b.allDates || [b.date];
      const clashingDates = requestedDates.filter((d) =>
        existingDates.includes(d),
      );
      if (clashingDates.length === 0) return;

      // B. Time overlap
      const REFERENCE_DATE = "2026-01-01";
      const isTimeClash = overlaps(
        dayjs(`${REFERENCE_DATE}T${formData.fromTime}`).toDate(),
        dayjs(`${REFERENCE_DATE}T${formData.toTime}`).toDate(),
        dayjs(`${REFERENCE_DATE}T${b.fromTime}`).toDate(),
        dayjs(`${REFERENCE_DATE}T${b.toTime}`).toDate(),
      );

      // C. Record the specifics
      if (isTimeClash) {
        const locs = Array.isArray(b.locations) ? b.locations : [b.location];
        locs.forEach((locName) => {
          conflicts.push({
            location: locName,
            eventName: b.eventName,
            dates: clashingDates,
          });
        });
      }
    });

    const blockedNames = conflicts.map((c) => c.location);
    setAvailableLocations(
      LOCATIONS.filter((loc) => !blockedNames.includes(loc.name)),
    );
    setConflictedLocations(conflicts);
  }, [
    formData.date,
    formData.endDate,
    formData.isRecurring,
    formData.recurrenceType,
    formData.fromTime,
    formData.toTime,
    bookings,
  ]);

  /** ⬅️ ➡️ NAVIGATION */
  const handleNext = () => {
    const error = validateStep(activeStep);
    if (error) {
      setStatus({ error, success: false });
      setShowErrors(true);
      return;
    }
    setStatus({ error: "", success: false });
    setShowErrors(false);
    setActiveStep((s) => s + 1);
  };

  const handleBack = () => {
    setStatus({ error: "", success: false });
    setShowErrors(false);
    setActiveStep((s) => s - 1);
  };

  const goToStep = (step) => {
    setStatus({ error: "", success: false });
    setShowErrors(false);
    setActiveStep(step);
  };

  /** 🚀 SUBMIT */
  const handleSend = async () => {
    setStatus({ error: "", success: false });

    for (let step = 0; step < REVIEW_STEP; step++) {
      const error = validateStep(step);
      if (error) {
        setStatus({ error, success: false });
        setShowErrors(true);
        setActiveStep(step);
        return;
      }
    }

    if (!acceptedDisclaimer) {
      setStatus({
        error: "Accept the conditions to submit your request.",
        success: false,
      });
      return;
    }

    const requesterEmail = (user?.email || "").trim().toLowerCase();
    if (!requesterEmail) {
      setStatus({
        error: "Your sign-in account does not have an email address.",
        success: false,
      });
      return;
    }

    setIsSubmitting(true);

    const currentYear = dayjs().year();
    const datesToBook = formData.isRecurring
      ? generateRecurringDates(
          formData.date,
          formData.endDate,
          formData.recurrenceType,
        )
      : [formData.date];

    let step = "reserving a booking number";
    try {
      const counterRef = doc(db, "counters", `bookings_${currentYear}`);

      await runTransaction(db, async (transaction) => {
        const counterSnap = await transaction.get(counterRef);
        const nextNum = counterSnap.exists()
          ? (counterSnap.data().lastNumber || 0) + 1
          : 1;

        const formattedNum = String(nextNum).padStart(4, "0");
        const bId = `${currentYear}-${formattedNum}`;
        const newDocRef = doc(db, "bookings", bId);

        const bookingPayload = {
          ...formData,
          jamaat: buildJamaatLabel(formData),
          bookingId: bId,
          status: "Pending",
          requestedByEmail: requesterEmail,
          createdAt: new Date().toISOString(),
          allDates: datesToBook,
          date: datesToBook[0],
          userNotified: false,
          actionByEmail: "",
          actionByName: "",
          actionAt: null,
          approverNote: "",
        };

        step = "saving the booking";
        transaction.set(newDocRef, bookingPayload);

        step = "updating the booking counter";
        transaction.set(
          counterRef,
          { lastNumber: nextNum, year: currentYear },
          { merge: true },
        );
      });

      // Admin and confirmation emails are sent by the
      // notifyAdminsOfNewBooking Cloud Function when the booking is created.

      setSuccessPopupOpen(true);
      setFormData(INITIAL_FORM_DATA());
      setAcceptedDisclaimer(false);
      setConflictedLocations([]);
      setShowErrors(false);
      setActiveStep(0);
    } catch (e) {
      console.error(`Submission failed while ${step}:`, e);
      setStatus({
        error: `Couldn't complete your request (${step}): ${e.message}`,
        success: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Review step content */
  const renderReview = () => {
    const dates = formData.isRecurring
      ? generateRecurringDates(
          formData.date,
          formData.endDate,
          formData.recurrenceType,
        )
      : [formData.date];

    const dateSummary = formData.isRecurring
      ? `${dayjs(formData.date).format("ddd D MMM YYYY")} to ${dayjs(
          formData.endDate,
        ).format("ddd D MMM YYYY")}, ${formData.recurrenceType} (${
          dates.length
        } bookings)`
      : dayjs(formData.date).format("ddd D MMM YYYY");

    return (
      <>
        <Box sx={{ mb: 1 }}>
          <ReviewRow
            label="Name"
            value={formData.fullName}
            onEdit={() => goToStep(0)}
          />
          <ReviewRow label="Phone" value={formData.phoneNumber} />
          <ReviewRow label="Organisation" value={buildJamaatLabel(formData)} />
          <Divider />
          <ReviewRow
            label="Date"
            value={dateSummary}
            onEdit={() => goToStep(1)}
          />
          <ReviewRow
            label="Time"
            value={`${formData.fromTime} to ${formData.toTime}`}
          />
          <ReviewRow
            label="Locations"
            value={formData.locations.join(", ")}
          />
          <Divider />
          <ReviewRow
            label="Event"
            value={formData.eventName}
            onEdit={() => goToStep(2)}
          />
          <ReviewRow
            label="Expected people"
            value={String(formData.expectedPeople)}
          />
          <ReviewRow
            label="Expected cars"
            value={String(formData.expectedCars)}
          />
        </Box>

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
      </>
    );
  };

  const stepSubtitle = [
    "Tell us who is making the booking.",
    "Pick a date and time first. Available locations update to match.",
    "Tell us about the event.",
    "Check everything before you submit.",
  ][activeStep];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box ref={topRef} sx={{ scrollMarginTop: 16 }}>
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
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
                  {STEPS[activeStep]}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stepSubtitle}
                </Typography>
              </Box>
            </Box>

            <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
              {STEPS.map((label, i) => (
                <Step key={label} completed={i < activeStep}>
                  <StepLabel
                    sx={{
                      // On phones only the current step's label is shown
                      "& .MuiStepLabel-label": {
                        display: { xs: i === activeStep ? "block" : "none", sm: "block" },
                      },
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>

            <Divider sx={{ mb: 3 }} />

            {status.error && (
              <Alert severity="error" sx={{ mb: 2.5 }} variant="outlined">
                {status.error}
              </Alert>
            )}

            {activeStep < REVIEW_STEP && (
              <BookingFormFields
                key={activeStep} // fresh "touched" state on every step
                section={SECTIONS[activeStep]}
                showErrors={showErrors}
                formData={formData}
                setFormData={setFormData}
                availableLocations={availableLocations}
                role={role}
                conflictedLocations={conflictedLocations}
              />
            )}
            {activeStep === REVIEW_STEP && renderReview()}

            <Box sx={{ display: "flex", gap: 1.5, mt: 3 }}>
              {activeStep > 0 && (
                <Button
                  variant="outlined"
                  size="large"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  sx={{ py: 1.6, flex: { xs: 1, sm: "0 0 auto" }, px: { sm: 4 } }}
                >
                  Back
                </Button>
              )}
              {activeStep < REVIEW_STEP ? (
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleNext}
                  sx={{ py: 1.6, fontSize: "1rem", flex: 1 }}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="contained"
                  size="large"
                  sx={{ py: 1.6, fontSize: "1rem", flex: 1 }}
                  disabled={isSubmitting || !acceptedDisclaimer}
                  onClick={handleSend}
                  startIcon={
                    isSubmitting && <CircularProgress size={20} color="inherit" />
                  }
                >
                  {isSubmitting ? "Submitting..." : "Submit request"}
                </Button>
              )}
            </Box>
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