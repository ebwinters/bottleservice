import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#f7a24b',
    },
    background: {
      default: '#f7f7fa',
      paper: '#fff',
    },
  },
  typography: {
    fontFamily: 'Roboto, Inter, Arial, sans-serif',
  },
});

export default theme;
