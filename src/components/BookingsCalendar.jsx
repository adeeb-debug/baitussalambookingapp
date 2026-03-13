import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
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
  const [day, month, year] = dateStr.split("-");
  return `${year}-${month}-${day}`;
};

// Centralized status colors for Legend and Events
const STATUS_COLORS = {
  Approved: '#2e7d32', // Green
  Pending: '#ed6c02',  // Orange
  Rejected: '#d32f2f', // Red
};

export default function BookingsCalendar({ bookings }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  
  // State for the Detail Dialog
  const [selectedEvent, setSelectedEvent] = useState(null);

  const groupedData = (bookings || []).reduce((acc, current) => {
  const key = current.groupId; // This links your multiple locations together

  if (!acc[key]) {
    // If this is the first time seeing this groupId, initialize it
    acc[key] = {
      ...current,
      // Ensure locations is always an array for merging
      allLocations: Array.isArray(current.locations) ? [...current.locations] : [current.location]
    };
  } else {
    // If groupId exists, just merge new locations into the existing entry
    const newLocs = Array.isArray(current.locations) ? current.locations : [current.location];
    acc[key].allLocations = [...new Set([...acc[key].allLocations, ...newLocs])];
  }
  
  return acc;
}, {});

// 2. Map the grouped objects to FullCalendar events
const events = Object.values(groupedData).map(b => {
  const locationText = b.allLocations.filter(Boolean).join(", ");

    return {
      id: b.id || Math.random().toString(),
      title: `${b.fromTime || ''} | ${b.eventName || 'Untitled'}`,
      start: formatForCalendar(b.date),
      backgroundColor: STATUS_COLORS[b.status] || STATUS_COLORS.Pending, 
      borderColor: 'transparent',
      extendedProps: { ...b, locationText } // Pass normalized location text to popup
    };
  });

  const handleEventClick = (info) => {
    setSelectedEvent(info.event.extendedProps);
  };

  return (
    <Paper sx={{ 
      p: isMobile ? 2 : 4, 
      borderRadius: 4, 
      boxShadow: "0px 10px 30px rgba(0,0,0,0.05)" 
    }}>

      {/* --- COLOR LEGEND --- */}
      <Stack 
        direction={isMobile ? "column" : "row"} 
        spacing={isMobile ? 1 : 4} 
        sx={{ 
          mb: 4, 
          justifyContent: 'center', 
          alignItems: 'center',
          p: 2,
          bgcolor: 'rgba(0,0,0,0.02)',
          borderRadius: 2
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
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
      <Box sx={{ 
        '& .fc-header-toolbar': { 
          mb: 3, 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          gap: 1 
        },
        '& .fc-toolbar-title': { fontSize: isMobile ? '1.1rem' : '1.5rem', fontWeight: 700 },
        '& .fc-button': { bgcolor: 'primary.main', border: 'none', borderRadius: 2, fontWeight: 600 },
        '& .fc-button:hover': { bgcolor: 'primary.dark' },
        '& .fc-event': { cursor: 'pointer', p: 0.5, borderRadius: '4px', fontSize: '0.8rem', border: 'none' },
        '& .fc-daygrid-event-h-hard': { mb: '2px' }
      }}>
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          events={events}
          height="auto"
          eventClick={handleEventClick}
          displayEventTime={false}
          dayMaxEvents={3} // Better for mobile/busy days
        />
      </Box>

      {/* --- EVENT DETAIL DIALOG --- */}
      <Dialog 
        open={Boolean(selectedEvent)} 
        onClose={() => setSelectedEvent(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ 
          bgcolor: STATUS_COLORS[selectedEvent?.status] || 'primary.main', 
          color: 'white', 
          fontWeight: 700 
        }}>
          {selectedEvent?.eventName}
        </DialogTitle>
        
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AccessTime color="action" />
              <Typography><strong>Time:</strong> {selectedEvent?.fromTime} - {selectedEvent?.toTime}</Typography>
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
              <Typography><strong>Requested By:</strong> {selectedEvent?.requestedByName || selectedEvent?.fullName || 'N/A'}</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <EventNote color="action" />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography><strong>Status:</strong></Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    px: 1.5, py: 0.5, borderRadius: 10, fontWeight: 800,
                    bgcolor: `${STATUS_COLORS[selectedEvent?.status]}22`, // 22 is hex for ~13% opacity
                    color: STATUS_COLORS[selectedEvent?.status],
                    border: `1px solid ${STATUS_COLORS[selectedEvent?.status]}`
                  }}
                >
                  {selectedEvent?.status?.toUpperCase()}
                </Typography>
              </Box>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedEvent(null)} variant="contained" fullWidth sx={{ borderRadius: 2 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}