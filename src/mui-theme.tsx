import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#f0984e', // orange from logo
      contrastText: '#fff',
    },
    secondary: {
      main: '#bfa76f', // gold/bronze
    },
    background: {
      default: '#f5f3ea', // light tan
      paper: '#fffbe6', // off-white with warmth
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
          background: '#f0984e',
        },
      },
    },
  },
});

export default theme;
