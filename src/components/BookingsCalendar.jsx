import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { Paper, Box, Typography, useMediaQuery, useTheme } from '@mui/material'; // ✅ Added hooks

const formatForCalendar = (dateStr) => {
  if (!dateStr) return '';
  const [day, month, year] = dateStr.split("-");
  return `${year}-${month}-${day}`;
};

export default function BookingsCalendar({ bookings }) {
  // ✅ Define isMobile inside the component
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const events = bookings.map(b => ({
    id: b.id,
    title: `${b.eventName}`,
    start: formatForCalendar(b.date),
    backgroundColor: b.status === 'Approved' ? '#2e7d32' : b.status === 'Rejected' ? '#d32f2f' : '#ed6c02', 
    borderColor: 'transparent',
    extendedProps: { ...b }
  }));

  return (
    <Paper sx={{ 
      p: isMobile ? 2 : 4, // ✅ Now isMobile is defined!
      borderRadius: 4, 
      boxShadow: "0px 10px 30px rgba(0,0,0,0.05)" 
    }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 800, color: 'primary.dark' }}>
        Booking Schedule
      </Typography>
      <Box sx={{ 
        '& .fc-header-toolbar': { 
          mb: 3, 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', // Stack buttons on mobile
          gap: 1 
        },
        '& .fc-toolbar-title': { fontSize: isMobile ? '1.1rem' : '1.5rem' },
        '& .fc-button': { bgcolor: 'primary.main', border: 'none', borderRadius: 2, fontWeight: 600 },
        '& .fc-button:hover': { bgcolor: 'primary.dark' },
        '& .fc-daygrid-day-number': { p: 1, color: 'text.primary', textDecoration: 'none', fontWeight: 600 },
        '& .fc-event': { cursor: 'pointer', p: 0.5, borderRadius: '4px' }
      }}>
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          events={events}
          height="auto"
          eventClick={(info) => {
            const b = info.event.extendedProps;
            alert(`Event: ${b.eventName}\nStatus: ${b.status}`);
          }}
        />
      </Box>
    </Paper>
  );
}