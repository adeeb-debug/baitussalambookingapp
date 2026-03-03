import { useState } from "react";
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
  DeleteOutline,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import BookingsListForMyBookings from "./BookingsListForMyBookings";
import dayjs from "dayjs";

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
  const pendingCount = group.bookings.filter(
    (b) => b.status === "Pending",
  ).length;

  // LOGIC: Is every single booking in this group processed?
  const isProcessComplete = group.bookings.every((b) => b.status !== "Pending");

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
            <Typography fontWeight={600}>{group.bookingId}</Typography>
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
          <Typography fontWeight={700}>
            {group.date ? dayjs(group.date).format("DD/MM/YYYY") : "N/A"}
          </Typography>
          <Typography variant="caption">
            {group.fromTime} - {group.toTime}
          </Typography>
        </TableCell>

        <TableCell>{group.requestedByName || "N/A"}</TableCell>

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
              {/* 1. Show Approve/Reject if anything is still Pending */}
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
              ) : isProcessComplete ? (
                /* 2. When process is complete, show BOTH status and Button */
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  {isAlreadyNotified && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        color: "success.main",
                        gap: 0.5,
                      }}
                    ></Box>
                  )}

                  {isAlreadyNotified && (
                    <Button
                      size="small"
                      color="info"
                      variant="outlined" // Outlined looks better for "secondary" actions like resending
                      startIcon={<Send />}
                      onClick={() => handleSendEmail(group)}
                      disabled={isGroupLoading}
                    >
                      {isGroupLoading ? "Sending..." : "Resend Email"}
                    </Button>
                  )}
                </Box>
              ) : null}

              {/* --- DELETE BUTTON (Always visible for Admin) --- */}
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

              <Tooltip title="Delete Entire Booking">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteBooking(group)}
                  disabled={individualActionLoadingId === group.groupId}
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

        <TableCell align="center">
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, color: "text.secondary" }}
          >
            {group.bookings[0]?.actionByName || "-"}
          </Typography>
          {group.bookings[0]?.actionAt && (
            <Typography
              variant="caption"
              sx={{
                display: "block",
                color: "text.disabled",
                fontSize: "10px",
              }}
            >
              {dayjs(group.bookings[0].actionAt).format("DD/MM/YYYY")}
            </Typography>
          )}
        </TableCell>
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
                  <BookingsListForMyBookings
                    key={booking.id}
                    booking={booking}
                    handleIndividualAction={handleIndividualAction}
                    isActionLoading={individualActionLoadingId === booking.id}
                    isAdmin={isAdmin}
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
