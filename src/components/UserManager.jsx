// src/components/UserManager.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  TextField,
  Button,
  Grid,
  Container,
  IconButton,
  Stack,
  TableSortLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from "@mui/material";
import {
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
  DeleteOutline as DeleteIcon,
} from "@mui/icons-material";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase/firebaseConfig";

export default function UserManager({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Now used in the UI below

  // Form States
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [role, setrole] = useState("user"); // Default selection

  // Sorting & UI States
  const [orderBy, setOrderBy] = useState("displayName");
  const [order, setOrder] = useState("asc");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Fetch Users with Memoization
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      let userList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Apply Sorting
      userList.sort((a, b) => {
        const valA = (a[orderBy] || "").toLowerCase();
        const valB = (b[orderBy] || "").toLowerCase();
        if (order === "asc") return valA < valB ? -1 : 1;
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

  // ADD USER
  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const userRef = doc(db, "users", newAdminEmail.toLowerCase());
      await setDoc(
        userRef,
        {
          displayName: newAdminName,
          email: newAdminEmail.toLowerCase(),
          role: role,
          createdAt: new Date(),
        },
        { merge: true },
      );

      setNewAdminEmail("");
      setNewAdminName("");
      setSnackbar({
        open: true,
        message: "User added successfully!",
        severity: "success",
      });
      fetchUsers();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Error adding user.",
        severity: "error",
      });
    }
  };

  // DELETE USER
  const confirmDelete = async () => {
    if (userToDelete) {
      try {
        await deleteDoc(doc(db, "users", userToDelete));
        fetchUsers();
        setSnackbar({
          open: true,
          message: "User deleted.",
          severity: "success",
        });
      } catch (err) {
        setSnackbar({
          open: true,
          message: "Delete failed.",
          severity: "error",
        });
      }
    }
    setShowDeleteModal(false);
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // USER FILTER
  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()),
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
        <Typography
          variant="h5"
          fontWeight={700}
          color="primary.dark"
          gutterBottom
        >
          Add User
        </Typography>
        <form onSubmit={handleAddUser}>
  <Grid container spacing={2} sx={{ mt: 1, alignItems: 'center' }}>
    {/* 1. Full Name */}
    <Grid item xs={12} sm={4}>
      <TextField
        fullWidth
        label="Full Name"
        size="small"
        value={newAdminName}
        onChange={(e) => setNewAdminName(e.target.value)}
        required
      />
    </Grid>

    {/* 2. Email */}
    <Grid item xs={12} sm={4}>
      <TextField
        fullWidth
        label="Email"
        size="small"
        type="email"
        value={newAdminEmail}
        onChange={(e) => setNewAdminEmail(e.target.value)}
        required
      />
    </Grid>

    {/* 3. Role Selection */}
    <Grid item xs={12} sm={2}>
      <FormControl fullWidth size="small">
        <InputLabel>Role</InputLabel>
        <Select
          value={role}
          label="Role"
          onChange={(e) => setrole(e.target.value)}
        >
          <MenuItem value="user">User</MenuItem>
          <MenuItem value="admin">Admin</MenuItem>
          <MenuItem value="subscriber">Subscriber</MenuItem>
        </Select>
      </FormControl>
    </Grid>

    {/* 4. Submit Button */}
    <Grid item xs={12} sm={2}>
      <Button
        fullWidth
        variant="contained"
        type="submit"
        startIcon={<PersonAddIcon />}
        sx={{ height: '40px' }} // Matches TextField height
      >
        Add
      </Button>
    </Grid>
  </Grid>
</form>
      </Paper>

      {/* Existing Users Table */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 3 }}
        >
          <Typography variant="h6" fontWeight={600}>
            System Users
          </Typography>
          <TextField
            size="small"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon fontSize="small" sx={{ mr: 1, color: "gray" }} />
              ),
            }}
          />
        </Stack>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="medium">
              <TableHead sx={{ bgcolor: "#f5f5f5" }}>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === "displayName"}
                      direction={orderBy === "displayName" ? order : "asc"}
                      onClick={() => handleRequestSort("displayName")}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === "email"}
                      direction={orderBy === "email" ? order : "asc"}
                      onClick={() => handleRequestSort("email")}
                    >
                      Email
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center">Role</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.displayName || "N/A"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell align="center">
  <Select
    value={user.role || "user"} // Default to 'user'
    size="small"
    onChange={async (e) => {
      const newRole = e.target.value;
      const userRef = doc(db, "users", user.id);

      try {
        // Update in Firestore (we update 'role' and keep 'isAdmin' for safety/legacy)
        await updateDoc(userRef, { 
          role: newRole,
          isAdmin: newRole === "admin" 
        });

        // Update local state
        setUsers(
          users.map((u) =>
            u.id === user.id ? { ...u, role: newRole, isAdmin: newRole === "admin" } : u
          )
        );

        setSnackbar({
          open: true,
          message: `Role updated to ${newRole}!`,
          severity: "success",
        });
      } catch (error) {
        console.error("Error updating role:", error);
      }
    }}
    disabled={user.email === auth.currentUser?.email} // Cannot change own role
    sx={{ minWidth: 120 }}
  >
    <MenuItem value="user">User</MenuItem>
    <MenuItem value="admin">Admin</MenuItem>
    <MenuItem value="subscriber">Subscriber</MenuItem>
  </Select>
</TableCell>
                    <TableCell align="right">
                      <IconButton
                        color="error"
                        onClick={() => {
                          setUserToDelete(user.id);
                          setShowDeleteModal(true);
                        }}
                        disabled={user.email === auth.currentUser?.email} // cannot toggle self
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
        <DialogContent>
          Are you sure you want to remove this user? This cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
