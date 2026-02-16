import React, { useState, useEffect } from "react";
import {
  Button,
  Typography,
  CircularProgress,
  Alert,
  Box,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { db } from "../firebase/firebaseConfig";
import { LOCATIONS } from "../utils/constants";
import { overlaps } from "../utils/timeUtils";
import {
  sendAdminNotification,
  submitBookingBatch,
  sendUserAcknowledgement,
} from "../utils/bookingService";
import BookingFormFields from "./BookingFormFields";

export default function BookingForm({ user, bookings }) {
  const INITIAL_FORM_DATA = (user) => ({
    fullName: user?.displayName || "",
    phoneNumber: "",
    jamaat: "",
    date: "",
    fromTime: "",
    toTime: "",
    locations: [],
    eventName: "",
    expectedPeople: "",
    expectedCars: "",
  });

  const [formData, setFormData] = useState(INITIAL_FORM_DATA(user));
  const [availableLocations, setAvailableLocations] = useState(LOCATIONS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ error: "", success: false });
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [successPopupOpen, setSuccessPopupOpen] = useState(false);

  /** 🔐 CENTRAL VALIDATION */
  const validateForm = () => {
    return (
      formData.fullName &&
      formData.phoneNumber &&
      formData.jamaat &&
      formData.date &&
      formData.fromTime &&
      formData.toTime &&
      formData.locations.length > 0 &&
      formData.eventName &&
      formData.expectedPeople &&
      formData.expectedCars
    );
  };

  /** 📍 LOCATION AVAILABILITY */
  useEffect(() => {
    if (!formData.date || !formData.fromTime || !formData.toTime) return;

    const reqStart = dayjs(`2026-01-01T${formData.fromTime}`);
    const reqEnd = dayjs(`2026-01-01T${formData.toTime}`);

    const filtered = LOCATIONS.filter(
      (loc) =>
        !bookings.some((b) => {
          if (b.location !== loc.name || b.date !== formData.date) return false;
          if (b.status === "Cancelled" || b.status === "Rejected") return false;

          return overlaps(
            reqStart.toDate(),
            reqEnd.toDate(),
            dayjs(`2026-01-01T${b.fromTime}`).toDate(),
            dayjs(`2026-01-01T${b.toTime}`).toDate()
          );
        })
    );

    setAvailableLocations(filtered);
  }, [formData.date, formData.fromTime, formData.toTime, bookings]);

  /** 🚀 SUBMIT */
  const handleSend = async () => {
    setStatus({ error: "", success: false });

    if (!validateForm()) {
      setStatus({
        error: "Please complete all required fields before submitting.",
        success: false,
      });
      return;
    }

    if (!acceptedDisclaimer) {
      setStatus({
        error:
          "You must accept the responsibility disclaimer before submitting.",
        success: false,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const bookingCreated = await submitBookingBatch(
        db,
        user,
        formData,
        formData.locations
      );

      if (!bookingCreated || bookingCreated.length === 0) {
        throw new Error("Booking could not be created");
      }

      await sendAdminNotification(
        db,
        {
          ...formData,
          email: user.email,
          timeRange: `${formData.fromTime}-${formData.toTime}`,
        },
        bookingCreated.bookingId
      );

      await sendUserAcknowledgement(
        db,
        user.email,
        formData.fullName,
        formData,
        bookingCreated.bookingId
      );

      setSuccessPopupOpen(true);
      setFormData(INITIAL_FORM_DATA(user));
      setAcceptedDisclaimer(false);
      setAvailableLocations(LOCATIONS);
    } catch (e) {
      setStatus({ error: e.message, success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          color: "primary.main",
          mt: 3,
          mb: 3,
          borderBottom: "2px solid",
          borderColor: "divider",
          pb: 1,
          fontSize: { xs: '1.25rem', sm: '1.5rem' }
        }}
      >
        Request a Booking
      </Typography>
        {status.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {status.error}
          </Alert>
        )}

        {user ? (
          <>
            <BookingFormFields
              formData={formData}
              setFormData={setFormData}
              availableLocations={availableLocations}
            />

            <Alert severity="info" sx={{ my: 2 }}>
              <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                <li>
                  Jamaat Jalsa or meetings with Ameer Sb take precedence.
                </li>
                <li>You are responsible for cleaning after the event.</li>
                <li>No events on Fridays before 3:00 PM.</li>
              </ul>
            </Alert>

            <FormControlLabel
              control={
                <Checkbox
                  checked={acceptedDisclaimer}
                  onChange={(e) => setAcceptedDisclaimer(e.target.checked)}
                />
              }
              label="I understand and accept the conditions."
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, py: 1.5, fontWeight: 600 }}
              disabled={isSubmitting}
              onClick={handleSend}
              startIcon={
                isSubmitting && (
                  <CircularProgress size={20} color="inherit" />
                )
              }
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </>
        ) : (
          <Alert severity="info">Please sign in to make a booking.</Alert>
        )}
      </Box>

      <Dialog
        open={successPopupOpen}
        onClose={() => setSuccessPopupOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>✅ Request Submitted</DialogTitle>
        <DialogContent>
          <Typography>
            Jazakallah for submitting your request. We will review it shortly.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuccessPopupOpen(false)} variant="contained">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
