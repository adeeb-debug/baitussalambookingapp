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
  onNavigate, // Prop from App.js
  isDrawerOpen,
  setIsDrawerOpen,
  sx,
}) {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  

  const navigationItems = [
    ...(user
      ? [
          {
            name: "Request a Booking",
            path: VIEWS.REQUEST_BOOKING,
            icon: <AddCircleOutline />,
            requiredAuth: true,
          },
          {
            name: "My Bookings",
            path: VIEWS.MY_BOOKINGS,
            icon: <History />,
            requiredAuth: true,
          },
          // MOVED HERE: Available to all logged-in users
          {
            name: "Schedule Calendar",
            path: VIEWS.BOOKINGS_CALENDAR,
            icon: <CalendarMonth />,
            requiredAuth: true,
            adminOnly: false, // Set to false so everyone in your list sees it
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            name: "All Bookings",
            path: VIEWS.ALL_BOOKINGS,
            icon: <Dashboard />,
            requiredAuth: true,
            adminOnly: true,
          },
          {
            name: "User Manager",
            path: VIEWS.USER_MANAGER,
            icon: <People />,
            requiredAuth: true,
            adminOnly: true,
          },
        ]
      : []),
  ];
  const isLoggedIn = Boolean(user);
  const visibleNavigationItems = navigationItems.filter((item) => {
    if (item.requiredAuth && !isLoggedIn) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

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
