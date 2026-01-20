import React from "react";
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  useMediaQuery,
  useTheme
} from "@mui/material";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { JAMAAT_OPTIONS } from "../utils/constants";

export default function BookingFormFields({
  formData,
  setFormData,
  availableLocations
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleChange = (field) => (value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const fieldSpacing = isMobile ? 2.5 : 3;

  // ✅ Date constraints
  const minDate = dayjs().add(2, "day");
  const maxDate = dayjs().add(2, "month");

    const blockTyping = (e) => {
    e.preventDefault();
  };

  return (
    <Box>
      <TextField
        label="Full Name"
        fullWidth
        sx={{ mb: fieldSpacing }}
        value={formData.fullName}
        onChange={(e) => handleChange("fullName")(e.target.value)}
      />

<TextField
  label="Phone Number"
  placeholder="04XXXXXXXX"
  fullWidth
  value={formData.phoneNumber}
  onChange={(e) => {
    // 1️⃣ Remove anything that is not a digit
    const digitsOnly = e.target.value.replace(/\D/g, "");

    handleChange("phoneNumber")(digitsOnly);
  }}
  inputProps={{
    inputMode: "numeric",   // 📱 mobile numeric keyboard
    pattern: "[0-9]*",
    maxLength: 12           // enough for 614XXXXXXXX
  }}
  error={
    formData.phoneNumber.length > 0 &&
    !/^((04\d{8})|(614\d{8})|(0[2378]\d{8}))$/.test(formData.phoneNumber)
  }
  helperText={
    formData.phoneNumber.length > 0 &&
    !/^((04\d{8})|(614\d{8})|(0[2378]\d{8}))$/.test(formData.phoneNumber)
      ? "Enter a valid phone number"
      : " "
  }
/>


      <FormControl fullWidth sx={{ mb: fieldSpacing }}>
        <InputLabel>Jamaat</InputLabel>
        <Select
          value={formData.jamaat}
          label="Jamaat"
          onChange={(e) => handleChange("jamaat")(e.target.value)}
        >
          {JAMAAT_OPTIONS.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* ✅ DATE PICKER WITH ALL RULES APPLIED */}
      <DatePicker
        label="Date"
        format="DD-MM-YYYY"
        value={formData.date ? dayjs(formData.date, "DD-MM-YYYY") : null}
        minDate={minDate}
        maxDate={maxDate}
        disablePast
        onChange={(val) =>
          handleChange("date")(val ? val.format("DD-MM-YYYY") : "")
        }
        slotProps={{
          textField: {
            fullWidth: true,
            sx: { mb: fieldSpacing },
            inputProps: {
              readOnly: true // 🚫 disables manual typing
            },
            helperText: "Bookings must be made at least 2 days in advance"
          }
        }}
      />

      <Box sx={{ display: "flex", gap: 2, mb: fieldSpacing }}>
        
        <TimePicker
          label="From"
          format="HH:mm"
          value={formData.fromTime ? dayjs(formData.fromTime, "HH:mm") : null}
          onChange={(val) =>
            handleChange("fromTime")(val ? val.format("HH:mm") : "")
          }
          slotProps={{
            textField: {
              fullWidth: true,
                          onKeyDown: blockTyping,
            onPaste: blockTyping,
              InputProps: { readOnly: true } // optional, keeps UX consistent
            }
          }}
        />
        <TimePicker
          label="To"
          format="HH:mm"
          value={formData.toTime ? dayjs(formData.toTime, "HH:mm") : null}
          onChange={(val) =>
            handleChange("toTime")(val ? val.format("HH:mm") : "")
          }
          slotProps={{
            textField: {
              fullWidth: true,
                          onKeyDown: blockTyping,
            onPaste: blockTyping,
              InputProps: { readOnly: true }
            }
          }}
        />
      </Box>

      <FormControl fullWidth sx={{ mb: fieldSpacing }}>
        <InputLabel>Location (Select Multiple)</InputLabel>
        <Select
          multiple
          value={formData.locations}
          onChange={(e) => handleChange("locations")(e.target.value)}
          label="Location (Select Multiple)"
          renderValue={(selected) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selected.map((value) => (
                <Chip
                  key={value}
                  label={value}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
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
      </FormControl>

      <TextField
        label="Event Name"
        fullWidth
        multiline
        rows={isMobile ? 3 : 2}
        sx={{ mb: fieldSpacing }}
        value={formData.eventName}
        onChange={(e) => handleChange("eventName")(e.target.value)}
      />

      <Box sx={{ display: "flex", gap: 2, mb: isMobile ? 2 : 4 }}>
        <TextField
          label="People"
          type="number"
          fullWidth
          value={formData.expectedPeople}
          onChange={(e) =>
            handleChange("expectedPeople")(e.target.value.replace(/\D/g, ""))
          }
        />
        <TextField
          label="Cars"
          type="number"
          fullWidth
          value={formData.expectedCars}
          onChange={(e) =>
            handleChange("expectedCars")(e.target.value.replace(/\D/g, ""))
          }
        />
      </Box>
    </Box>
  );
}
