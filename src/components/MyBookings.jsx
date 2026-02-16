import { useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItem,
  Chip,
  Divider,
  Container,
  Stack,
  Paper
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import EventIcon from "@mui/icons-material/Event";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import AccountTreeIcon from "@mui/icons-material/AccountTree";

/** Helper functions */
const getStatusIcon = (status) => {
  switch (status) {
    case "Approved": return <CheckCircleOutlineIcon />;
    case "Pending":
    case "In Review": return <WarningAmberIcon />;
    case "Rejected":
    case "Cancelled": return <CancelOutlinedIcon />;
    case "Partially Approved": return <AccountTreeIcon />;
    default: return null;
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case "Approved": return "success";
    case "Pending":
    case "In Review": return "warning";
    case "Rejected":
    case "Cancelled": return "error";
    case "Partially Approved": return "secondary";
    default: return "default";
  }
};

const calculateGroupStatus = (bookings) => {
  const statuses = bookings.map(b => b.status);
  const totalCount = statuses.length;

  const isPending = statuses.some(s => s === "Pending");
  const isApproved = statuses.some(s => s === "Approved");
  const isRejectedOrCancelled = statuses.some(s => s === "Rejected" || s === "Cancelled");

  const approvedCount = statuses.filter(s => s === "Approved").length;
  const rejectedCount = statuses.filter(s => s === "Rejected" || s === "Cancelled").length;

  if (isPending) return "In Review"; 
  if (approvedCount === totalCount) return "Approved";
  if (rejectedCount === totalCount) return "Rejected";
  if (isApproved && isRejectedOrCancelled) return "Partially Approved";

  return "In Review"; 
};

export default function MyBookings({ user, bookings, loading }) {

  const groupedUserBookings = useMemo(() => {
    if (!user || !bookings) return [];

    const userBookings = bookings.filter(b => b.requestedByEmail === user.email);
    const grouped = {};

    userBookings.forEach(b => {
      const groupId = b.groupId || "no_group_" + b.id;
      if (!grouped[groupId]) {
        grouped[groupId] = {
          groupId,
          eventName: b.eventName,
          requestedByName: b.requestedByName,
          date: b.date,
          fromTime: b.fromTime,
          toTime: b.toTime,
          phoneNumber: b.phoneNumber,
          bookings: [],
          rejectionReason: null
        };
      }
      grouped[groupId].bookings.push(b);
      if (b.status === "Rejected" && !grouped[groupId].rejectionReason) {
        grouped[groupId].rejectionReason = b.rejectionReason;
      }
    });

    Object.values(grouped).forEach(group => {
      group.status = calculateGroupStatus(group.bookings);
    });

    return Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [user, bookings]);

  if (!user) {
    return (
      <Box sx={{ mt: 4, px: { xs: 2, sm: 3 }, width: '100%' }}>
        <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
          Please Sign In to view your booking requests.
        </Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ pb: 4, px: { xs: 2, sm: 3 } }}>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          color: "primary.main",
          mt: 3,
          mb: 3,
          borderBottom: "2px solid",
          borderColor: "divider",
          pb: 1,
          fontSize: { xs: '1.25rem', sm: '1.5rem' }
        }}
      >
        My Bookings
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
          <CircularProgress size={32} />
        </Box>
      ) : groupedUserBookings.length === 0 ? (
        <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
          You have no active or recent booking requests.
        </Alert>
      ) : (
        <List sx={{ display: "flex", flexDirection: "column", gap: 3, p: 0 }}>
          {groupedUserBookings.map(group => {
            const statusColor = getStatusColor(group.status);

            return (
              <ListItem key={group.groupId} disablePadding>
                <Paper
                  sx={{
                    p: { xs: 2, sm: 3 },
                    borderRadius: 3,
                    bgcolor: "white",
                    boxShadow: 2,
                    width: "100%",
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    gap: { xs: 2, md: 0 },
                    borderLeft: 4,
                    borderColor: `${statusColor}.main`
                  }}
                >
                  {/* Left: Event Info */}
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
                        <EventIcon color="primary" fontSize="small" />
                        {group.eventName || "Unnamed Event"}
                      </Typography>

                      {/* Mobile Status */}
                      <Chip
                        icon={getStatusIcon(group.status)}
                        label={group.status}
                        color={statusColor}
                        size="small"
                        sx={{ display: { xs: "flex", md: "none" }, fontWeight: 600 }}
                      />
                    </Stack>

                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <AccessTimeIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {group.date} | {group.fromTime} - {group.toTime}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PhoneIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                        <Typography variant="body2" color="text.secondary">
                          {group.phoneNumber}
                        </Typography>
                      </Stack>
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, fontSize: '0.75rem', color: "text.secondary", textTransform: 'uppercase' }}>
                      Locations ({group.bookings.length})
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {group.bookings.map(b => (
                        <Chip
                          key={b.id}
                          label={`${b.location}: ${b.status}`}
                          variant="outlined"
                          size="small"
                          color={getStatusColor(b.status)}
                          sx={{ fontWeight: 600, fontSize: '0.7rem', mb: 0.5 }}
                        />
                      ))}
                    </Stack>
                  </Box>

                  {/* Right: Desktop Status & Feedback */}
                  <Box sx={{ width: { xs: "100%", md: 200 }, mt: { xs: 2, md: 0 } }}>
                    <Box sx={{ display: { xs: "none", md: "block" }, mb: group.rejectionReason ? 1 : 0 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                        OVERALL STATUS
                      </Typography>
                      <Chip
                        icon={getStatusIcon(group.status)}
                        label={group.status}
                        color={statusColor}
                        sx={{ width: "100%", mt: 0.5, fontWeight: 700 }}
                      />
                    </Box>

                    {group.rejectionReason && (
                      <Alert severity="error" icon={false} sx={{ mt: 1, py: 0.5, px: 1.5, borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, display: 'block' }}>
                          ADMIN FEEDBACK:
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                          "{group.rejectionReason}"
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                </Paper>
              </ListItem>
            );
          })}
        </List>
      )}
    </Container>
  );
}
