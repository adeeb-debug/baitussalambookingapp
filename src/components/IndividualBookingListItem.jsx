import React from "react";
import {
  ListItem,
  ListItemText,
  Typography,
  Box,
  Button,
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

export default function IndividualBookingListItem({
  booking,
  handleIndividualAction,
  isActionLoading,
}) {
  const theme = useTheme();

  const statusColor = {
    Pending: theme.palette.secondary.main,
    Approved: theme.palette.success.main,
    Rejected: theme.palette.error.main,
    Cancelled: theme.palette.grey[500],
  };

  const displayActions = booking.status === "Pending";

  return (
    <ListItem
      disableGutters
      sx={{
        pl: 1,
        py: 0.5,
        mb: 0.5,
        bgcolor: "white",
        borderLeft: `3px solid ${
          statusColor[booking.status] || theme.palette.grey[400]
        }`,
        borderRadius: 0.5,
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <ListItemText
        primary={booking.location}
        secondary={
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: statusColor[booking.status],
            }}
          >
            Status: {booking.status}
          </Typography>
        }
      />

      {displayActions && (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Button
            size="small"
            color="success"
            variant="outlined"
            onClick={() =>
              handleIndividualAction(booking.id, "Approved")
            }
            disabled={isActionLoading}
          >
            {isActionLoading ? (
              <CircularProgress size={16} />
            ) : (
              "Approve"
            )}
          </Button>

          <Button
            size="small"
            color="error"
            variant="outlined"
            onClick={() =>
              handleIndividualAction(booking.id, "Rejected")
            }
            disabled={isActionLoading}
          >
            {isActionLoading ? (
              <CircularProgress size={16} />
            ) : (
              "Reject"
            )}
          </Button>
        </Box>
      )}
    </ListItem>
  );
}
