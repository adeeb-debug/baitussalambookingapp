import React, { useState, useEffect } from "react";
import { Button, Typography, CircularProgress, Alert, Box } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { db } from "../firebase/firebaseConfig";
import { LOCATIONS } from "../utils/constants";
import { overlaps } from "../utils/timeUtils";
import { sendAdminNotification, submitBookingBatch } from "../utils/bookingService";
import BookingFormFields from "./BookingFormFields";

export default function BookingForm({ user, bookings }) {
  const [formData, setFormData] = useState({
    date: "", fromTime: "", toTime: "", locations: [],
    jamaat: "", eventName: "", expectedCars: "",
    expectedPeople: "", phoneNumber: "", fullName: user?.displayName || ""
  });
  const [availableLocations, setAvailableLocations] = useState(LOCATIONS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ error: "", success: false });

  // Update available locations logic
  useEffect(() => {
    if (!formData.date || !formData.fromTime || !formData.toTime) return;
    const reqStart = dayjs(`2026-01-01T${formData.fromTime}`);
    const reqEnd = dayjs(`2026-01-01T${formData.toTime}`);

    const filtered = LOCATIONS.filter((loc) => !bookings.some((b) => {
      if (b.location !== loc.name || b.date !== formData.date) return false;
      if (b.status === "Cancelled" || b.status === "Rejected") return false;
      return overlaps(reqStart.toDate(), reqEnd.toDate(), dayjs(`2026-01-01T${b.fromTime}`).toDate(), dayjs(`2026-01-01T${b.toTime}`).toDate());
    }));
    setAvailableLocations(filtered);
  }, [formData.date, formData.fromTime, formData.toTime, bookings]);

  const handleSend = async () => {
    if (!formData.eventName || formData.locations.length === 0) {
      setStatus({ error: "Please fill in all fields.", success: false });
      return;
    }
    setIsSubmitting(true);
    try {
      await submitBookingBatch(db, user, formData, formData.locations);
      await sendAdminNotification(db, { ...formData, email: user.email, timeRange: `${formData.fromTime}-${formData.toTime}` });
      setStatus({ error: "", success: true });
    } catch (e) {
      setStatus({ error: e.message, success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 0 }}> {/* ✅ Removed container padding to prevent double-boxing */}
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 700, 
            color: "primary.main", 
            mb: 2, 
            textAlign: "left" 
          }}
        >
          📝 Request a Booking
        </Typography>

        {status.error && <Alert severity="error" sx={{ mb: 2 }}>{status.error}</Alert>}
        {status.success && <Alert severity="success" sx={{ mb: 2 }}>Booking Sent!</Alert>}

        {user ? (
          <Box sx={{ mt: 1 }}>
            <BookingFormFields 
              formData={formData} 
              setFormData={setFormData} 
              availableLocations={availableLocations} 
            />
            <Button
              variant="contained"
              fullWidth
              size="large"
              disabled={isSubmitting}
              onClick={handleSend}
              sx={{ 
                mt: 3, 
                py: 1.5, 
                borderRadius: 2, // Matches your theme's app-like feel
                fontWeight: 600 
              }}
              startIcon={isSubmitting && <CircularProgress size={20} color="inherit" />}
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </Box>
        ) : (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Please sign in to make a booking.
          </Alert>
        )}
      </Box>
    </LocalizationProvider>
  );
}