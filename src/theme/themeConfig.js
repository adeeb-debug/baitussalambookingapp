/**
 * ============================================================
 *  THEME CONFIG — edit anything in this file to re-skin the app.
 *  Nothing else needs to change: every component reads its
 *  colors, fonts, and shape from the theme built in theme.js
 *  using these values.
 * ============================================================
 */

// --- 1. BRAND COLORS ------------------------------------------------
// Palette: Background: #f2f7f5 | Headline: #00473e | Paragraph: #475d5b
// Primary/Highlight: #faae2b | Secondary: #ffa8ba | Error: #fa5246
export const COLORS = {
  primary: {
    main: "#faae2b", // Vibrant golden orange (Buttons & CTA highlights)
    dark: "#d9931d", // Darker shade for hover states
    light: "#fbc257", // Soft highlight background tint
    contrastText: "#00473e", // Dark text on primary buttons for high contrast
  },
  secondary: {
    main: "#00473e", // Deep Forest Green (Headline accent & major UI headers)
    dark: "#00332c", // Deeper dark green for active/pressed elements
    light: "#ffa8ba", // Soft pink accent (Illustrations & badges)
    contrastText: "#ffffff",
  },
  success: { main: "#2e7d32" },
  warning: { main: "#ed6c02" },
  error: { main: "#fa5246" }, // Coral red for destructive actions & alerts

  // Page surface & typography structure
  background: {
    default: "#f2f7f5", // Main off-white canvas background
    paper: "#ffffff", // Pure white for cards, modals, and sidebar surfaces
    subtle: "#e6ede9", // Slightly darker tint for subtle containers/hover rows
  },
  text: {
    primary: "#00473e", // Headlines & primary element text
    secondary: "#475d5b", // Muted paragraph & descriptive copy
    disabled: "rgba(71, 93, 91, 0.4)",
  },
  divider: "rgba(0, 71, 62, 0.08)", // Crisp, dynamic border line derived from primary green
};

// --- 2. FONTS --------------------------------------------------------
// Recommended modern stack: Outfit (Headings) + Public Sans (Body)
export const FONTS = {
  heading: '"Outfit", "Plus Jakarta Sans", sans-serif',
  body: '"Public Sans", -apple-system, BlinkMacSystemFont, sans-serif',
};

// --- 3. SHAPE ----------------------------------------------------------
export const RADIUS = {
  base: 12,
  card: 14,
  dialog: 16,
};

// --- 4. SHADOW INTENSITY ------------------------------------------------
export const SHADOW_INTENSITY = 1;

// --- 5. LAYOUT -----------------------------------------------------------
export const LAYOUT = {
  sidebarWidth: 264,
  contentMaxWidth: 1200,
};