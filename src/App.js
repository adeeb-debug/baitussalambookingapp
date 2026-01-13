// src/App.js - COMPLETE UPDATED CODE

import React, { useState, useEffect } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Paper,
  useMediaQuery,
  Alert,
  IconButton,
} from "@mui/material";
import {
  LockOpenOutlined,
  LogoutOutlined,
  VerifiedUser,
} from "@mui/icons-material";
import { onSnapshot, query, collection, orderBy } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { createTheme, ThemeProvider, useTheme } from "@mui/material/styles";

// ⭐ IMPORT ALL COMPONENTS & VIEWS ⭐
import Navigation, { VIEWS } from "./components/Navigation";
import SignInModal from "./components/SignInModal";
import AdminPanel from "./components/AdminPanel"; // Pending Approval Panel
import BookingForm from "./components/BookingForm"; // Assume this exists
import UserBookings from "./components/UserBookings"; // Assume this exists
import UserManager from "./components/UserManager";
import {
  auth,
  provider as googleProvider,
  microsoftProvider,
  db,
} from "./firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

// --- Custom, Modern Theme (Keep) ---
const modernTheme = createTheme({
  palette: {
    primary: {
      main: "#00796b", // Deep Teal
    },
    secondary: {
      main: "#ff9800", // Orange Accent
    },
    background: {
      default: "#ffffff",
    },
  },
  typography: {
    fontFamily: ['"Roboto"', "sans-serif"].join(","),
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
});

export default function App() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  // ✅ CRITICAL FIX: isSignInModalOpen and its setter must be correctly declared
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [currentView, setCurrentView] = useState(VIEWS.REQUEST_BOOKING);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const userDocRef = doc(db, "users", u.email.toLowerCase());
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setIsAdmin(data.isAdmin === true);
        } else {
          console.warn("No user document found for:", u.email.toLowerCase());
          setIsAdmin(false);
        }
        setUser(u);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ⭐ UTILITY FUNCTION: Extracts the first name ⭐
  const getFirstName = (user) => {
    if (!user) return "";

    if (user.displayName) {
      return user.displayName.split(" ")[0];
    }

    if (user.email) {
      const emailPart = user.email.split("@")[0];

      const cleanedName = emailPart
        .replace(/[._-]/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      return cleanedName.split(" ")[0];
    }

    return "Guest";
  };

  // Set initial view based on login state
  useEffect(() => {
    if (!user && currentView !== VIEWS.REQUEST_BOOKING) {
      setCurrentView(VIEWS.REQUEST_BOOKING);
    }
  }, [user, currentView]);

  // Authentication Listener (Keep)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // Firestore Booking Listener (Keep)
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "bookings"),
      orderBy("date", "desc"),
      orderBy("fromTime", "desc")
    );
    
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const fetchedBookings = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setBookings(fetchedBookings);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching bookings:", error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Login Handler
  const login = async (providerName) => {
    let selectedProvider;

    if (providerName === "google") {
      selectedProvider = googleProvider;
    } else if (providerName === "microsoft") {
      selectedProvider = microsoftProvider;
    } else {
      console.error("Unknown login provider:", providerName);
      alert(`Login provider ${providerName} is not configured in App.js.`);
      return;
    }

    // This line now works because setIsSignInModalOpen is defined above
    setIsSignInModalOpen(false);

    try {
      await signInWithPopup(auth, selectedProvider);
    } catch (err) {
      console.error("Firebase Login Error:", err);
      // Provide better user feedback for failed login
      const errorMessage = err.message || "An unknown error occurred.";
      alert(`Login with ${providerName} failed: ` + errorMessage);
    }
  };

  const logout = async () => {
    signOut(auth);
  };

  // --- MAIN CONTENT RENDER LOGIC (UPDATED ROUTING) ---
  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress color="primary" />
        </Box>
      );
    }

    const isViewAllowed = user || currentView === VIEWS.REQUEST_BOOKING;

    if (!isViewAllowed) {
      return (
        <Box sx={{ px: 2 }}>
          <Alert severity="warning">Please sign in to access this feature.</Alert>
        </Box>
      );
    }

    let ComponentToRender;
    const isBookingView = currentView === VIEWS.REQUEST_BOOKING;

    switch (currentView) {
      case VIEWS.ALL_BOOKINGS:
        ComponentToRender = AdminPanel; // Renders the AdminPanel (now focused on Pending)
        break;
      case VIEWS.MY_BOOKINGS:
        ComponentToRender = UserBookings;
        break;
      case VIEWS.USER_MANAGER:
        ComponentToRender = UserManager;
        break;
      case VIEWS.REQUEST_BOOKING:
      default:
        ComponentToRender = BookingForm;
        break;
    }

    // Define column size for the main content area
    const mainContentColumns = isBookingView
      ? isMobile
        ? 12
        : 7 // Booking Form uses 7 columns on desktop (to leave 5 for summaries)
      : 12; // Other views (AdminPanel, AllBookingsPanel, UserBookings) use full width

    return (
      /* ✅ Wrapped in Box with overflowX hidden and used margin 0 on Grid to fix mobile bleed */
      <Box sx={{ width: "100%", overflowX: "hidden" }}>
        <Grid
          container
          spacing={isMobile ? 0 : 4} // Removed spacing on mobile to prevent negative margin overflow
          alignItems="stretch"
          justifyContent="center"
          sx={{ width: "100%", margin: 0 }} 
        >
          {/* --- 1. Main Component (BookingForm / AdminPanel / UserBookings / AllBookingsPanel) --- */}
          <Grid item xs={12} md={mainContentColumns} sx={{ p: isMobile ? 0 : 2 }}>
            <Paper
              elevation={isMobile ? 0 : 8}
              sx={{
                width: "100%",
                p: isMobile ? 2 : 4,
                borderRadius: isMobile ? 0 : 3, // Square edges look cleaner on mobile if it's bleeding
                minHeight: "400px",
                boxSizing: "border-box"
              }}
            >
              <ComponentToRender
                user={user}
                isAdmin={isAdmin}
                bookings={bookings}
                loading={loading}
              />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };
  // ---------------------------------

  return (
    <ThemeProvider theme={modernTheme}>
      <Box
        sx={{
          flexGrow: 1,
          minHeight: "100vh",
          maxWidth: "100vw", // ✅ Strict viewport lock
          overflowX: "hidden", // ✅ Prevent horizontal scroll globally
          backgroundColor: "background.default",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* --- Header/AppBar --- */}
        <AppBar
          position="static"
          color="transparent"
          elevation={0}
          sx={{
            backgroundColor: "background.default",
            color: "primary.main",
            width: "100%",
          }}
        >
          <Toolbar
            sx={{
              flexDirection: "row",
              alignItems: "center",
              py: isMobile ? 1 : 0,
            }}
          >
            {/* 1. Navigation on LEFT for Mobile only */}
            {isMobile && (
              <Navigation
                user={user}
                isAdmin={isAdmin}
                currentView={currentView}
                setCurrentView={setCurrentView}
                isDrawerOpen={isDrawerOpen}
                setIsDrawerOpen={setIsDrawerOpen}
              />
            )}

            {/* Title */}
            <Typography
              variant="h6"
              component="div"
              sx={{
                flexGrow: 1,
                color: "primary.dark",
                display: "flex",
                alignItems: "center",
                gap: 1,
                fontSize: isMobile ? '0.9rem' : '1.25rem' // Smaller font for mobile header
              }}
            >
              Baitus Salam Booking Portal
              {isAdmin && (
                <VerifiedUser
                  sx={{ color: "secondary.main", ml: 0.5 }}
                  fontSize="small"
                />
              )}
            </Typography>

            {/* 2. Navigation on RIGHT for Desktop only */}
            {!isMobile && (
              <Navigation
                user={user}
                isAdmin={isAdmin}
                currentView={currentView}
                setCurrentView={setCurrentView}
                isDrawerOpen={isDrawerOpen}
                setIsDrawerOpen={setIsDrawerOpen}
              />
            )}

            {/* --- User/Auth Section --- */}
            {user ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                {!isMobile && (
                  <Typography
                    variant="body2"
                    component="span"
                    sx={{
                      color: "text.secondary",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    Hey there,
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{ ml: 0.5, fontWeight: 600, color: "text.primary" }}
                    >
                      {getFirstName(user)}
                    </Typography>
                  </Typography>
                )}

                {isMobile ? (
                  <IconButton
                    color="primary"
                    onClick={logout}
                    size="medium"
                    sx={{ mr: -1 }}
                  >
                    <LogoutOutlined />
                  </IconButton>
                ) : (
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={logout}
                    size="medium"
                    startIcon={<LogoutOutlined />}
                  >
                    Logout
                  </Button>
                )}
              </Box>
            ) : 
            isMobile ? (
              <IconButton
                color="primary"
                onClick={() => setIsSignInModalOpen(true)}
              >
                <LockOpenOutlined />
              </IconButton>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={() => setIsSignInModalOpen(true)}
                startIcon={<LockOpenOutlined />}
              >
                Sign In
              </Button>
            )}
          </Toolbar>
        </AppBar>

        {/* --- Main Content Container --- */}
        <Box
          sx={{
            mt: isMobile ? 0 : 4,
            mb: 4,
            px: isMobile ? 0 : 3, // Remove horizontal padding on mobile to use full width
            width: "100%",
            boxSizing: "border-box"
          }}
        >
          {renderContent()}
        </Box>

        {/* Sign-In Modal Component */}
        <SignInModal
          isOpen={isSignInModalOpen}
          onClose={() => setIsSignInModalOpen(false)}
          onLogin={login}
        />
      </Box>
    </ThemeProvider>
  );
}