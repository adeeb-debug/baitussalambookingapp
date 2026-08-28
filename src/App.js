// src/App.js
import { useState, useEffect } from "react";
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
} from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { ThemeProvider } from "@mui/material/styles";

// COMPONENTS
import Navigation from "./components/Navigation";
import SignInModal from "./components/SignInModal";
import AllBookings from "./components/AllBookings";
import BookingForm from "./components/BookingForm";
import MyBookings from "./components/MyBookings";
import UserManager from "./components/UserManager";
import Calendar from "./components/Calendar";
import {
  auth,
  provider as googleProvider,
  microsoftProvider,
  db,
} from "./firebase/firebaseConfig";
import { appTheme as modernTheme } from "./theme/theme";

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
  const [loading, setLoading] = useState(true);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [role, setRole] = useState("user"); // Default role

  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(modernTheme.breakpoints.down("sm"));
  const isDesktopNav = useMediaQuery(modernTheme.breakpoints.up("md"));

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const userDocRef = doc(db, "users", u.email.toLowerCase());
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setIsAuthorized(true);
          setUser(u);

          // Force lowercase here so all your checks (role === "admin") always work
          const normalizedRole = userData.role?.toLowerCase() || "user";
          setRole(normalizedRole);
        } else {
          setIsAuthorized(false);
          setUser(u);
          setRole("unauthorized");
        }
      } else {
        setUser(null);
        setRole("guest");
        setIsAuthorized(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Firestore Listener
  useEffect(() => {
    if (!user) {
      setBookings([]);
      return;
    }

    const q = query(collection(db, "bookings"), orderBy("date", "desc"));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setBookings(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      },
      (error) => {
        if (error.code === "permission-denied") {
          console.log("Waiting for authentication permissions...");
        } else {
          console.error("Firestore error:", error);
        }
      },
    );

    return () => unsub();
  }, [user]);

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

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
        return "Request a Booking";
      case "/my-bookings":
        return "My Bookings";
      case "/calendar":
        return "Bookings Calendar";
      case "/all-bookings":
        return "All Bookings";
      case "/user-manager":
        return "User Manager";
      default:
        return "";
    }
  };

  // --- FULL-SCREEN LOADER (first auth check only) ---
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // --- GUEST / SIGNED-OUT LANDING ---
  if (!user) {
    const features = [
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
              justify: "center",
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
                  sx={{
                    height: 48,
                    width: "auto",
                    display: "block",
                  }}
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

              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={() => setIsSignInModalOpen(true)}
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
                {features.map((f) => (
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

        {/* --- GUEST FOOTER --- */}
        {/* --- SUBTLE INLINE FOOTER --- */}
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
            © {new Date().getFullYear()} Bait us Salam Mosque. All rights
            reserved.
          </Typography>
        </Box>

        <SignInModal
          isOpen={isSignInModalOpen}
          onClose={() => setIsSignInModalOpen(false)}
          onLogin={login}
        />
      </Box>
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
            <IconButton onClick={() => setIsDrawerOpen(true)} edge="start">
              <MenuOutlined />
            </IconButton>
          )}
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {getPageTitle()}
          </Typography>
        </Box>

        {/* --- PAGE CONTENT --- */}
        <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 }, flex: 1 }}>
          <Box sx={{ maxWidth: "1200px", mx: "auto" }}>
            <Routes>
              <Route
                path="/"
                element={
                  <BookingForm user={user} role={role} bookings={bookings} />
                }
              />
              <Route
                path="/calendar"
                element={
                  ["user", "subscriber", "admin"].includes(role) ? (
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
                    loading={loading}
                  />
                }
              />
              <Route
                path="/all-bookings"
                element={
                  role === "admin" ? (
                    <AllBookings bookings={bookings} user={user} role={role} />
                  ) : (
                    <Navigate to="/" />
                  )
                }
              />
              <Route
                path="/user-manager"
                element={
                  role === "admin" ? <UserManager /> : <Navigate to="/" />
                }
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Box>
        </Box>

        {/* --- AUTHENTICATED APP FOOTER --- */}
        {/* --- SUBTLE INLINE FOOTER --- */}
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
            © {new Date().getFullYear()} Bait us Salam Mosque. All rights
            reserved.
          </Typography>
        </Box>
      </Box>

      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        onLogin={login}
      />
    </Box>
  );
}
