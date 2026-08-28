import React from "react";
import { Box, Paper, Typography } from "@mui/material";

export default function StatCard({ icon, label, value, color = "primary" }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.25,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        gap: 1.75,
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2.5,
          bgcolor: `${color}.main`,
          opacity: 0.9,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          "& svg": { color: "white", fontSize: 22 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
      </Box>
    </Paper>
  );
}
