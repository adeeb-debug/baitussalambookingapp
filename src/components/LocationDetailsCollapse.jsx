// src/components/LocationDetailsCollapse.jsx

import React from 'react';
import { 
    Box, 
    Typography, 
    Table, 
    TableHead, 
    TableBody, 
    TableRow, 
    TableCell, 
    Collapse, 
    Button, 
    CircularProgress, 
    useTheme 
} from '@mui/material';
import { 
    CheckCircleOutline, 
    CancelOutlined, 
    DeleteOutline 
} from '@mui/icons-material';
import { renderStatusChip } from '../utils/bookingHelpers';

export default function LocationDetailsCollapse({ 
    group, 
    expandedGroup, 
    actionLoadingId, 
    handleAction 
}) {
    const theme = useTheme();
    
    return (
        <TableRow>
            <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
                <Collapse in={group.groupId === expandedGroup} timeout="auto" unmountOnExit>
                    <Box sx={{ margin: 1 }}>
                        <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: 600, mt: 1 }}>
                            Individual Location Statuses:
                        </Typography>
                        <Table size="small" aria-label="location-details">
                            <TableHead>
                                <TableRow sx={{ bgcolor: theme.palette.grey[50] }}>
                                    <TableCell sx={{ fontWeight: 'bold', width: '150px' }}>Location</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Individual Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {group.bookings.sort((a,b) => a.location.localeCompare(b.location)).map((subBooking) => (
                                    <TableRow key={subBooking.id}>
                                        <TableCell component="th" scope="row">
                                            {subBooking.location}
                                        </TableCell>
                                        <TableCell>
                                            {renderStatusChip(subBooking.status, theme)}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                {/* Individual Approve/Reject only visible if status allows */}
                                                {subBooking.status === 'Pending' && (
                                                    <>
                                                        <Button
                                                            variant="outlined"
                                                            color="success"
                                                            size="small"
                                                            onClick={() => handleAction(subBooking.id, 'Approved')}
                                                            disabled={actionLoadingId === subBooking.id}
                                                        >
                                                            {actionLoadingId === subBooking.id ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutline fontSize="small" />} Approve
                                                        </Button>
                                                        <Button
                                                            variant="outlined"
                                                            color="error"
                                                            size="small"
                                                            onClick={() => handleAction(subBooking.id, 'Rejected')}
                                                            disabled={actionLoadingId === subBooking.id}
                                                        >
                                                            {actionLoadingId === subBooking.id ? <CircularProgress size={16} color="inherit" /> : <CancelOutlined fontSize="small" />} Reject
                                                        </Button>
                                                    </>
                                                )}
                                                <Button
                                                    variant="outlined"
                                                    color="error"
                                                    size="small"
                                                    onClick={() => handleAction(subBooking.id, 'Delete')}
                                                    disabled={actionLoadingId === subBooking.id}
                                                >
                                                    <DeleteOutline fontSize="small" /> Delete
                                                </Button>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                </Collapse>
            </TableCell>
        </TableRow>
    );
}