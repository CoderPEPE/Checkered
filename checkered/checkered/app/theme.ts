"use client";
import { createTheme } from "@mui/material/styles";

// Dark theme matching the Checkered racing aesthetic
// Background: near-black, Accents: indigo-to-purple gradient
export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#6366f1",
      light: "#818cf8",
      dark: "#4f46e5",
    },
    secondary: {
      main: "#a855f7",
      light: "#c084fc",
      dark: "#9333ea",
    },
    background: {
      default: "#08080c",
      paper: "#111115",
    },
    text: {
      primary: "#ededed",
      secondary: "#a1a1aa",
    },
    error: { main: "#ef4444" },
    success: { main: "#22c55e" },
    warning: { main: "#f59e0b" },
    info: { main: "#3b82f6" },
    divider: "rgba(255, 255, 255, 0.06)",
  },
  typography: {
    fontFamily: "var(--font-inter), system-ui, sans-serif",
    button: {
      textTransform: "none" as const,
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          colorScheme: "dark",
        },
        body: {
          backgroundImage: "none",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none" as const,
          fontWeight: 600,
          borderRadius: 10,
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          background: "rgba(17, 17, 21, 0.9)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: 14,
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            transform: "translateY(-3px)",
            borderColor: "rgba(99, 102, 241, 0.25)",
            boxShadow:
              "0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.1), inset 0 1px 0 rgba(255,255,255,0.03)",
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: "#0e0e12",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: 16,
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.6)",
          backgroundImage: "none",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined" as const,
        size: "small" as const,
      },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 12,
            background: "rgba(24, 24, 27, 0.6)",
            "& fieldset": {
              borderColor: "rgba(63, 63, 70, 0.5)",
            },
            "&:hover fieldset": {
              borderColor: "rgba(99, 102, 241, 0.3)",
            },
            "&.Mui-focused fieldset": {
              borderColor: "rgba(99, 102, 241, 0.4)",
              borderWidth: 1,
            },
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 4,
          borderRadius: 999,
          backgroundColor: "rgba(255, 255, 255, 0.06)",
        },
        bar: {
          borderRadius: 999,
          background: "linear-gradient(90deg, #6366f1, #a855f7)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: "0.7rem",
          letterSpacing: "0.05em",
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(39, 39, 42, 0.4)",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          background: "rgba(8, 8, 12, 0.7)",
          backdropFilter: "blur(40px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
          boxShadow: "none",
        },
      },
    },
  },
});
