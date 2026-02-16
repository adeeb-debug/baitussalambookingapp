// src/App.js - FULL PAGE HERO & INTEGRATED NAV

import { useState, useEffect } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  CircularProgress,
  useMediaQuery,
  IconButton,
  CardMedia,
} from "@mui/material";
import {
  LockOpenOutlined,
  LogoutOutlined,
  VerifiedUser,
  AddBoxOutlined,
} from "@mui/icons-material";
import {
  onSnapshot,
  query,
  collection,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { createTheme, ThemeProvider } from "@mui/material/styles";

// COMPONENTS
import Navigation, { VIEWS } from "./components/Navigation";
import SignInModal from "./components/SignInModal";
import AllBookings from "./components/AllBookings";
import BookingForm from "./components/BookingForm";
import MyBookings from "./components/MyBookings";
import UserManager from "./components/UserManager";
import BookingsCalendar from "./components/BookingsCalendar";
import {
  auth,
  provider as googleProvider,
  microsoftProvider,
  db,
} from "./firebase/firebaseConfig";

const modernTheme = createTheme({
  palette: {
    primary: { main: "#00796b" },
    secondary: { main: "#ff9800" },
    background: { default: "#f5f5f5" },
  },
  typography: {
    fontFamily: ['"Roboto"', "sans-serif"].join(","),
    h6: { fontWeight: 700 },
  },
  shape: { borderRadius: 16 },
});

export default function App() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState(VIEWS.REQUEST_BOOKING);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  console.log("Calendar Component:", BookingsCalendar);
  const isMobile = useMediaQuery(modernTheme.breakpoints.down("sm"));
      const viewComponents = {
      [VIEWS.ALL_BOOKINGS]: AllBookings,
      [VIEWS.MY_BOOKINGS]: MyBookings,
      [VIEWS.USER_MANAGER]: UserManager,
      [VIEWS.REQUEST_BOOKING]: BookingForm,
      [VIEWS.BOOKINGS_CALENDAR]: BookingsCalendar,
    };

  // Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const userDocRef = doc(db, "users", u.email.toLowerCase());
        const userSnap = await getDoc(userDocRef);
        setIsAdmin(userSnap.exists() && userSnap.data().isAdmin === true);
        setUser(u);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Firestore Listener
  useEffect(() => {
    const q = query(collection(db, "bookings"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const login = async (providerName) => {
    const provider =
      providerName === "google" ? googleProvider : microsoftProvider;
    setIsSignInModalOpen(false);
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      alert("Login failed: " + err.message);
    }
  };

  const getFirstName = (user) =>
    user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "User";

  const renderContent = () => {
    if (loading)
      return (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      );

if (!user && currentView === VIEWS.REQUEST_BOOKING) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: "center",
        justifyContent: "space-between",
        bgcolor: "#f0f7f6", // Ultra-light teal tint
        p: isMobile ? 3 : 5,
        borderRadius: isMobile ? 4 : "100px", // Pill shape on desktop
        gap: 3,
        border: "1px solid rgba(0, 121, 107, 0.1)",
        boxShadow: "0px 10px 30px rgba(0,0,0,0.03)",
        mt: 2
      }}
    >
      <Box sx={{ 
        display: "flex", 
        alignItems: "center", 
        gap: isMobile ? 2 : 4, 
        flexDirection: isMobile ? "column" : "row", 
        textAlign: isMobile ? "center" : "left" 
      }}>
        {/* Modern Icon Circle */}
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            bgcolor: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0px 8px 20px rgba(0, 121, 107, 0.2)",
            flexShrink: 0,
          }}
        >
          <AddBoxOutlined sx={{ fontSize: 40, color: "white" }} />
        </Box>

        {/* Text Stack */}
        <Box>
          <Typography 
            variant={isMobile ? "h6" : "h5"} 
            sx={{ fontWeight: 800, color: "primary.dark", mb: 0.5 }}
          >
            Ready to book at Baitus Salam Mosque?
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ color: "text.secondary", maxWidth: "500px", lineHeight: 1.6 }}
          >
            Please sign in with your google or microsoft account to access our booking form and to keep a record of your bookings. 
          </Typography>
        </Box>
      </Box>

      {/* Modern Pill Button */}
      <Button
        variant="contained"
        color="primary"
        onClick={() => setIsSignInModalOpen(true)}
        startIcon={<LockOpenOutlined />}
        sx={{
          borderRadius: "50px",
          px: 5,
          py: 1.8,
          fontWeight: 700,
          fontSize: "0.95rem",
          whiteSpace: "nowrap",
          boxShadow: "0px 6px 20px rgba(0, 121, 107, 0.3)",
          transition: "all 0.3s ease",
          "&:hover": {
            bgcolor: "primary.dark",
            transform: "translateY(-2px)",
            boxShadow: "0px 8px 25px rgba(0, 121, 107, 0.4)",
          },
        }}
      >
        SIGN IN NOW
      </Button>
    </Box>
  );
}


    const ComponentToRender = viewComponents[currentView] || BookingForm;
    return (
      <ComponentToRender
        user={user}
        isAdmin={isAdmin}
        bookings={bookings}
        loading={loading}
      />
    );
  };

  return (
    <ThemeProvider theme={modernTheme}>
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          overflowX: "hidden",
        }}
      >
        {/* --- HERO SECTION WITH INTEGRATED NAV --- */}
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: isMobile ? "280px" : "400px",
          }}
        >
          <CardMedia
            component="img"
            image="/baitussalam.jpg"
            sx={{
              height: "100%",
              width: "100%",
              objectFit: "cover",
              objectPosition: "center 30%",
            }}
          />

          {/* Top Gradient for Nav Legibility */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "40%",
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)",
              zIndex: 1,
            }}
          />

          {/* Bottom Gradient for Transition */}
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              height: "150px",
              background:
                "linear-gradient(to top, rgba(245,245,245,1) 0%, rgba(245,245,245,0) 100%)",
              zIndex: 1,
            }}
          />

          {/* Navigation Bar */}
          <AppBar
            position="absolute"
            color="transparent"
            elevation={0}
            sx={{ zIndex: 10 }}
          >
            <Toolbar sx={{ px: isMobile ? 2 : 5 }}>
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

              <Typography
                variant="h6"
                sx={{
                  flexGrow: 1,
                  color: "white",
                  textShadow: "0px 2px 4px rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                Baitus Salam Booking Portal{" "}
                {isAdmin && (
                  <VerifiedUser
                    sx={{ color: "secondary.main" }}
                    fontSize="small"
                  />
                )}
              </Typography>

              {!isMobile && (
                <Navigation
                  user={user}
                  isAdmin={isAdmin}
                  currentView={currentView}
                  setCurrentView={setCurrentView}
                  sx={{ color: "white" }}
                />
              )}

              {user ? (
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, ml: 2 }}
                >
                  {!isMobile && (
                    <Typography
                      variant="body2"
                      sx={{ color: "white", fontWeight: "bold" }}
                    >
                      {getFirstName(user)}
                    </Typography>
                  )}
                  <IconButton
                    onClick={() => signOut(auth)}
                    sx={{ color: "white", bgcolor: "rgba(255,255,255,0.1)" }}
                  >
                    <LogoutOutlined />
                  </IconButton>
                </Box>
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
        </Box>

        {/* --- MAIN CONTENT AREA --- */}
        <Box
          sx={{
            px: isMobile ? 2 : 4,
            pb: 8,
            mt: isMobile ? -4 : -8,
            position: "relative",
            zIndex: 5,
          }}
        >
          <Box sx={{ maxWidth: "1100px", mx: "auto" }}>
              {/* Correctly Rendered Dynamic Title */}
              {user && (
                <Typography
                  variant={isMobile ? "h5" : "h4"}
                  sx={{ fontWeight: "bold", color: "primary.main", mb: 4 }}
                >
                  {currentView === VIEWS.REQUEST_BOOKING}
                  {currentView === VIEWS.MY_BOOKINGS}
                  {currentView === VIEWS.ALL_BOOKINGS}
                  {currentView === VIEWS.USER_MANAGER}
                  {currentView === VIEWS.BOOKINGS_CALENDAR}
                </Typography>
              )}
              {renderContent()}
          </Box>
        </Box>

        <SignInModal
          isOpen={isSignInModalOpen}
          onClose={() => setIsSignInModalOpen(false)}
          onLogin={login}
        />
      </Box>
    </ThemeProvider>
  );
}
