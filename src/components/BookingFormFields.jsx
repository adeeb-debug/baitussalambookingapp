import React, { useState } from "react";
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  FormHelperText,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { JAMAAT_OPTIONS } from "../utils/constants";

export default function BookingFormFields({
  formData,
  setFormData,
  availableLocations,
  role,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const baseDate = dayjs().startOf("day");

  const [touched, setTouched] = useState({});

  const markTouched = (field) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const handleChange = (field) => (value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const fieldSpacing = isMobile ? 2.5 : 3;

  const minDate = role === "admin" ? null : dayjs().add(2, "day");
  const maxDate = role === "admin" ? null : dayjs().add(2, "month");

  const blockTyping = (e) => e.preventDefault();

  const isPhoneInvalid =
    touched.phoneNumber &&
    !/^((04\d{8})|(614\d{8})|(0[2378]\d{8}))$/.test(formData.phoneNumber || "");

  return (
    <Box>
      {/* Full Name */}
      <TextField
        label="Full Name"
        placeholder="Your full name only (Do not type your department name here)"
        required
        fullWidth
        sx={{ mb: fieldSpacing }}
        value={formData.fullName}
        onChange={(e) => handleChange("fullName")(e.target.value)}
        onBlur={() => markTouched("fullName")}
        error={touched.fullName && !formData.fullName}
        helperText={
          touched.fullName && !formData.fullName
            ? "Full name is required"
            : undefined
        }
      />

      {/* Phone Number */}
      <TextField
        label="Phone Number"
        required
        placeholder="04XXXXXXXX"
        fullWidth
        value={formData.phoneNumber}
        onChange={(e) =>
          handleChange("phoneNumber")(e.target.value.replace(/\D/g, ""))
        }
        onBlur={() => markTouched("phoneNumber")}
        inputProps={{
          inputMode: "numeric",
          pattern: "[0-9]*",
          maxLength: 12,
        }}
        error={isPhoneInvalid}
        helperText={isPhoneInvalid ? "Enter a valid phone number" : undefined}
        sx={{ mb: fieldSpacing }}
      />

      {/* Jamaat */}
      <FormControl
        fullWidth
        required
        error={touched.jamaat && !formData.jamaat}
        sx={{ mb: fieldSpacing }}
      >
        <InputLabel>Jamaat</InputLabel>
        <Select
          value={formData.jamaat}
          label="Jamaat"
          onChange={(e) => handleChange("jamaat")(e.target.value)}
          onBlur={() => markTouched("jamaat")}
        >
          {JAMAAT_OPTIONS.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>
          {touched.jamaat && !formData.jamaat
            ? "Please select a Jamaat"
            : undefined}
        </FormHelperText>
      </FormControl>

      {/* Date */}
      <DatePicker
        label="Date"
        format="DD-MM-YYYY"
        value={formData.date ? dayjs(formData.date) : null}
        minDate={minDate}
        maxDate={maxDate}
        disablePast
        onChange={(val) => {
          markTouched("date");
          handleChange("date")(val ? val.format("YYYY-MM-DD") : "");
        }}
        slotProps={{
          field: {
            readOnly: true,
            onKeyDown: (e) => e.preventDefault(),
          },
          textField: {
            required: true,
            fullWidth: true,
            sx: {
              mb: fieldSpacing,
              "& .MuiInputBase-input": { pointerEvents: "none" },
            },
            error: touched.date && !formData.date,
            helperText:
              touched.date && !formData.date
                ? "Date is required"
                : role === "admin"
                  ? "Admin Mode: No date restrictions applied"
                  : "Bookings must be made at least 2 days in advance",
            InputProps: { readOnly: true },
            onKeyDown: (e) => e.preventDefault(),
          },
        }}
      />

      <Box sx={{ display: "flex", gap: 2, mb: fieldSpacing }}>
        <TimePicker
          label="From"
          required
          ampm={false}
          format="HH:mm"
          value={
            formData.fromTime
              ? baseDate
                  .hour(dayjs(formData.fromTime, "HH:mm").hour())
                  .minute(dayjs(formData.fromTime, "HH:mm").minute())
              : null
          }
          minTime={baseDate.hour(5)}
          maxTime={baseDate.hour(20)}
          minutesStep={5}
          onChange={(val) => {
            markTouched("fromTime");
            const newFrom = val ? val.format("HH:mm") : null;
            handleChange("fromTime")(newFrom);

            if (
              formData.toTime &&
              dayjs(formData.toTime, "HH:mm").isBefore(dayjs(newFrom, "HH:mm"))
            ) {
              handleChange("toTime")(null);
            }
          }}
          slotProps={{
            textField: {
              fullWidth: true,
              error: touched.fromTime && !formData.fromTime,
              helperText:
                touched.fromTime && !formData.fromTime ? "Required" : undefined,
              InputProps: { readOnly: true },
              onKeyDown: blockTyping,
            },
          }}
        />

        <TimePicker
          label="To"
          required
          ampm={false}
          format="HH:mm"
          value={
            formData.toTime
              ? baseDate
                  .hour(dayjs(formData.toTime, "HH:mm").hour())
                  .minute(dayjs(formData.toTime, "HH:mm").minute())
              : null
          }
          minTime={
            formData.fromTime
              ? baseDate
                  .hour(dayjs(formData.fromTime, "HH:mm").hour())
                  .minute(dayjs(formData.fromTime, "HH:mm").minute())
              : baseDate.hour(5)
          }
          maxTime={baseDate.hour(20)}
          minutesStep={5}
          onChange={(val) => {
            markTouched("toTime");
            handleChange("toTime")(val ? val.format("HH:mm") : null);
          }}
          slotProps={{
            textField: {
              fullWidth: true,
              error: touched.toTime && !formData.toTime,
              helperText:
                touched.toTime && !formData.toTime ? "Required" : undefined,
              InputProps: { readOnly: true },
              onKeyDown: blockTyping,
            },
          }}
        />
      </Box>

      {/* Locations */}
      <FormControl
        fullWidth
        required
        error={touched.locations && formData.locations.length === 0}
        sx={{ mb: fieldSpacing }}
      >
        <InputLabel>Location (Select Multiple)</InputLabel>
        <Select
          multiple
          value={formData.locations}
          label="Location (Select Multiple)"
          onChange={(e) => {
            markTouched("locations");
            handleChange("locations")(e.target.value);
          }}
          renderValue={(selected) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={value} label={value} size="small" />
              ))}
            </Box>
          )}
        >
          {availableLocations.map((loc) => (
            <MenuItem key={loc.id} value={loc.name}>
              {loc.name}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>
          {touched.locations && formData.locations.length === 0
            ? "Select at least one location"
            : "Only available locations will show for the date/time you have selected"}
        </FormHelperText>
      </FormControl>

<TextField
  label="Event Name"
  required
  fullWidth
  multiline
  rows={isMobile ? 3 : 2}
  sx={{ mb: fieldSpacing }}
  value={formData.eventName || ""} // Ensures value is never undefined
  onChange={(e) => handleChange("eventName")(e.target.value)}
  onBlur={() => markTouched("eventName")}
  inputProps={{ maxLength: 20 }}
  
  // 1. Error prop must be true for the field to turn red
  error={touched.eventName && (!formData.eventName || formData.eventName.trim() === "")}
  
  // 2. Prioritize the error message over the character count
  helperText={
    touched.eventName && (!formData.eventName || formData.eventName.trim() === "")
      ? "Event name is required"
      : `${formData.eventName?.length || 0}/20`
  }
/>

      {/* People / Cars */}
      <Box sx={{ display: "flex", gap: 2, mb: isMobile ? 2 : 4 }}>
        <TextField
          label="People"
          required
          fullWidth
          value={formData.expectedPeople}
          onChange={(e) =>
            handleChange("expectedPeople")(e.target.value.replace(/\D/g, ""))
          }
          onBlur={() => markTouched("expectedPeople")}
          error={touched.expectedPeople && !formData.expectedPeople}
          helperText={
            touched.expectedPeople && !formData.expectedPeople
              ? "Required"
              : undefined
          }
        />
        <TextField
          label="Cars"
          required
          fullWidth
          value={formData.expectedCars}
          onChange={(e) =>
            handleChange("expectedCars")(e.target.value.replace(/\D/g, ""))
          }
          onBlur={() => markTouched("expectedCars")}
          error={touched.expectedCars && !formData.expectedCars}
          helperText={
            touched.expectedCars && !formData.expectedCars
              ? "Required"
              : undefined
          }
        />
      </Box>
    </Box>
  );
}
