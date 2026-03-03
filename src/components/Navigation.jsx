import React from "react";
import { useLocation } from "react-router-dom";
import {
  Box,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Menu as MenuIcon,
  ChevronLeft,
  CalendarMonth,
  AddCircleOutline,
  History,
  Dashboard,
  People,
} from "@mui/icons-material";

export const VIEWS = {
  REQUEST_BOOKING: "/",
  ALL_BOOKINGS: "/all-bookings",
  MY_BOOKINGS: "/my-bookings",
  USER_MANAGER: "/user-manager",
  BOOKINGS_CALENDAR: "/calendar",
};

export default function Navigation({
  user,
  isAdmin,
  isAuthorized,
  onNavigate, // Prop from App.js
  isDrawerOpen,
  setIsDrawerOpen,
  sx,
}) {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  

const navigationItems = [
    // TIER 1: Any logged in user (Public Authenticated)
    ...(user ? [
      {
        name: "Request a Booking",
        path: "/",
        icon: <AddCircleOutline />,
      },
      {
        name: "My Bookings",
        path: "/my-bookings",
        icon: <History />,
      },
    ] : []),

// TIER 2: Only users found in your DB
...((isAuthorized || isAdmin) ? [
  {
    name: "Schedule Calendar",
    path: "/calendar",
    icon: <CalendarMonth />,
  },
] : []),
    // TIER 3: Only users found in your DB that are Admin
    ...(isAdmin ? [
      {
        name: "All Bookings",
        path: "/all-bookings",
        icon: <Dashboard />,
      },
      {
        name: "User Manager",
        path: "/user-manager",
        icon: <People />,
      },
    ] : []),
  ];
const visibleNavigationItems = navigationItems;

  const handleNavigate = (path) => {
    onNavigate(path);
    if (isMobile) setIsDrawerOpen(false);
  };

  const DrawerList = (
    <Box sx={{ width: 250 }} role="presentation">
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "primary.main",
          color: "white",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, color: "white" }}>
          Menu
        </Typography>
        <IconButton
          onClick={() => setIsDrawerOpen(false)}
          sx={{ color: "white" }}
        >
          <ChevronLeft />
        </IconButton>
      </Box>
      <Divider />
      <List>
        {visibleNavigationItems.map((item) => (
          <ListItem key={item.name} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigate(item.path)}
            >
              <ListItemIcon
                sx={{
                  color:
                    location.pathname === item.path
                      ? "primary.main"
                      : "inherit",
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      {isMobile && (
        <IconButton
          edge="start"
          onClick={() => setIsDrawerOpen(true)}
          sx={{
            mr: 1,
            color: "white",
            filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.5))",
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {!isMobile && (
        <Box sx={{ display: "flex", gap: 1, mr: 3, ...sx }}>
          {visibleNavigationItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.name}
                variant={isActive ? "contained" : "text"}
                onClick={() => handleNavigate(item.path)}
                startIcon={item.icon}
                sx={{
                  fontWeight: 700,
                  borderRadius: 8,
                  px: 2,
                  textShadow: isActive ? "none" : "0px 2px 4px rgba(0,0,0,0.8)",
                  color: "white",
                  bgcolor: isActive ? "primary.main" : "transparent",
                  "&:hover": {
                    bgcolor: isActive
                      ? "primary.dark"
                      : "rgba(255, 255, 255, 0.15)",
                  },
                  "& .MuiButton-startIcon": {
                    color: "inherit",
                  },
                }}
              >
                {item.name}
              </Button>
            );
          })}
        </Box>
      )}

      <Drawer
        anchor="left"
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      >
        {DrawerList}
      </Drawer>
    </>
  );
}
