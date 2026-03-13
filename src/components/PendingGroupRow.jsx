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
  Send,
  DeleteOutline,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import BookingsListForMyBookings from "./BookingsListForMyBookings";
import dayjs from "dayjs";

export default function PendingGroupRow({
  group,
  handleGroupAction,
  handleIndividualAction,
  handleSendEmail,
  handleDeleteBooking,
  individualActionLoadingId,
  groupActionLoadingId,
  role,
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const pendingCount = group.bookings.filter((b) => b.status === "Pending").length;
  const isProcessComplete = group.bookings.every((b) => b.status !== "Pending");
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
          <Typography fontWeight={600}>{group.bookingId}</Typography>
        </TableCell>

        <TableCell>
          <Typography fontWeight={600}>{group.eventName || "Unnamed Event"}</Typography>
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

        {/* --- ADMIN ACTION COLUMN --- */}
        {role === "admin" ? (
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
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
                <Button
                  size="small"
                  color={isAlreadyNotified ? "info" : "success"}
                  variant={isAlreadyNotified ? "outlined" : "contained"}
                  startIcon={<Send />}
                  onClick={() => handleSendEmail(group)}
                  disabled={isGroupLoading}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  {isGroupLoading
                    ? "Sending..."
                    : isAlreadyNotified
                    ? "Resend Email"
                    : "Email Organiser"}
                </Button>
              ) : null}

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
        ) : (
          /* Non-admin placeholder to keep table aligned */
          <TableCell />
        )}

        <TableCell align="center">
          <Typography variant="body2" sx={{ fontWeight: 500, color: "text.secondary" }}>
            {group.bookings[0]?.actionByName || "-"}
          </Typography>
          {group.bookings[0]?.actionAt && (
            <Typography variant="caption" sx={{ display: "block", color: "text.disabled", fontSize: "10px" }}>
              {dayjs(group.bookings[0].actionAt).format("DD/MM/YYYY")}
            </Typography>
          )}
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={10} sx={{ p: 0 }}>
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
                    role={role}
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