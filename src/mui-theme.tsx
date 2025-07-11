import { createTheme } from '@mui/material/styles';

export function getTheme(primaryColor?: string, secondaryColor?: string) {
  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: primaryColor || '#f0984e',
        contrastText: '#fff',
      },
      secondary: {
        main: secondaryColor || '#bfa76f',
      },
      background: {
        default: '#f5f3ea',
        paper: '#fffbe6',
      },
      text: {
        primary: '#2d2d2d',
        secondary: '#7a6c4f',
      },
    },
    typography: {
      fontFamily: 'Roboto, Inter, Arial, sans-serif',
      h6: {
        fontFamily: 'Pacifico, cursive',
        fontWeight: 700,
        letterSpacing: 1,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            textTransform: 'none',
            fontWeight: 600,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: primaryColor || '#f0984e',
          },
        },
      },
    },
  });
}
