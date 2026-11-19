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
  FormControlLabel,
  Switch,
  Typography,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { JAMAAT_OPTIONS, MAJLIS_OPTIONS } from "../utils/constants";

const AUXILIARIES = ["Khuddam", "Atfal", "Ansar", "Lajna", "Nasirat"];

/** Multi-select dropdown that shows the chosen values as chips */
function MultiSelectField({
  label,
  options,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  sx,
}) {
  return (
    <FormControl fullWidth required error={error} sx={sx}>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        value={value}
        label={label}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
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
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}

/**
 * section: "about" | "when" | "event". Leave it undefined to render every
 * field (the old single-page behaviour).
 * showErrors: when true, every field in the section shows its error state,
 * even if the user hasn't touched it yet (used after a failed "Next").
 */
export default function BookingFormFields({
  section,
  showErrors = false,
  formData,
  setFormData,
  availableLocations,
  role,
  conflictedLocations,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const baseDate = dayjs().startOf("day");

  const [touched, setTouched] = useState({});

  const show = (s) => !section || section === s;
  const markTouched = (field) =>
    setTouched((prev) => ({ ...prev, [field]: true }));
  const isTouched = (field) => Boolean(touched[field]) || showErrors;

  const handleChange = (field) => (value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const fieldSpacing = isMobile ? 2.5 : 3;

  const minDate = role === "admin" ? null : dayjs().add(2, "day");
  const maxDate = null;

  const blockTyping = (e) => e.preventDefault();

  const isPhoneInvalid =
    isTouched("phoneNumber") &&
    !/^((04\d{8})|(614\d{8})|(0[2378]\d{8}))$/.test(formData.phoneNumber || "");

  // Switching between Auxiliary and Jamaat clears the other side's selections
  const handleOrganisationType = (_, value) => {
    if (!value || value === formData.organisationType) return;
    setFormData((prev) => ({
      ...prev,
      organisationType: value,
      auxiliaries: [],
      majlisNames: [],
      jamaatNames: [],
    }));
    setTouched((prev) => ({
      ...prev,
      auxiliaries: false,
      majlisNames: false,
      jamaatNames: false,
    }));
  };

  // No "reset touched" effect needed any more: the parent remounts this
  // component on every step change, so touched state starts fresh each time.

  return (
    <Box>
      {/* ───────────── STEP 1: ABOUT YOU ───────────── */}
      {show("about") && (
        <>
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
            error={isTouched("fullName") && !formData.fullName}
            helperText={
              isTouched("fullName") && !formData.fullName
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
            helperText={
              isPhoneInvalid ? "Enter a valid phone number" : undefined
            }
            sx={{ mb: fieldSpacing }}
          />

          {/* Auxiliary / Jamaat */}
          <Box sx={{ mb: fieldSpacing }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                mb: 1,
                color:
                  showErrors && !formData.organisationType
                    ? "error.main"
                    : "text.secondary",
              }}
            >
              Booking on behalf of *
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              color="primary"
              value={formData.organisationType || ""}
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

          {formData.organisationType === "auxiliary" && (
            <>
              <MultiSelectField
                label="Auxiliary (Select Multiple)"
                options={AUXILIARIES}
                value={formData.auxiliaries || []}
                onChange={handleChange("auxiliaries")}
                onBlur={() => markTouched("auxiliaries")}
                error={isTouched("auxiliaries") && !formData.auxiliaries?.length}
                helperText={
                  isTouched("auxiliaries") && !formData.auxiliaries?.length
                    ? "Select at least one auxiliary"
                    : undefined
                }
                sx={{ mb: fieldSpacing }}
              />

              <MultiSelectField
                label="Majlis Name (Select Multiple)"
                options={MAJLIS_OPTIONS}
                value={formData.majlisNames || []}
                onChange={handleChange("majlisNames")}
                onBlur={() => markTouched("majlisNames")}
                error={isTouched("majlisNames") && !formData.majlisNames?.length}
                helperText={
                  isTouched("majlisNames") && !formData.majlisNames?.length
                    ? "Select at least one majlis"
                    : undefined
                }
                sx={{ mb: fieldSpacing }}
              />
            </>
          )}

          {formData.organisationType === "jamaat" && (
            <MultiSelectField
              label="Jamaat Name (Select Multiple)"
              options={JAMAAT_OPTIONS}
              value={formData.jamaatNames || []}
              onChange={handleChange("jamaatNames")}
              onBlur={() => markTouched("jamaatNames")}
              error={isTouched("jamaatNames") && !formData.jamaatNames?.length}
              helperText={
                isTouched("jamaatNames") && !formData.jamaatNames?.length
                  ? "Select at least one jamaat"
                  : undefined
              }
              sx={{ mb: fieldSpacing }}
            />
          )}
        </>
      )}

      {/* ───────────── STEP 2: WHEN AND WHERE ───────────── */}
      {show("when") && (
        <>
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
              const newDate = val ? val.format("YYYY-MM-DD") : "";
              setFormData((prev) => {
                const next = { ...prev, date: newDate };
                // If the repeat-until date is now on/before the start, push it out
                if (
                  newDate &&
                  prev.isRecurring &&
                  prev.endDate &&
                  !dayjs(prev.endDate).isAfter(dayjs(newDate))
                ) {
                  next.endDate = dayjs(newDate)
                    .add(1, "month")
                    .format("YYYY-MM-DD");
                }
                return next;
              });
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
                error: isTouched("date") && !formData.date,
                helperText:
                  isTouched("date") && !formData.date
                    ? "Date is required"
                    : role === "admin"
                      ? "Admin Mode: No date restrictions applied"
                      : "Bookings must be made at least 2 days in advance",
                InputProps: { readOnly: true },
                onKeyDown: (e) => e.preventDefault(),
              },
            }}
          />

          {/* Times */}
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
                  dayjs(formData.toTime, "HH:mm").isBefore(
                    dayjs(newFrom, "HH:mm"),
                  )
                ) {
                  handleChange("toTime")(null);
                }
              }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: isTouched("fromTime") && !formData.fromTime,
                  helperText:
                    isTouched("fromTime") && !formData.fromTime
                      ? "Required"
                      : undefined,
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
                  error: isTouched("toTime") && !formData.toTime,
                  helperText:
                    isTouched("toTime") && !formData.toTime
                      ? "Required"
                      : undefined,
                  InputProps: { readOnly: true },
                  onKeyDown: blockTyping,
                },
              }}
            />
          </Box>

          {/* --- RECURRING BOOKING (now above Locations, since it affects availability) --- */}
          <Box
            sx={{
              mb: fieldSpacing,
              p: 2,
              bgcolor: "grey.50",
              borderRadius: 2,
              border: "1px dashed",
              borderColor: "divider",
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isRecurring || false}
                  disabled={!formData.date}
                  onChange={(e) => {
                    handleChange("isRecurring")(e.target.checked);
                    if (e.target.checked) {
                      handleChange("recurrenceType")("weekly"); // Default
                      // Default end date: 1 month after the start date
                      const defaultEnd = dayjs(formData.date)
                        .add(1, "month")
                        .format("YYYY-MM-DD");
                      handleChange("endDate")(defaultEnd);
                    }
                  }}
                />
              }
              label={
                <Typography sx={{ fontWeight: 600 }}>
                  Recurring Event?
                </Typography>
              }
            />
            {!formData.date && (
              <FormHelperText sx={{ ml: 0 }}>
                Choose a date first to set up a recurring booking.
              </FormHelperText>
            )}

            {formData.isRecurring && (
              <Box
                sx={{
                  mt: 2,
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: 2,
                }}
              >
                <FormControl fullWidth size="small">
                  <InputLabel>Frequency</InputLabel>
                  <Select
                    value={formData.recurrenceType || "weekly"}
                    label="Frequency"
                    onChange={(e) =>
                      handleChange("recurrenceType")(e.target.value)
                    }
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>

                <DatePicker
                  label="Repeat Until"
                  format="DD-MM-YYYY"
                  value={formData.endDate ? dayjs(formData.endDate) : null}
                  minDate={dayjs(formData.date).add(1, "day")} // Cannot end before/on start date
                  maxDate={dayjs(formData.date).add(6, "month")}
                  onChange={(val) =>
                    handleChange("endDate")(
                      val ? val.format("YYYY-MM-DD") : "",
                    )
                  }
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small",
                      error: showErrors && !formData.endDate,
                      helperText:
                        showErrors && !formData.endDate
                          ? "Choose an end date"
                          : "Up to 6 months in advance",
                    },
                  }}
                />
              </Box>
            )}
          </Box>

          {/* Locations */}
          <FormControl
            fullWidth
            required
            error={isTouched("locations") && formData.locations.length === 0}
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
              {isTouched("locations") && formData.locations.length === 0
                ? "Select at least one location"
                : "Only available locations will show for the date/time you have selected"}
            </FormHelperText>

            {formData.locations.some((loc) =>
              conflictedLocations.some((c) => c.location === loc),
            ) && (
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: "bold", mb: 1 }}
                >
                  Booking Conflict Detected:
                </Typography>

                {(() => {
                  // Pivot the data: date -> set of locations
                  const dateMap = {};

                  conflictedLocations
                    .filter((c) => formData.locations.includes(c.location))
                    .forEach((c) => {
                      c.dates.forEach((date) => {
                        if (!dateMap[date]) dateMap[date] = new Set();
                        dateMap[date].add(c.location);
                      });
                    });

                  const sortedDates = Object.keys(dateMap).sort();

                  return (
                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                      {sortedDates.map((date) => (
                        <li key={date} style={{ marginBottom: "12px" }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: "error.main" }}
                          >
                            {dayjs(date).format("dddd, MMMM D, YYYY")}:
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 0.5,
                              mt: 0.5,
                            }}
                          >
                            {Array.from(dateMap[date]).map((loc) => (
                              <Chip
                                key={loc}
                                label={loc}
                                size="small"
                                color="error"
                                variant="outlined"
                                sx={{ fontWeight: 500 }}
                              />
                            ))}
                          </Box>
                        </li>
                      ))}
                    </Box>
                  );
                })()}
              </Alert>
            )}
          </FormControl>
        </>
      )}

      {/* ───────────── STEP 3: EVENT DETAILS ───────────── */}
      {show("event") && (
        <>
          <TextField
            label="Event Name"
            required
            fullWidth
            multiline
            rows={isMobile ? 3 : 2}
            sx={{ mb: fieldSpacing }}
            value={formData.eventName || ""}
            onChange={(e) => handleChange("eventName")(e.target.value)}
            onBlur={() => markTouched("eventName")}
            inputProps={{ maxLength: 20 }}
            error={
              isTouched("eventName") &&
              (!formData.eventName || formData.eventName.trim() === "")
            }
            helperText={
              isTouched("eventName") &&
              (!formData.eventName || formData.eventName.trim() === "")
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
                handleChange("expectedPeople")(
                  e.target.value.replace(/\D/g, ""),
                )
              }
              onBlur={() => markTouched("expectedPeople")}
              error={isTouched("expectedPeople") && !formData.expectedPeople}
              helperText={
                isTouched("expectedPeople") && !formData.expectedPeople
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
              error={isTouched("expectedCars") && !formData.expectedCars}
              helperText={
                isTouched("expectedCars") && !formData.expectedCars
                  ? "Required"
                  : undefined
              }
            />
          </Box>
        </>
      )}
    </Box>
  );
}