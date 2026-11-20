// src/App.js
import { useState, useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  useMediaQuery,
  IconButton,
  CardMedia,
  Alert,
} from "@mui/material";
import {
  LockOpenOutlined,
  MenuOutlined,
  EventAvailableOutlined,
  TaskAltOutlined,
  NotificationsActiveOutlined,
} from "@mui/icons-material";
import {
  onSnapshot,
  query,
  collection,
  orderBy,
  doc,
  getDoc,
  where,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { ThemeProvider, useTheme } from "@mui/material/styles";

// COMPONENTS
import Navigation from "./components/Navigation";
import SignInModal from "./components/SignInModal";
import {
  auth,
  provider as googleProvider,
  microsoftProvider,
  db,
} from "./firebase/firebaseConfig";
import { appTheme as modernTheme } from "./theme/theme";

// Pages are loaded on demand so each route only downloads its own code
// (e.g. FullCalendar is only fetched when /calendar is opened).
const BookingForm = lazy(() => import("./components/BookingForm"));
const MyBookings = lazy(() => import("./components/MyBookings"));
const Calendar = lazy(() => import("./components/Calendar"));
const AllBookings = lazy(() => import("./components/AllBookings"));
const UserManager = lazy(() => import("./components/UserManager"));

// --- CONSTANTS ---
const ROLES = {
  ADMIN: "admin",
  USER: "user",
  SUBSCRIBER: "subscriber",
};
const CALENDAR_ROLES = [ROLES.SUBSCRIBER, ROLES.ADMIN];

const PAGE_TITLES = {
  "/": "Request a Booking",
  "/my-bookings": "My Bookings",
  "/calendar": "Bookings Calendar",
  "/all-bookings": "All Bookings",
  "/user-manager": "User Manager",
};

// Closing the popup is the user's choice, not an error worth showing
const IGNORED_AUTH_ERRORS = [
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
];

// --- SMALL SHARED PIECES ---
function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 4,
        textAlign: "center",
        opacity: 0.6,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: "0.75rem", letterSpacing: 0.3 }}
      >
        © {new Date().getFullYear()} Bait us Salam Mosque. All rights reserved.
      </Typography>
    </Box>
  );
}

function CenteredLoader({ fullScreen = false }) {
  return (
    <Box
      sx={{
        minHeight: fullScreen ? "100vh" : 240,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: fullScreen ? "background.default" : "transparent",
      }}
    >
      <CircularProgress />
    </Box>
  );
}

const FEATURES = [
  {
    icon: <EventAvailableOutlined />,
    title: "Book in minutes",
    desc: "Pick a hall, date and time — see availability instantly.",
  },
  {
    icon: <NotificationsActiveOutlined />,
    title: "Live status updates",
    desc: "Know the moment your request is approved or needs changes.",
  },
  {
    icon: <TaskAltOutlined />,
    title: "One place for everything",
    desc: "Every booking you've made, organised and easy to find.",
  },
];

/** Signed-out landing page */
function LandingPage({ onSignInClick, authError, onDismissError }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        {/* --- LEFT: CONTENT --- */}
        <Box
          sx={{
            flex: isMobile ? "none" : "0 0 52%",
            display: "flex",
            flexDirection: "column",
            px: { xs: 3, sm: 6, md: 8 },
            py: { xs: 4, md: 0 },
          }}
        >
          <Box
            sx={{
              maxWidth: 480,
              mx: isMobile ? "auto" : 0,
              width: "100%",
              my: "auto",
            }}
          >
            {/* Brand */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                mb: { xs: 4, md: 6 },
              }}
            >
              <Box
                component="img"
                src="/logo/logo-badge-teal.svg"
                alt="Bait us Salam Logo"
                sx={{ height: 48, width: "auto", display: "block" }}
              />
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 800, lineHeight: 1.15 }}
                >
                  Bait us Salam
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Booking Portal
                </Typography>
              </Box>
            </Box>

            <Typography
              variant={isMobile ? "h4" : "h3"}
              sx={{
                fontWeight: 800,
                letterSpacing: -0.5,
                mb: 2,
                lineHeight: 1.15,
              }}
            >
              Book your next event at the Bait us Salam Mosque.
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "text.secondary",
                lineHeight: 1.7,
                mb: 4,
                fontSize: "1.05rem",
              }}
            >
              Sign in with Google or Microsoft to request a hall, track your
              booking's approval status, and keep every event in one place.
            </Typography>

            {authError && (
              <Alert
                severity="error"
                variant="outlined"
                onClose={onDismissError}
                sx={{ mb: 3 }}
              >
                {authError}
              </Alert>
            )}

            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={onSignInClick}
              startIcon={<LockOpenOutlined />}
              sx={{
                borderRadius: "50px",
                px: 4.5,
                py: 1.6,
                fontWeight: 700,
                fontSize: "0.95rem",
                boxShadow: "0px 6px 20px rgba(15, 118, 110, 0.3)",
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: "primary.dark",
                  transform: "translateY(-2px)",
                  boxShadow: "0px 8px 25px rgba(15, 118, 110, 0.4)",
                },
              }}
            >
              Sign in to get started
            </Button>

            <Box
              sx={{
                mt: { xs: 5, md: 7 },
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              {FEATURES.map((f) => (
                <Box
                  key={f.title}
                  sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      bgcolor: "rgba(15,118,110,0.09)",
                      color: "primary.main",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      "& svg": { fontSize: 20 },
                    }}
                  >
                    {f.icon}
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {f.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {f.desc}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* --- RIGHT: IMAGE --- */}
        <Box
          sx={{
            flex: isMobile ? "none" : "0 0 48%",
            position: "relative",
            height: isMobile ? 260 : "auto",
            m: { xs: 0, md: 2 },
            ml: { md: 0 },
            borderRadius: { xs: 0, md: 4 },
            overflow: "hidden",
          }}
        >
          <CardMedia
            component="img"
            src={process.env.PUBLIC_URL + "/baitussalam.jpg"}
            alt="Bait us Salam Mosque"
            sx={{
              height: "100%",
              width: "100%",
              objectFit: "cover",
              objectPosition: "center 30%",
              display: "block",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(11,26,23,0.05) 0%, rgba(11,26,23,0.55) 100%)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              p: { xs: 3, md: 4 },
            }}
          >
            <Typography
              sx={{
                color: "white",
                fontWeight: 700,
                fontSize: "1.05rem",
                textShadow: "0px 2px 6px rgba(0,0,0,0.35)",
              }}
            >
              Bait us Salam Mosque
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "rgba(255,255,255,0.85)",
                textShadow: "0px 1px 4px rgba(0,0,0,0.35)",
              }}
            >
              House of Peace.
            </Typography>
          </Box>
        </Box>
      </Box>

      <Footer />
    </Box>
  );
}

// --- MAIN WRAPPER ---
export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={modernTheme}>
        <AppContent />
      </ThemeProvider>
    </BrowserRouter>
  );
}

// --- ACTUAL APP LOGIC ---
function AppContent() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  const [loading, setLoading] = useState(true); // first auth check only
  const [authError, setAuthError] = useState("");
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [role, setRole] = useState("guest");

  const navigate = useNavigate();
  const location = useLocation();
  const isDesktopNav = useMediaQuery(modernTheme.breakpoints.up("md"));

  // --- AUTH + APPROVED-USER LOOKUP ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (!u) {
          setUser(null);
          setRole("guest");
          setIsAuthorized(false);
          return;
        }

        // Some accounts (certain Microsoft ones) can come back without an email
        const email = u.email?.toLowerCase();
        const userSnap = email ? await getDoc(doc(db, "users", email)) : null;

        if (userSnap?.exists()) {
          // Force lowercase so every role check (role === "admin") works
          const normalizedRole =
            userSnap.data().role?.toLowerCase() || ROLES.USER;
          setUser(u);
          setIsAuthorized(true);
          setRole(normalizedRole);
        } else {
          // Signed in, not on /users — still allowed to request a booking
          setUser(u);
          setIsAuthorized(false);
          setRole("guest");
        }
      } catch (err) {
        // Without this, a failed lookup left the app on the spinner forever
        console.error("User lookup failed:", err);
        setUser(u);
        setIsAuthorized(false);
        setRole("guest");
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // --- BOOKINGS LISTENER (all bookings for approved users; own bookings for signed-in guests) ---
  useEffect(() => {
    if (!user) {
      setBookings([]);
      setBookingsLoading(false);
      setBookingsError("");
      return;
    }

    setBookingsLoading(true);
    setBookingsError("");

    const email = user.email?.toLowerCase();
    const q = isAuthorized
      ? query(collection(db, "bookings"), orderBy("date", "desc"))
      : email
        ? query(
            collection(db, "bookings"),
            where("requestedByEmail", "==", email),
          )
        : null;

    if (!q) {
      setBookings([]);
      setBookingsLoading(false);
      return;
    }

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (!isAuthorized) {
          rows.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        }
        setBookings(rows);
        setBookingsLoading(false);
        setBookingsError("");
      },
      (error) => {
        console.error("Firestore error:", error);
        setBookingsError(
          error.code === "permission-denied"
            ? "You don't have permission to view bookings."
            : "Couldn't load bookings. Check your connection and refresh the page.",
        );
        setBookingsLoading(false);
      },
    );

    return () => unsub();
  }, [user, isAuthorized]);

  // --- LOGIN ---
  const login = async (providerName) => {
    const provider =
      providerName === "google" ? googleProvider : microsoftProvider;
    setIsSignInModalOpen(false);
    setAuthError("");
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      if (IGNORED_AUTH_ERRORS.includes(err.code)) return;

      // In-app browsers (WhatsApp, Facebook) often block popups
      if (err.code === "auth/popup-blocked") {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr) {
          setAuthError("Login failed: " + redirectErr.message);
          return;
        }
      }

      if (err.code === "auth/account-exists-with-different-credential") {
        setAuthError(
          "An account with this email already exists using a different sign-in method. Try the other option (Google or Microsoft).",
        );
        return;
      }

      setAuthError("Login failed: " + err.message);
    }
  };

  // --- FIRST AUTH CHECK ---
  if (loading) {
    return <CenteredLoader fullScreen />;
  }

  // --- GUEST / SIGNED-OUT LANDING ---
  if (!user) {
    return (
      <>
        <LandingPage
          onSignInClick={() => setIsSignInModalOpen(true)}
          authError={authError}
          onDismissError={() => setAuthError("")}
        />
        <SignInModal
          isOpen={isSignInModalOpen}
          onClose={() => setIsSignInModalOpen(false)}
          onLogin={login}
        />
      </>
    );
  }

  // --- AUTHENTICATED APP SHELL: sidebar + topbar + content ---
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <Navigation
        user={user}
        role={role}
        isAuthorized={isAuthorized}
        onNavigate={(path) => navigate(path)}
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpen={setIsDrawerOpen}
        onLogout={() => signOut(auth)}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* --- TOP BAR --- */}
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 5,
            bgcolor: "rgba(247,248,250,0.85)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid",
            borderColor: "divider",
            px: { xs: 2, md: 4 },
            py: 2.25,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          {!isDesktopNav && (
            <IconButton
              onClick={() => setIsDrawerOpen(true)}
              edge="start"
              aria-label="Open navigation menu"
            >
              <MenuOutlined />
            </IconButton>
          )}
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {PAGE_TITLES[location.pathname] || ""}
          </Typography>
        </Box>

        {/* --- PAGE CONTENT --- */}
        <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 }, flex: 1 }}>
          <Box sx={{ maxWidth: "1200px", mx: "auto" }}>
            {bookingsError && (
              <Alert severity="error" variant="outlined" sx={{ mb: 2.5 }}>
                {bookingsError}
              </Alert>
            )}

            {/* Wait for the first bookings snapshot so pages never show
                "no bookings" or run clash checks against an empty list */}
            {bookingsLoading ? (
              <CenteredLoader />
            ) : (
              <Suspense fallback={<CenteredLoader />}>
                <Routes>
                  <Route
                    path="/"
                    element={
                      <BookingForm
                        user={user}
                        role={role}
                        bookings={bookings}
                      />
                    }
                  />
                  <Route
                    path="/calendar"
                    element={
                      isAuthorized && CALENDAR_ROLES.includes(role) ? (
                        <Calendar bookings={bookings} role={role} />
                      ) : (
                        <Navigate to="/" />
                      )
                    }
                  />
                  <Route
                    path="/my-bookings"
                    element={
                      <MyBookings
                        bookings={bookings}
                        role={role}
                        user={user}
                        loading={bookingsLoading}
                      />
                    }
                  />
                  <Route
                    path="/all-bookings"
                    element={
                      isAuthorized && role === ROLES.ADMIN ? (
                        <AllBookings
                          bookings={bookings}
                          user={user}
                          role={role}
                        />
                      ) : (
                        <Navigate to="/" />
                      )
                    }
                  />
                  <Route
                    path="/user-manager"
                    element={
                      isAuthorized && role === ROLES.ADMIN ? (
                        <UserManager />
                      ) : (
                        <Navigate to="/" />
                      )
                    }
                  />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </Suspense>
            )}
          </Box>
        </Box>

        <Footer />
      </Box>
    </Box>
  );
}