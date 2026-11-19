import React, { useState, useMemo, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import {
  Paper, Box, Typography, useMediaQuery, useTheme,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack
} from '@mui/material';
import { AccessTime, LocationOn, Person, EventNote } from '@mui/icons-material';

/**
 * Normalizes date strings for FullCalendar.
 * Supports both "DD-MM-YYYY" and ISO "YYYY-MM-DD".
 */
const formatForCalendar = (dateStr) => {
  if (!dateStr) return '';
  // If already ISO format (YYYY-MM-DD), return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  // Fallback for old format (DD-MM-YYYY)
  const [day, month, year] = dateStr.split('-');
  return `${year}-${month}-${day}`;
};

/**
 * Combines a date and an "HH:mm" time into an ISO datetime string.
 * Falls back to the date alone (all-day) if the time isn't HH:mm.
 */
const withTime = (date, time) =>
  /^\d{1,2}:\d{2}$/.test(time || '')
    ? `${formatForCalendar(date)}T${time.padStart(5, '0')}`
    : formatForCalendar(date);

// Centralized status colors for Legend and Events
const STATUS_COLORS = {
  Approved: '#2e7d32', // Green
  Pending: '#ed6c02',  // Orange
  Rejected: '#d32f2f', // Red
};

export default function Calendar({ bookings }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const calendarRef = useRef(null);

  // State for the Detail Dialog
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Switch between list (mobile) and month grid (desktop) when screen size changes
  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api) api.changeView(isMobile ? 'listMonth' : 'dayGridMonth');
  }, [isMobile]);

  // "Explode" the bookings into individual occurrences
  const events = useMemo(() => {
    const allEvents = [];

    (bookings || []).forEach((b) => {
      // Use allDates if it exists, otherwise fall back to the single date
      const datesToShow = b.allDates && b.allDates.length > 0 ? b.allDates : [b.date];
      const locationText = Array.isArray(b.locations)
        ? b.locations.filter(Boolean).join(', ')
        : (b.location || '');
      const color = STATUS_COLORS[b.status] || STATUS_COLORS.Pending;

      datesToShow.forEach((occurrenceDate) => {
        allEvents.push({
          // Unique ID for each occurrence on the calendar
          id: `${b.bookingId || b.id}-${occurrenceDate}`,
          title: b.eventName || 'Untitled',
          start: withTime(occurrenceDate, b.fromTime),
          end: b.toTime ? withTime(occurrenceDate, b.toTime) : undefined,
          display: 'block', // keeps the filled-chip look in the grid
          backgroundColor: color,
          borderColor: color, // list view uses this for the colored dot
          // Pass all data to the popup
          extendedProps: {
            ...b,
            occurrenceDate,
            locationText,
          },
        });
      });
    });

    return allEvents;
  }, [bookings]);

  const handleEventClick = (info) => {
    setSelectedEvent(info.event.extendedProps);
  };

  const renderEventContent = (arg) => {
    const p = arg.event.extendedProps;

    // List view (mobile): name + location, time shows in its own column
    if (arg.view.type.startsWith('list')) {
      return (
        <div>
          <strong>{p.eventName || 'Untitled'}</strong>
          {p.locationText && (
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{p.locationText}</div>
          )}
        </div>
      );
    }

    // Grid view (desktop)
    return `${p.fromTime || ''} | ${p.eventName || 'Untitled'}`;
  };

  return (
    <Paper
      sx={{
        p: isMobile ? 2 : 4,
        borderRadius: 4,
        boxShadow: '0px 10px 30px rgba(0,0,0,0.05)',
      }}
    >
      {/* --- COLOR LEGEND --- */}
      <Stack
        direction={isMobile ? 'column' : 'row'}
        spacing={isMobile ? 1 : 4}
        sx={{
          mb: 4,
          justifyContent: 'center',
          alignItems: 'center',
          p: 2,
          bgcolor: 'rgba(0,0,0,0.02)',
          borderRadius: 2,
        }}
      >
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}
        >
          Status Legend:
        </Typography>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{status}</Typography>
          </Box>
        ))}
      </Stack>

      {/* --- CALENDAR --- */}
      <Box
        sx={{
          '& .fc-header-toolbar': {
            mb: 3,
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1,
          },
          '& .fc-toolbar-title': {
            fontSize: isMobile ? '1.1rem' : '1.5rem',
            fontWeight: 700,
          },
          '& .fc-button': {
            bgcolor: 'primary.main',
            border: 'none',
            borderRadius: 2,
            fontWeight: 600,
          },
          '& .fc-button:hover': { bgcolor: 'primary.dark' },
          '& .fc-event': {
            cursor: 'pointer',
            p: 0.5,
            borderRadius: '4px',
            fontSize: '0.8rem',
            border: 'none',
          },
          '& .fc-daygrid-event-h-hard': { mb: '2px' },

          // --- List view (mobile) tweaks ---
          '& .fc-list': { border: 'none' },
          '& .fc-list-day-cushion': { bgcolor: 'rgba(0,0,0,0.04)', fontWeight: 700 },
          '& .fc-list-event': { cursor: 'pointer' },
          '& .fc-list-event td': { py: 1.25 },
          '& .fc-list-event-time': { whiteSpace: 'nowrap', fontWeight: 600 },
          '& .fc-list-empty': { bgcolor: 'transparent', py: 4 },
        }}
      >
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, listPlugin]}
          initialView={isMobile ? 'listMonth' : 'dayGridMonth'}
          headerToolbar={
            isMobile
              ? { left: 'prev,next', center: 'title', right: 'today' }
              : { left: 'prev,next today', center: 'title', right: '' }
          }
          events={events}
          height="auto"
          eventClick={handleEventClick}
          eventContent={renderEventContent}
            eventDidMount={(info) => {
    info.el.title = `${info.event.extendedProps.fromTime} | ${info.event.title}`;
  }}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          views={{
            dayGridMonth: { displayEventTime: false },
            listMonth: { displayEventTime: true },
          }}
          dayMaxEvents={3}
          noEventsContent="No bookings this month"
        />
      </Box>

      {/* --- EVENT DETAIL DIALOG --- */}
      <Dialog
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle
          sx={{
            bgcolor: STATUS_COLORS[selectedEvent?.status] || 'primary.main',
            color: 'white',
            fontWeight: 700,
          }}
        >
          {selectedEvent?.eventName}
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AccessTime color="action" />
              <Typography>
                <strong>Time:</strong> {selectedEvent?.fromTime} - {selectedEvent?.toTime}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <LocationOn color="action" sx={{ mt: 0.3 }} />
              <Box>
                <Typography><strong>Location(s):</strong></Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedEvent?.locationText}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Person color="action" />
              <Typography>
                <strong>Requested By:</strong>{' '}
                {selectedEvent?.requestedByName || selectedEvent?.fullName || 'N/A'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <EventNote color="action" />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography><strong>Status:</strong></Typography>
                <Typography
                  variant="caption"
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 10,
                    fontWeight: 800,
                    bgcolor: `${STATUS_COLORS[selectedEvent?.status]}22`, // ~13% opacity
                    color: STATUS_COLORS[selectedEvent?.status],
                    border: `1px solid ${STATUS_COLORS[selectedEvent?.status]}`,
                  }}
                >
                  {selectedEvent?.status?.toUpperCase()}
                </Typography>
              </Box>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setSelectedEvent(null)}
            variant="contained"
            fullWidth
            sx={{ borderRadius: 2 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}