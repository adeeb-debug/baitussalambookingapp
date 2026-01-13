import React from "react";
import { Box, TextField, FormControl, InputLabel, Select, MenuItem, Chip, useMediaQuery, useTheme } from "@mui/material";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { JAMAAT_OPTIONS } from "../utils/constants";

export default function BookingFormFields({ formData, setFormData, availableLocations }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleChange = (field) => (value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Shared styles for a cleaner look
  const fieldSpacing = isMobile ? 2.5 : 3;

  return (
    <Box>
      <TextField
        label="Full Name"
        fullWidth
        // ✅ Removed size="small" for better mobile touch targets
        sx={{ mb: fieldSpacing }}
        value={formData.fullName}
        onChange={(e) => handleChange("fullName")(e.target.value)}
      />
      
      <TextField
        label="Phone Number"
        fullWidth
        sx={{ mb: fieldSpacing }}
        value={formData.phoneNumber}
        onChange={(e) => handleChange("phoneNumber")(e.target.value)}
      />

      <FormControl fullWidth sx={{ mb: fieldSpacing }}>
        <InputLabel>Jamaat</InputLabel>
        <Select
          value={formData.jamaat}
          label="Jamaat"
          onChange={(e) => handleChange("jamaat")(e.target.value)}
        >
          {JAMAAT_OPTIONS.map((name) => (
            <MenuItem key={name} value={name}>{name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <DatePicker
        label="Date"
        format="DD-MM-YYYY"
        value={formData.date ? dayjs(formData.date, "DD-MM-YYYY") : null}
        onChange={(val) => handleChange("date")(val ? val.format("DD-MM-YYYY") : "")}
        slotProps={{ 
          textField: { 
            fullWidth: true, 
            sx: { mb: fieldSpacing } 
          } 
        }}
      />

      <Box sx={{ display: "flex", gap: 2, mb: fieldSpacing }}>
        <TimePicker
          label="From"
          format="HH:mm"
          value={formData.fromTime ? dayjs(formData.fromTime, "HH:mm") : null}
          onChange={(val) => handleChange("fromTime")(val ? val.format("HH:mm") : "")}
          slotProps={{ textField: { fullWidth: true } }}
        />
        <TimePicker
          label="To"
          format="HH:mm"
          value={formData.toTime ? dayjs(formData.toTime, "HH:mm") : null}
          onChange={(val) => handleChange("toTime")(val ? val.format("HH:mm") : "")}
          slotProps={{ textField: { fullWidth: true } }}
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
            <MenuItem key={loc.id} value={loc.name}>{loc.name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Event Name"
        fullWidth
        multiline
        rows={isMobile ? 3 : 2} // ✅ More rows on mobile for easier typing
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
          onChange={(e) => handleChange("expectedPeople")(e.target.value.replace(/\D/g, ""))}
        />
        <TextField
          label="Cars"
          type="number"
          fullWidth
          value={formData.expectedCars}
          onChange={(e) => handleChange("expectedCars")(e.target.value.replace(/\D/g, ""))}
        />
      </Box>
    </Box>
  );
}