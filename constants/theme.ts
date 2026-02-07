/**
 * Theme configuration for Mandarin Learning App
 * Compatible with Expo Router's default color scheme structure
 */

// Base colors
export const colors = {
  // Primary - Yellow accent
  primary: '#FFE799',
  primaryLight: '#FEFDDDF',
  primaryDark: '#F5D571',
  
  // Background colors
  background: '#141414',  // Dark gray background
  backgroundElevated: '#1A1A1A',       // Cards and elevated surfaces
  
  // Border colors
  border: '#3A3732',           // Olive-tinted border
  borderDark: '#2A2A2A',
  
  // Text colors
  text: '#FFE799',             // Primary yellow text
  textSecondary: '#888888',    // Gray text for labels
  textMuted: '#666666',
  
  // Progress bars
  progressBackground: '#333333',
  progressFill: '#FFE799',
  
  // System colors
  white: '#FFFFFF',
  black: '#000000',
};

// Color scheme for Expo Router (includes all required properties for themed components)
export const Colors = {
  light: {
    text: colors.text,
    background: colors.background,
    tint: colors.primary,
    icon: colors.textSecondary,
    tabIconDefault: colors.textSecondary,
    tabIconSelected: colors.primary,
    // Additional properties for ThemedText and ThemedView
    link: colors.primary,
    primaryText: colors.text,
    secondaryText: colors.textSecondary,
  },
  dark: {
    text: colors.text,
    background: colors.background,
    tint: colors.primary,
    icon: colors.textSecondary,
    tabIconDefault: colors.textSecondary,
    tabIconSelected: colors.primary,
    // Additional properties for ThemedText and ThemedView
    link: colors.primary,
    primaryText: colors.text,
    secondaryText: colors.textSecondary,
  },
};

// Typography scale - matching your design
export const typography = {
  // Headers
  headerLarge: {
    fontSize: 38,
    fontWeight: '700' as const,
    
  },
  headerSmall: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 1.5,
  },
  
  // Display sizes
  displayLarge: {
    fontSize: 56,
    fontWeight: '700' as const,
    letterSpacing: -1.5,
  },
  
  // Body text
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  
  // Titles
  title: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  
  // Labels and captions
  label: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 1.2,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.8,
  },
};

// Spacing scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 56,
};

// Border styles
export const borders = {
  width: 1,
  radius: 0, // No rounded corners!
  color: colors.border,
};

// Progress bar heights
export const progressBar = {
  main: 6,
  unit: 4,
};