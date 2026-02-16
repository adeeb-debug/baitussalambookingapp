import React from "react";
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
  CalendarMonth, // Added for the new view
  AddCircleOutline,
  History,
  Dashboard,
  People
} from "@mui/icons-material";

export const VIEWS = {
  REQUEST_BOOKING: "REQUEST_BOOKING",
  ALL_BOOKINGS: "ALL_BOOKINGS",
  MY_BOOKINGS: "MY_BOOKINGS",
  USER_MANAGER: "USER_MANAGER",
  BOOKINGS_CALENDAR: "BOOKINGS_CALENDAR", // ✅ New View Constant
};

export default function Navigation({
  user,
  isAdmin,
  currentView,
  setCurrentView,
  isDrawerOpen,
  setIsDrawerOpen,
  sx,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const navigationItems = [
    {
      name: "Request a Booking",
      view: VIEWS.REQUEST_BOOKING,
      icon: <AddCircleOutline />,
      requiredAuth: true,
    },
    {
      name: "My Bookings",
      view: VIEWS.MY_BOOKINGS,
      icon: <History />,
      requiredAuth: true,
    },
    // ✅ Added the Calendar View button
    {
      name: "Schedule Calendar",
      view: VIEWS.BOOKINGS_CALENDAR,
      icon: <CalendarMonth />,
      requiredAuth: true, // Everyone can see the schedule
    },
    ...(user
      ? [
          {
            name: "All Bookings",
            view: VIEWS.ALL_BOOKINGS,
            icon: <Dashboard />,
            requiredAuth: true,
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            name: "User Manager",
            view: VIEWS.USER_MANAGER,
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

  const handleNavigate = (view) => {
    setCurrentView(view);
    if (isMobile) setIsDrawerOpen(false);
  };

  const DrawerList = (
    <Box sx={{ width: 250 }} role="presentation">
      <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: "primary.main", color: "white" }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: "white" }}>Menu</Typography>
        <IconButton onClick={() => setIsDrawerOpen(false)} sx={{ color: "white" }}><ChevronLeft /></IconButton>
      </Box>
      <Divider />
      <List>
        {visibleNavigationItems.map((item) => (
          <ListItem key={item.name} disablePadding>
            <ListItemButton selected={currentView === item.view} onClick={() => handleNavigate(item.view)}>
              <ListItemIcon sx={{ color: currentView === item.view ? 'primary.main' : 'inherit' }}>
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
          sx={{ mr: 1, color: "white", filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.5))" }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {!isMobile && (
        <Box sx={{ display: "flex", gap: 1, mr: 3, ...sx }}>
          {visibleNavigationItems.map((item) => {
            const isActive = currentView === item.view;
            return (
              <Button
                key={item.name}
                variant={isActive ? "contained" : "text"}
                onClick={() => handleNavigate(item.view)}
                startIcon={item.icon}
                sx={{
                  fontWeight: 700,
                  borderRadius: 8,
                  px: 2,
                  textShadow: isActive ? "none" : "0px 2px 4px rgba(0,0,0,0.8)",
                  color: "white",
                  bgcolor: isActive ? "primary.main" : "transparent",
                  "&:hover": {
                    bgcolor: isActive ? "primary.dark" : "rgba(255, 255, 255, 0.15)",
                  },
                  "& .MuiButton-startIcon": {
                    color: "inherit"
                  }
                }}
              >
                {item.name}
              </Button>
            );
          })}
        </Box>
      )}

      <Drawer anchor="left" open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
        {DrawerList}
      </Drawer>
    </>
  );
}