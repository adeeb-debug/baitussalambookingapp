import { createTheme } from "@mui/material/styles";
import { COLORS, FONTS, RADIUS, SHADOW_INTENSITY } from "./themeConfig";

// Generates a 25-entry MUI shadow scale from a single intensity dial (0-2).
function buildShadows(intensity) {
  const none = "none";
  if (intensity <= 0) {
    return Array(25).fill(none);
  }
  const strength = intensity >= 2 ? 1.6 : 1;
  const soft = `0px 1px 2px rgba(16,24,40,${0.05 * strength})`;
  const mid = `0px 4px 12px rgba(16,24,40,${0.07 * strength})`;
  const strong = `0px 8px 20px rgba(16,24,40,${0.08 * strength})`;
  return [none, soft, soft, mid, mid, strong, ...Array(19).fill(strong)];
}

export const appTheme = createTheme({
  palette: {
    primary: COLORS.primary,
    secondary: COLORS.secondary,
    success: COLORS.success,
    warning: COLORS.warning,
    error: COLORS.error,
    background: COLORS.background,
    text: COLORS.text,
    divider: COLORS.divider,
  },
  typography: {
    fontFamily: FONTS.body,
    h1: { fontFamily: FONTS.heading, fontWeight: 800, letterSpacing: -0.5 },
    h2: { fontFamily: FONTS.heading, fontWeight: 800, letterSpacing: -0.5 },
    h3: { fontFamily: FONTS.heading, fontWeight: 800, letterSpacing: -0.5 },
    h4: { fontFamily: FONTS.heading, fontWeight: 800, letterSpacing: -0.4 },
    h5: { fontFamily: FONTS.heading, fontWeight: 700, letterSpacing: -0.3 },
    h6: { fontFamily: FONTS.heading, fontWeight: 700 },
    button: { fontWeight: 600, textTransform: "none" },
  },
  shape: { borderRadius: RADIUS.base },
  shadows: buildShadows(SHADOW_INTENSITY),
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: RADIUS.base - 3, fontWeight: 600, boxShadow: "none" },
        containedPrimary: {
          boxShadow: "none",
          "&:hover": { boxShadow: `0px 4px 10px ${COLORS.primary.main}40` },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
        rounded: { borderRadius: RADIUS.card },
      },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: RADIUS.base - 3,
          backgroundColor: COLORS.background.paper,
          transition: "box-shadow 0.15s ease",
          "&.Mui-focused": {
            boxShadow: `0px 0px 0px 3px ${COLORS.primary.main}24`,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, borderRadius: RADIUS.base - 5 } },
    },
    MuiTableCell: {
      styleOverrides: { root: { borderColor: COLORS.divider } },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: RADIUS.base - 2 } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: RADIUS.dialog },
      },
    },
  },
});
