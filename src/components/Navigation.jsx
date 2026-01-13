// src/components/Navigation.jsx
import React from "react";
import {
    Box, Button, Drawer, List, ListItem, ListItemButton, ListItemIcon,
    ListItemText, IconButton, Divider, Typography, useMediaQuery, useTheme
} from "@mui/material";
import { 
    Menu as MenuIcon, AddBoxOutlined, PendingActionsOutlined, 
    ListAltOutlined, ChevronLeft, GroupOutlined 
} from '@mui/icons-material';

// ✅ UPDATED VIEWS: Added USER_MANAGER to match App.js logic
export const VIEWS = {
    REQUEST_BOOKING: 'REQUEST_BOOKING',
    ALL_BOOKINGS: 'ALL_BOOKINGS',
    MY_BOOKINGS: 'MY_BOOKINGS',
    USER_MANAGER: 'USER_MANAGER', 
};

export default function Navigation({ 
    user, 
    isAdmin, 
    currentView, 
    setCurrentView, 
    isDrawerOpen, 
    setIsDrawerOpen 
}) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // --- NAVIGATION CONFIGURATION ---
    const navigationItems = [
        { 
            name: 'Request a Booking', 
            view: VIEWS.REQUEST_BOOKING, 
            icon: <AddBoxOutlined color="primary" />, 
            requiredAuth: true // Allowed for guests to see the form
        },
        // Only show "My Bookings" if logged in
        ...(user ? [{ 
            name: 'My Bookings', 
            view: VIEWS.MY_BOOKINGS, 
            icon: <ListAltOutlined color="primary" />, 
            requiredAuth: true 
        }] : []),
        // Only show Admin-specific tabs if the user is an admin
        ...(isAdmin ? [
            { 
                name: 'All Bookings', 
                view: VIEWS.ALL_BOOKINGS, 
                icon: <PendingActionsOutlined color="primary" />, 
                requiredAuth: true, 
                adminOnly: true 
            },
            { 
                name: 'User Manager', 
                view: VIEWS.USER_MANAGER, 
                icon: <GroupOutlined color="primary" />, 
                requiredAuth: true, 
                adminOnly: true 
            }
        ] : []),
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

    // --- DRAWER CONTENT (Mobile Only) ---
    const DrawerList = (
        <Box 
            sx={{ width: 250 }} 
            role="presentation" 
        >
            <Box sx={{ 
                p: 2, display: 'flex', alignItems: 'center', 
                justifyContent: 'space-between', bgcolor: 'primary.main', color: 'white' 
            }}>
                 <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>Menu</Typography>
                 <IconButton onClick={() => setIsDrawerOpen(false)} sx={{ color: 'white' }}>
                    <ChevronLeft />
                 </IconButton>
            </Box>
            <Divider />
            <List>
                {visibleNavigationItems.map((item) => (
                    <ListItem key={item.name} disablePadding>
                        <ListItemButton 
                            selected={currentView === item.view}
                            onClick={() => handleNavigate(item.view)}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.name} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </Box>
    );

    return (
        <>
            {/* Mobile Navigation */}
            {isMobile && (
                <IconButton
                    edge="start"
                    color="inherit"
                    onClick={() => setIsDrawerOpen(true)}
                    sx={{ mr: 1, color: 'primary.main' }}
                >
                    <MenuIcon />
                </IconButton>
            )}
            
            {/* Desktop Navigation */}
            {!isMobile && (
                <Box sx={{ display: 'flex', gap: 1, mr: 3 }}>
                    {visibleNavigationItems.map((item) => (
                        <Button
                            key={item.name}
                            variant={currentView === item.view ? 'contained' : 'text'}
                            color="primary"
                            onClick={() => handleNavigate(item.view)}
                            startIcon={item.icon}
                            sx={{ 
                                fontWeight: 600,
                                borderRadius: 2,
                                px: 2,
                                color: currentView === item.view ? 'white' : 'primary.dark',
                                '&:hover': {
                                    bgcolor: currentView === item.view ? 'primary.dark' : 'rgba(0, 121, 107, 0.08)',
                                }
                            }}
                        >
                            {item.name}
                        </Button>
                    ))}
                </Box>
            )}

            <Drawer anchor="left" open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
                {DrawerList}
            </Drawer>
        </>
    );
}