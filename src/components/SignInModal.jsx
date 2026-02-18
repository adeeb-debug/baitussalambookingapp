// src/components/SignInModal.jsx

import React from 'react';
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    Button, 
    Stack, 
    Typography,
    useTheme
} from '@mui/material';

export default function SignInModal({ isOpen, onClose, onLogin }) {
    const muiTheme = useTheme();

    const socialButtonStyles = {
        py: 1.5, 
        bgcolor: 'white', 
        color: 'text.primary', 
        border: '1px solid #ddd', 
        boxShadow: muiTheme.shadows[1], 
        textTransform: 'none', // Keeps "Sign in" looking natural
        fontWeight: 600,
        '&:hover': { 
            bgcolor: '#f5f5f5', 
            boxShadow: muiTheme.shadows[3] 
        } 
    };

    return (
        <Dialog 
            open={isOpen} 
            onClose={onClose} 
            maxWidth="xs"
            PaperProps={{ 
                sx: { 
                    borderRadius: 3, 
                    p: 2, 
                    minWidth: { xs: '90%', sm: 350 },
                    textAlign: 'center'
                } 
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                {/* FIX: component="span" prevents <h6> inside <h2> error */}
                <Typography variant="h6" component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    Choose a Sign-In Option
                </Typography>
            </DialogTitle>
            
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Please sign in to manage and request mosque bookings.
                </Typography>
                
                <Stack spacing={2}>
                    {/* 1. Google Sign-In Button */}
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={() => onLogin('google')}
                        sx={socialButtonStyles}
                        startIcon={<img src="https://img.icons8.com/color/18/000000/google-logo.png" alt="Google logo" />}
                    >
                        Sign in with Google
                    </Button>

                    {/* 2. Microsoft Sign-In Button */}
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={() => onLogin('microsoft')}
                        sx={socialButtonStyles}
                        startIcon={<img src="https://img.icons8.com/color/18/000000/microsoft.png" alt="Microsoft logo" />}
                    >
                        Sign in with Microsoft
                    </Button>
                </Stack>
            </DialogContent>
        </Dialog>
    );
}