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
import Navigation from "./components/Navigation";
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

// --- THEME DEFINITION ---
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

// --- MAIN WRAPPER (Fixes the useNavigate error) ---
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(modernTheme.breakpoints.down("sm"));

  // Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const userDocRef = doc(db, "users", u.email.toLowerCase());
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          // USER IS IN YOUR LIST
          setIsAuthorized(true);
          setIsAdmin(userSnap.data().isAdmin === true);
          setUser(u);
        } else {
          // USER IS AUTHENTICATED BY GOOGLE BUT NOT IN YOUR DATABASE
          setIsAuthorized(false);
          setIsAdmin(false);
          setUser(u); // We keep the user object to show a "Access Denied" message
        }
      } else {
        setUser(null);
        setIsAdmin(false);
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

  const getFirstName = (user) =>
    user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "User";

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
        return "Request a Booking";
      case "/my-bookings":
        return "My Bookings";
      case "/calendar":
        return "Bookings Calendar";
      default:
        return "";
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        overflowX: "hidden",
      }}
    >
      {/* --- HERO SECTION --- */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: isMobile ? "280px" : "400px",
          marginBottom: "-1px", // Fixes sub-pixel gap line
          overflow: "visible",
        }}
      >
        {/* Subtle Bottom Transition Overlay */}
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "80px",
            background: "linear-gradient(to bottom, transparent, #f5f5f5)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />

        <CardMedia
          component="img"
          image="/baitussalam.jpg"
          sx={{
            height: "100%",
            width: "100%",
            objectFit: "cover",
            objectPosition: "center 30%",
            display: "block", // Crucial fix for the bottom "line"
          }}
        />

        {/* Top Gradient */}
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

        {/* Bottom Gradient (Matches Page BG) */}
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
                isAuthorized={isAuthorized}
                onNavigate={(path) => navigate(path)}
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
              Bait us Salam Booking Portal{" "}
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
                onNavigate={(path) => navigate(path)}
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
                  sx={{
                    color: "white",
                    bgcolor: "rgba(255,255,255,0.1)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
                  }}
                >
                  <LogoutOutlined />
                </IconButton>
              </Box>
            ) : null}
          </Toolbar>
        </AppBar>
      </Box>

      {/* --- MAIN CONTENT AREA --- */}
      <Box
        sx={{
          px: isMobile ? 1.5 : 4,
          pb: 8,
          mt: isMobile ? -5 : -8, // Increased mobile overlap to hide the line
          position: "relative",
          zIndex: 15, // Higher than hero gradients
        }}
      >
        <Box sx={{ maxWidth: "1100px", mx: "auto" }}>
          {/* Dynamic Page Title */}
          {user && (
            <Typography
              variant={isMobile ? "h5" : "h4"}
              sx={{
                fontWeight: "bold",
                color: "primary.main",
                mb: 4,
                textShadow: isMobile
                  ? "0px 1px 2px rgba(255,255,255,0.8)"
                  : "none",
              }}
            >
              {getPageTitle()}
            </Typography>
          )}

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Routes>
              <Route
                path="/"
                element={
                  user ? (
                    <BookingForm
                      user={user}
                      isAdmin={isAdmin}
                      bookings={bookings}
                    />
                  ) : (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: isMobile ? "column" : "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        bgcolor: "white", // Changed to solid white for better blending
                        p: isMobile ? 3 : 5,
                        borderRadius: isMobile ? 4 : "100px",
                        gap: 3,
                        border: "1px solid rgba(0, 121, 107, 0.1)",
                        boxShadow: "0px 10px 30px rgba(0,0,0,0.08)",
                        mt: 2,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: isMobile ? 2 : 4,
                          flexDirection: isMobile ? "column" : "row",
                          textAlign: isMobile ? "center" : "left",
                        }}
                      >
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
                          <AddBoxOutlined
                            sx={{ fontSize: 40, color: "white" }}
                          />
                        </Box>
                        <Box>
                          <Typography
                            variant={isMobile ? "h6" : "h5"}
                            sx={{
                              fontWeight: 800,
                              color: "primary.dark",
                              mb: 0.5,
                            }}
                          >
                            Ready to book at Baitus Salam Mosque?
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{
                              color: "text.secondary",
                              maxWidth: "500px",
                              lineHeight: 1.6,
                            }}
                          >
                            Please sign in with your google or microsoft account
                            to access our booking form and to keep a record of
                            your bookings.
                          </Typography>
                        </Box>
                      </Box>
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
                  )
                }
              />

              <Route
                path="/calendar"
                element={
                  isAuthorized ? (
                    <BookingsCalendar bookings={bookings} isAdmin={isAdmin} />
                  ) : (
                    <Navigate to="/" />
                  )
                }
              />
                            <Route
                path="/my-bookings"
                element={
                  user ? (
                    <MyBookings bookings={bookings} isAdmin={isAdmin} />
                  ) : (
                    <Navigate to="/" />
                  )
                }
              />
              <Route
                path="/all-bookings"
                element={
                  isAdmin ? (
                    <AllBookings bookings={bookings} user={user} />
                  ) : (
                    <Navigate to="/" />
                  )
                }
              />
              <Route
                path="/user-manager"
                element={isAdmin ? <UserManager /> : <Navigate to="/" />}
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          )}
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
