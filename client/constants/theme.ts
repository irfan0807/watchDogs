import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#E6F4F1",
    textSecondary: "#7A8C8E",
    textTertiary: "#3D4F51",
    buttonText: "#0A0E14",
    tabIconDefault: "#3D4F51",
    tabIconSelected: "#00F5FF",
    link: "#00F5FF",
    backgroundRoot: "#0A0E14",
    backgroundDefault: "#151922",
    backgroundSecondary: "#1A1F2A",
    backgroundTertiary: "#242B38",
    primary: "#00F5FF",
    secondary: "#39FF14",
    warning: "#FFB800",
    danger: "#FF0055",
    border: "rgba(0, 245, 255, 0.13)",
    borderGlow: "rgba(0, 245, 255, 0.4)",
    online: "#39FF14",
    offline: "#3D4F51",
  },
  dark: {
    text: "#E6F4F1",
    textSecondary: "#7A8C8E",
    textTertiary: "#3D4F51",
    buttonText: "#0A0E14",
    tabIconDefault: "#3D4F51",
    tabIconSelected: "#00F5FF",
    link: "#00F5FF",
    backgroundRoot: "#0A0E14",
    backgroundDefault: "#151922",
    backgroundSecondary: "#1A1F2A",
    backgroundTertiary: "#242B38",
    primary: "#00F5FF",
    secondary: "#39FF14",
    warning: "#FFB800",
    danger: "#FF0055",
    border: "rgba(0, 245, 255, 0.13)",
    borderGlow: "rgba(0, 245, 255, 0.4)",
    online: "#39FF14",
    offline: "#3D4F51",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 24,
    fontWeight: "700" as const,
    letterSpacing: 1.2,
  },
  h2: {
    fontSize: 20,
    fontWeight: "700" as const,
    letterSpacing: 1,
  },
  h3: {
    fontSize: 18,
    fontWeight: "600" as const,
    letterSpacing: 0.8,
  },
  h4: {
    fontSize: 16,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 12,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  terminal: {
    fontSize: 14,
    fontWeight: "400" as const,
    letterSpacing: 0.5,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "'Courier New', SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
  },
});
