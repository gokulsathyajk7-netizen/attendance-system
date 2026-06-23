import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  AppBar, Toolbar, Typography, IconButton, Avatar, Menu, MenuItem,
  Divider, Badge, Tooltip, useTheme, useMediaQuery
} from '@mui/material';
import {
  Dashboard, People, AccessTime, Map, BeachAccess,
  Assessment, Settings, Logout, Menu as MenuIcon,
  Notifications, AccountCircle, LocationOn, Business
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

const DRAWER_WIDTH = 240;

const navItems = [
  { label: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { label: 'Employees', icon: <People />, path: '/employees' },
  { label: 'Departments', icon: <Business />, path: '/departments' },
  { label: 'Attendance', icon: <AccessTime />, path: '/attendance' },
  { label: 'Live Tracking', icon: <LocationOn />, path: '/tracking' },
  { label: 'Leaves', icon: <BeachAccess />, path: '/leaves' },
  { label: 'Reports', icon: <Assessment />, path: '/reports' },
  { label: 'Geofences', icon: <Map />, path: '/geofences' },
  { label: 'Settings', icon: <Settings />, path: '/settings' },
];

export default function AdminLayout({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#1A2035' }}>
      {/* Logo */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AccessTime sx={{ color: '#fff', fontSize: 20 }} />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={700} color="#fff">AttendMS</Typography>
          <Typography variant="caption" color="rgba(255,255,255,0.5)">Admin Panel</Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      {/* User info */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)' }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14 }}>
            {user?.name?.[0] || user?.email?.[0]?.toUpperCase()}
          </Avatar>
          <Box overflow="hidden">
            <Typography variant="body2" fontWeight={600} color="#fff" noWrap>{user?.name || user?.email}</Typography>
            <Typography variant="caption" color="rgba(255,255,255,0.5)" textTransform="capitalize">{user?.role?.replace('_', ' ')}</Typography>
          </Box>
        </Box>
      </Box>

      {/* Nav */}
      <List sx={{ px: 1, flex: 1 }}>
        {navItems.map((item) => {
          const active = location.pathname.startsWith(item.path);
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                onClick={() => isMobile && setMobileOpen(false)}
                sx={{
                  borderRadius: 2,
                  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                  bgcolor: active ? 'rgba(25,118,210,0.8)' : 'transparent',
                  '&:hover': { bgcolor: active ? 'rgba(25,118,210,0.9)' : 'rgba(255,255,255,0.08)', color: '#fff' },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 38 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 400 }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <List sx={{ px: 1, pb: 1 }}>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff', bgcolor: 'rgba(198,40,40,0.3)' } }}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 38 }}><Logout /></ListItemIcon>
            <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: 14 }} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* AppBar */}
      <AppBar position="fixed" elevation={0} sx={{ zIndex: theme.zIndex.drawer + 1, bgcolor: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <Toolbar>
          <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Notifications">
            <IconButton>
              <Badge badgeContent={3} color="error"><Notifications sx={{ color: '#6B7280' }} /></Badge>
            </IconButton>
          </Tooltip>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13 }}>
              {user?.name?.[0] || user?.email?.[0]?.toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/settings'); }}>
              <AccountCircle sx={{ mr: 1 }} fontSize="small" /> Profile
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}><Logout sx={{ mr: 1 }} fontSize="small" color="error" /> Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 'none' } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 'none', boxSizing: 'border-box' } }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main */}
      <Box component="main" sx={{ flexGrow: 1, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, mt: '64px', p: 3 }}>
        {children}
      </Box>
    </Box>
  );
}
