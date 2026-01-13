// src/components/SignInModal.jsx - Updated with Yahoo Sign-In

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

// Component props interface
export default function SignInModal({ isOpen, onClose, onLogin }) {
    const muiTheme = useTheme();

    // Reusable styles for the external sign-in buttons
    const socialButtonStyles = {
        py: 1.5, 
        bgcolor: 'white', 
        color: 'text.primary', 
        border: '1px solid #ddd', 
        boxShadow: muiTheme.shadows[1], 
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
                    p: 3, 
                    minWidth: { xs: '90%', sm: 350 },
                    textAlign: 'center'
                } 
            }}
        >
            <DialogTitle sx={{ pb: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Choose a Sign-In Option
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
                <Stack spacing={2}>
                    
                    {/* 1. Google Sign-In Button */}
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={() => onLogin('google')}
                        sx={socialButtonStyles}
                        startIcon={<img src="https://img.icons8.com/color/16/000000/google-logo.png" alt="Google logo" />}
                    >
                        Sign in with Google
                    </Button>

                    {/* 2. Microsoft Sign-In Button */}
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={() => onLogin('microsoft')}
                        sx={socialButtonStyles}
                        startIcon={<img src="https://img.icons8.com/color/16/000000/microsoft.png" alt="Microsoft logo" />}
                    >
                        Sign in with Microsoft
                    </Button>

                </Stack>
            </DialogContent>
        </Dialog>
    );
}