import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Button } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';

interface HeaderProps {
  logoUrl: string;
  barName: string;
  onSettingsClick: () => void;
  onSignOut: () => void;
  primaryColor?: string;
  secondaryColor?: string;
}

const Header: React.FC<HeaderProps> = ({ logoUrl, barName, onSettingsClick, onSignOut, primaryColor, secondaryColor }) => (
  <AppBar position="static" color="primary" elevation={1} sx={{ bgcolor: primaryColor }}>
    <Toolbar>
      <img
        src={logoUrl}
        alt="Bottleservice Logo"
        style={{ background: 'white', height: 40, width: 40, borderRadius: 10, marginRight: 16, boxShadow: '0 2px 8px #fff', objectFit: 'cover' }}
      />
      <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, fontFamily: 'Pacifico, cursive', letterSpacing: 1 }}>
        {barName}
      </Typography>
      <IconButton color="inherit" aria-label="settings" onClick={onSettingsClick} sx={{ mr: 1 }}>
        <SettingsIcon />
      </IconButton>
      <Button color="inherit" onClick={onSignOut} sx={{ bgcolor: secondaryColor || undefined, color: secondaryColor ? '#fff' : undefined, ml: 1 }}>
        Sign Out
      </Button>
    </Toolbar>
  </AppBar>
);

export default Header;
