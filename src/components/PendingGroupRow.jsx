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
  Stack,
  Tooltip,
  CircularProgress,
  Chip,
  Grid,
} from "@mui/material";
import {
  ExpandMore,
  ChevronRight,
  CheckCircleOutline,
  CancelOutlined,
  People,
  DirectionsCar,
  Send,
  DeleteOutline,
  LocationOn,
  CalendarMonth,
  Notes,
  Phone,
  Home,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";

export default function PendingGroupRow({
  group,
  handleGroupAction,
  handleSendEmail,
  handleDeleteBooking,
  individualActionLoadingId,
  groupActionLoadingId,
  role,
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const isPending = group.status === "Pending";
  const isAlreadyNotified = group.userNotified === true;
  const isGroupLoading = groupActionLoadingId === group.groupId;

  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell width={50}>
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandMore /> : <ChevronRight />}
          </IconButton>
        </TableCell>

        {/* 1. Booking ID */}
        <TableCell>
          <Typography variant="body2" fontWeight={700} color="primary">
            {group.bookingId}
          </Typography>
        </TableCell>

        {/* 2. Event */}
        <TableCell>
          <Typography fontWeight={600}>{group.eventName || "Unnamed Event"}</Typography>
        </TableCell>

        {/* 3. Date / Time */}
        <TableCell>
          <Typography fontWeight={700}>
            {group.date ? dayjs(group.date).format("DD/MM/YYYY") : "N/A"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {group.fromTime} - {group.toTime}
          </Typography>
        </TableCell>

        {/* 4. Organiser */}
        <TableCell>
          <Typography variant="body2">{group.fullName || "N/A"}</Typography>
        </TableCell>

        {/* 5. Status */}
        <TableCell align="center">
          <Chip 
            label={group.status} 
            size="small"
            color={group.status === "Approved" ? "success" : group.status === "Rejected" ? "error" : "warning"}
            variant="contained"
            sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '10px' }}
          />
        </TableCell>

        {/* 6. Actions */}
        <TableCell align="center">
          <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
            {role === "admin" && (
              <>
                {isPending ? (
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Tooltip title="Approve">
                      <Button
                        size="small"
                        color="success"
                        variant="contained"
                        onClick={() => handleGroupAction(group, "Approved")}
                        disabled={isGroupLoading}
                        sx={{ minWidth: '40px' }}
                      >
                        <CheckCircleOutline fontSize="small" />
                      </Button>
                    </Tooltip>
                    <Tooltip title="Reject">
                      <Button
                        size="small"
                        color="error"
                        variant="contained"
                        onClick={() => handleGroupAction(group, "Rejected")}
                        disabled={isGroupLoading}
                        sx={{ minWidth: '40px' }}
                      >
                        <CancelOutlined fontSize="small" />
                      </Button>
                    </Tooltip>
                  </Box>
                ) : (
                  <Button
                    size="small"
                    color={isAlreadyNotified ? "info" : "success"}
                    variant={isAlreadyNotified ? "outlined" : "contained"}
                    startIcon={<Send />}
                    onClick={() => handleSendEmail(group)}
                    disabled={isGroupLoading}
                  >
                    {isGroupLoading ? "..." : isAlreadyNotified ? "Resend" : "Email"}
                  </Button>
                )}
                
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                <Tooltip title="Delete Booking">
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
              </>
            )}
          </Stack>
        </TableCell>

        {/* 7. Actioned By */}
        <TableCell align="center">
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {group.actionByName || "-"}
          </Typography>
          {group.actionAt && (
            <Typography variant="caption" sx={{ display: "block", color: "text.disabled", fontSize: "10px" }}>
              {dayjs(group.actionAt).format("DD/MM/YYYY")}
            </Typography>
          )}
        </TableCell>
      </TableRow>

      {/* --- EXPANDED DETAILS AREA --- */}
      <TableRow>
        <TableCell colSpan={8} sx={{ p: 0, borderBottom: expanded ? '1px solid rgba(224, 224, 224, 1)' : 'none' }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ p: 3, bgcolor: theme.palette.grey[50], borderLeft: `4px solid ${theme.palette.primary.main}`, m: 1, borderRadius: 1 }}>
              <Grid container spacing={3}>
                
                {/* 1. Contact & Logistics (Moved from main table) */}
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                    Contact & Logistics
                  </Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}><Phone fontSize="inherit" sx={{ mr: 1, color: 'text.secondary' }} /> {group.phoneNumber || "N/A"}</Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}><Home fontSize="inherit" sx={{ mr: 1, color: 'text.secondary' }} /> {group.jamaat || "N/A"}</Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}><People fontSize="inherit" sx={{ mr: 1, color: 'text.secondary' }} /> {group.expectedPeople || 0} People</Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}><DirectionsCar fontSize="inherit" sx={{ mr: 1, color: 'text.secondary' }} /> {group.expectedCars || 0} Cars</Box>
                  </Stack>
                </Grid>

                {/* 2. Locations */}
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', fontWeight: 700 }}>
                    <LocationOn fontSize="small" sx={{ mr: 1, color: 'primary.main' }} /> Locations
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {group.locations?.map((loc) => (
                      <Chip key={loc} label={loc} size="small" variant="outlined" />
                    )) || <Typography variant="caption">No locations specified</Typography>}
                  </Stack>
                </Grid>

                {/* 3. Dates (For Recurring) */}
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', fontWeight: 700 }}>
                    <CalendarMonth fontSize="small" sx={{ mr: 1, color: 'primary.main' }} /> All Dates
                  </Typography>
                  <Box sx={{ maxHeight: 100, overflowY: 'auto', bgcolor: 'white', p: 1, borderRadius: 1, border: '1px solid #eee' }}>
                    {group.allDates?.map((d) => (
                      <Typography key={d} variant="caption" sx={{ display: 'block' }}>
                        • {dayjs(d).format("DD/MM/YYYY")}
                      </Typography>
                    )) || <Typography variant="body2">{dayjs(group.date).format("DD/MM/YYYY")}</Typography>}
                  </Box>
                </Grid>

                {/* 4. Notes */}
                <Grid item xs={12} md={3}>
                   <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', fontWeight: 700 }}>
                    <Notes fontSize="small" sx={{ mr: 1, color: 'primary.main' }} /> Admin Notes
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: group.approverNote ? 'normal' : 'italic', bgcolor: 'white', p: 1, borderRadius: 1, border: '1px solid #eee' }}>
                    {group.approverNote || "No notes added."}
                  </Typography>
                </Grid>

              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}