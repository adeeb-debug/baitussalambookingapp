// src/components/UserManager.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, Switch, Alert, 
    CircularProgress, TextField, Button, Grid, Container,
    IconButton, Stack, TableSortLabel, Dialog, DialogTitle,
    DialogContent, DialogActions, Snackbar
} from '@mui/material';
import { 
    Search as SearchIcon, 
    PersonAdd as PersonAddIcon, 
    DeleteOutline as DeleteIcon
} from '@mui/icons-material';
import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from "../firebase/firebaseConfig";

export default function UserManager({ currentUser }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // Now used in the UI below
    
    // Form States
    const [newAdminEmail, setNewAdminEmail] = useState("");
    const [newAdminName, setNewAdminName] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    // Sorting & UI States
    const [orderBy, setOrderBy] = useState('displayName');
    const [order, setOrder] = useState('asc');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Fetch Users with Memoization
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null); // Clear previous errors
        try {
            const querySnapshot = await getDocs(collection(db, "users"));
            let userList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Apply Sorting
            userList.sort((a, b) => {
                const valA = (a[orderBy] || "").toLowerCase();
                const valB = (b[orderBy] || "").toLowerCase();
                if (order === 'asc') return valA < valB ? -1 : 1;
                return valA > valB ? -1 : 1;
            });

            setUsers(userList);
        } catch (err) {
            setError("Failed to load users. Please check your permissions.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [order, orderBy]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Handlers
    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            const userRef = doc(db, "users", newAdminEmail.toLowerCase());
            await setDoc(userRef, {
                displayName: newAdminName,
                email: newAdminEmail.toLowerCase(),
                isAdmin: true,
                createdAt: new Date()
            }, { merge: true });

            setNewAdminEmail("");
            setNewAdminName("");
            setSnackbar({ open: true, message: 'User added successfully!', severity: 'success' });
            fetchUsers();
        } catch (err) {
            setSnackbar({ open: true, message: 'Error adding user.', severity: 'error' });
        }
    };

    const handleToggleAdmin = async (userId, currentStatus) => {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { isAdmin: !currentStatus });
            setUsers(users.map(u => u.id === userId ? { ...u, isAdmin: !currentStatus } : u));
            setSnackbar({ open: true, message: 'Permissions updated!', severity: 'success' });
        } catch (err) {
            setSnackbar({ open: true, message: 'Update failed.', severity: 'error' });
        }
    };

    const confirmDelete = async () => {
        if (userToDelete) {
            try {
                await deleteDoc(doc(db, "users", userToDelete));
                fetchUsers();
                setSnackbar({ open: true, message: 'User deleted.', severity: 'success' });
            } catch (err) {
                setSnackbar({ open: true, message: 'Delete failed.', severity: 'error' });
            }
        }
        setShowDeleteModal(false);
    };

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const filteredUsers = users.filter(user => 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Container maxWidth="lg" sx={{ py: 3 }}>
            {/* Error Alert - This uses the 'error' state variable */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Header & Add User Section */}
            <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
                <Typography variant="h5" fontWeight={700} color="primary.dark" gutterBottom>
                    Add Authorized User
                </Typography>
                <form onSubmit={handleAddUser}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={5}>
                            <TextField fullWidth label="Full Name" size="small" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} required />
                        </Grid>
                        <Grid item xs={12} sm={5}>
                            <TextField fullWidth label="Email" size="small" type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} required />
                        </Grid>
                        <Grid item xs={12} sm={2}>
                            <Button fullWidth variant="contained" type="submit" startIcon={<PersonAddIcon />}>Add</Button>
                        </Grid>
                    </Grid>
                </form>
            </Paper>

            {/* Existing Users Table */}
            <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                    <Typography variant="h6" fontWeight={600}>System Users</Typography>
                    <TextField 
                        size="small" 
                        placeholder="Search..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'gray' }} /> }}
                    />
                </Stack>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
                ) : (
                    <TableContainer>
                        <Table size="medium">
                            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                                <TableRow>
                                    <TableCell>
                                        <TableSortLabel active={orderBy === 'displayName'} direction={orderBy === 'displayName' ? order : 'asc'} onClick={() => handleRequestSort('displayName')}>Name</TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel active={orderBy === 'email'} direction={orderBy === 'email' ? order : 'asc'} onClick={() => handleRequestSort('email')}>Email</TableSortLabel>
                                    </TableCell>
                                    <TableCell align="center">Admin Status</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredUsers.map((user) => (
                                    <TableRow key={user.id} hover>
                                        <TableCell>{user.displayName || 'N/A'}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell align="center">
                                            <Switch 
                                                checked={user.isAdmin || false} 
                                                onChange={() => handleToggleAdmin(user.id, user.isAdmin)}
                                                disabled={user.email === currentUser?.email}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton 
                                                color="error" 
                                                onClick={() => { setUserToDelete(user.id); setShowDeleteModal(true); }}
                                                disabled={user.email === currentUser?.email}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* Confirmation Dialog */}
            <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>Are you sure you want to remove this user? This cannot be undone.</DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowDeleteModal(false)}>Cancel</Button>
                    <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
                </DialogActions>
            </Dialog>

            {/* Notification Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Container>
    );
}