import React from "react";
import { useLocation } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Typography,
  Avatar,
  Chip,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Close,
  CalendarMonth,
  AddCircleOutline,
  History,
  Dashboard,
  People,
  MosqueOutlined,
  LogoutOutlined,
} from "@mui/icons-material";
import { LAYOUT, COLORS } from "../theme/themeConfig";

export const VIEWS = {
  REQUEST_BOOKING: "/",
  ALL_BOOKINGS: "/all-bookings",
  MY_BOOKINGS: "/my-bookings",
  USER_MANAGER: "/user-manager",
  BOOKINGS_CALENDAR: "/calendar",
};

export const SIDEBAR_WIDTH = LAYOUT.sidebarWidth;

function getInitials(user) {
  const name = user?.displayName || user?.email || "U";
  const parts = name.split(/[ @.]/).filter(Boolean);
  return (parts[0]?.[0] || "U").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
}

export default function Navigation({
  user,
  onNavigate,
  isDrawerOpen,
  setIsDrawerOpen,
  role,
  onLogout,
}) {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const navigationItems = [
    ...(user
      ? [
          { name: "Request a Booking", path: "/", icon: <AddCircleOutline /> },
          { name: "My Bookings", path: "/my-bookings", icon: <History /> },
        ]
      : []),
    ...(["admin", "user", "fyi"].includes(role)
      ? [{ name: "Calendar", path: "/calendar", icon: <CalendarMonth /> }]
      : []),
    ...(role === "admin"
      ? [
          { name: "All Bookings", path: "/all-bookings", icon: <Dashboard /> },
          { name: "User Manager", path: "/user-manager", icon: <People /> },
        ]
      : []),
  ];

  const handleNavigate = (path) => {
    onNavigate(path);
    if (isMobile) setIsDrawerOpen(false);
  };

  const SidebarContent = (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
      }}
    >
      {/* --- BRAND --- */}
      <Box
        sx={{
          px: 3,
          py: 3,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2.5,
            bgcolor: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <MosqueOutlined sx={{ color: "white", fontSize: 22 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 800, lineHeight: 1.2, letterSpacing: -0.2 }}
            noWrap
          >
            Bait us Salam
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Booking Portal
          </Typography>
        </Box>
        {isMobile && (
          <IconButton
            size="small"
            onClick={() => setIsDrawerOpen(false)}
            sx={{ ml: "auto" }}
          >
            <Close fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Divider />

      {/* --- NAV --- */}
      <List sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.name}
              selected={isActive}
              onClick={() => handleNavigate(item.path)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                py: 1.1,
                color: isActive ? "primary.main" : "text.secondary",
                bgcolor: isActive ? `${COLORS.primary.main}17` : "transparent",
                "&:hover": {
                  bgcolor: isActive
                    ? `${COLORS.primary.main}22`
                    : "rgba(15,23,22,0.04)",
                },
                "&.Mui-selected": {
                  bgcolor: `${COLORS.primary.main}17`,
                  "&:hover": { bgcolor: `${COLORS.primary.main}22` },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: isActive ? "primary.main" : "text.secondary",
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.name}
                primaryTypographyProps={{
                  fontWeight: isActive ? 700 : 500,
                  fontSize: "0.9rem",
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      {/* --- USER FOOTER --- */}
      {user && (
        <Box
          sx={{
            p: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 1.25,
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: "primary.main",
              fontSize: "0.85rem",
              fontWeight: 700,
            }}
          >
            {getInitials(user)}
          </Avatar>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
              {user.displayName || user.email?.split("@")[0]}
            </Typography>
            {role === "admin" && (
              <Chip
                label="Admin"
                size="small"
                color="secondary"
                sx={{
                  height: 18,
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  mt: 0.25,
                }}
              />
            )}
          </Box>
          <Tooltip title="Sign out">
            <IconButton size="small" onClick={onLogout}>
              <LogoutOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        anchor="left"
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        PaperProps={{ sx: { border: "none" } }}
      >
        {SidebarContent}
      </Drawer>
    );
  }

  return (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
        borderRight: "1px solid",
        borderColor: "divider",
      }}
    >
      {SidebarContent}
    </Box>
  );
}
