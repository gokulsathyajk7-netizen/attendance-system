import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  InputAdornment, IconButton, Alert, CircularProgress, Divider
} from '@mui/material';
import { Visibility, VisibilityOff, AccessTime, Lock, Email } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      const redirects = { super_admin: '/dashboard', admin: '/dashboard', manager: '/dashboard', employee: '/dashboard' };
      navigate(redirects[user.role] || '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1A2035 0%, #1976D2 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2
    }}>
      <Card sx={{ width: '100%', maxWidth: 420, borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: 3,
              background: 'linear-gradient(135deg, #1976D2, #42A5F5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2
            }}>
              <AccessTime sx={{ color: '#fff', fontSize: 36 }} />
            </Box>
            <Typography variant="h5" fontWeight={700} color="primary">AttendMS</Typography>
            <Typography variant="body2" color="text.secondary">Employee Attendance Management</Typography>
          </Box>

          <Typography variant="h6" fontWeight={600} gutterBottom>Sign In</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>Enter your credentials to access the dashboard</Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth label="Email Address" type="email" value={form.email}
              onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
              required margin="normal"
              InputProps={{ startAdornment: <InputAdornment position="start"><Email color="action" /></InputAdornment> }}
            />
            <TextField
              fullWidth label="Password" type={showPass ? 'text' : 'password'} value={form.password}
              onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
              required margin="normal"
              InputProps={{
                startAdornment: <InputAdornment position="start"><Lock color="action" /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPass(!showPass)} edge="end">
                      {showPass ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ textAlign: 'right', mt: 0.5, mb: 2 }}>
              <Typography
                variant="body2" color="primary" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                onClick={() => navigate('/forgot-password')}
              >
                Forgot password?
              </Typography>
            </Box>

            <Button
              fullWidth type="submit" variant="contained" size="large"
              disabled={loading} sx={{ py: 1.5, borderRadius: 2, fontSize: 16 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />
          <Box sx={{ bgcolor: '#F4F6F9', borderRadius: 2, p: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block" fontWeight={600} mb={0.5}>Demo Credentials</Typography>
            <Typography variant="caption" color="text.secondary" display="block">Admin: superadmin@company.com</Typography>
            <Typography variant="caption" color="text.secondary" display="block">Password: Admin@123</Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
