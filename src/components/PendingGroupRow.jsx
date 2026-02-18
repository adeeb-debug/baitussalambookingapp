import React, { useState } from "react";
import {
  TableRow,
  TableCell,
  Typography,
  IconButton,
  Box,
  Button,
  Collapse,
  Divider,
  List,
    Stack,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  ExpandMore,
  ChevronRight,
  CheckCircleOutline,
  CancelOutlined,
  InfoOutlined,
  People,
  DirectionsCar,
  Send, // Added for the email button
  MarkEmailRead, // Added for the notified state
  DeleteOutline,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import IndividualBookingListItem from "./IndividualBookingListItem";

export default function PendingGroupRow({
  group,
  handleGroupAction,
  handleIndividualAction,
  handleSendEmail, // New prop from AdminPanel
  handleDeleteBooking,
  individualActionLoadingId,
  groupActionLoadingId,
  isAdmin,
  
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  // LOGIC: Check counts
  const pendingCount = group.bookings.filter((b) => b.status === "Pending").length;
  
  // LOGIC: Is every single booking in this group processed?
  const isProcessComplete = group.bookings.every(
    (b) => b.status !== "Pending"
  );

  // LOGIC: Has the user already been emailed?
  // (Assuming you've updated your database schema as discussed previously)
  const isAlreadyNotified = group.bookings.some((b) => b.userNotified === true);

  const isGroupLoading = groupActionLoadingId === group.groupId;

  return (
    <>
      <TableRow hover>
        <TableCell>
          <IconButton onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandMore /> : <ChevronRight />}
          </IconButton>
        </TableCell>

                <TableCell>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography fontWeight={600}>
              {group.bookingId}
            </Typography>
          </Box>
        </TableCell>

        <TableCell>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography fontWeight={600}>
              {group.eventName || "Unnamed Event"}
            </Typography>
          </Box>
        </TableCell>

        <TableCell>
          <Typography fontWeight={700}>{group.date}</Typography>
          <Typography variant="caption">
            {group.fromTime} - {group.toTime}
          </Typography>
        </TableCell>

        <TableCell>
          {group.requestedByName || "N/A"}
        </TableCell>

        <TableCell>{group.phoneNumber || "N/A"}</TableCell>

        <TableCell align="center">
          <People fontSize="small" /> {group.expectedPeople || 0}
          <br />
          <DirectionsCar fontSize="small" /> {group.expectedCars || 0}
        </TableCell>

        <TableCell align="center">
          {pendingCount} Pending / {group.bookings.length}
        </TableCell>
{isAdmin && (
        <TableCell>
    <Stack direction="row" spacing={1} alignItems="center">
      {/* --- EXISTING LOGIC: PENDING ACTIONS OR NOTIFY --- */}
      {pendingCount > 0 ? (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            size="small"
            color="success"
            variant="contained"
            onClick={() => handleGroupAction(group, "Approved")}
            disabled={isGroupLoading}
          >
            <CheckCircleOutline fontSize="small" />
          </Button>
          <Button
            size="small"
            color="error"
            variant="contained"
            onClick={() => handleGroupAction(group, "Rejected")}
            disabled={isGroupLoading}
          >
            <CancelOutlined fontSize="small" />
          </Button>
        </Box>
      ) : isProcessComplete && !isAlreadyNotified ? (
        <Button
          size="small"
          color="info"
          variant="contained"
          startIcon={<Send />}
          onClick={() => handleSendEmail(group)}
          disabled={isGroupLoading}
          sx={{ whiteSpace: 'nowrap' }}
        >
          {isGroupLoading ? "Sending..." : "Notify"}
        </Button>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main', gap: 0.5 }}>
          <MarkEmailRead fontSize="small" />
          <Typography variant="caption" fontWeight={700}>Notified</Typography>
        </Box>
      )}

      {/* --- NEW: DELETE BUTTON (Always visible for Admin) --- */}
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      
      <Tooltip title="Delete Entire Booking">
        <IconButton
          size="small"
          color="error"
          onClick={() => handleDeleteBooking(group)}
          disabled={individualActionLoadingId === group}
        >
          {individualActionLoadingId === group.groupId ? ( 
            <CircularProgress size={20} color="inherit" />
          ) : (
            <DeleteOutline fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
    </Stack>
        </TableCell>
)}
      </TableRow>

      <TableRow>
        <TableCell colSpan={8} sx={{ p: 0 }}>
          <Collapse in={expanded}>
            <Box sx={{ p: 2, bgcolor: theme.palette.grey[50] }}>
              <Typography variant="subtitle2">
                <InfoOutlined fontSize="small" /> Locations
              </Typography>
              <Divider sx={{ my: 1 }} />
              <List disablePadding>
                {group.bookings.map((booking) => (
                  <IndividualBookingListItem
                    key={booking.id}
                    booking={booking}
                    handleIndividualAction={handleIndividualAction}
                    isActionLoading={
                      individualActionLoadingId === booking.id
                    }
                  />
                ))}
              </List>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}