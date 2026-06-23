import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Grid, Alert, Avatar, Divider } from '@mui/material';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';

export function SettingsPage() {
  const { user } = useAuth();
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState(null);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.put('/auth/change-password', pwForm);
      setMsg({ type: 'success', text: 'Password changed successfully' });
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to change password' });
    }
  };

  return (
    <Box>
      <Typography variant="h5" mb={3}>Settings</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'primary.main', fontSize: 28 }}>
                {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase()}
              </Avatar>
              <Typography variant="h6">{user?.first_name ? `${user.first_name} ${user.last_name}` : user?.email}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
              <Typography variant="caption" color="text.secondary" textTransform="capitalize">{user?.role?.replace('_', ' ')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>Change Password</Typography>
              {msg && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}
              <Box component="form" onSubmit={handlePasswordChange}>
                <TextField fullWidth margin="normal" label="Current Password" type="password" value={pwForm.currentPassword}
                  onChange={(e) => setPwForm(p => ({ ...p, currentPassword: e.target.value }))} required />
                <TextField fullWidth margin="normal" label="New Password" type="password" value={pwForm.newPassword}
                  onChange={(e) => setPwForm(p => ({ ...p, newPassword: e.target.value }))} required
                  helperText="Min 8 chars, 1 uppercase, 1 number, 1 special character" />
                <Button type="submit" variant="contained" sx={{ mt: 2 }}>Update Password</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Request failed');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F4F6F9', p: 2 }}>
      <Card sx={{ maxWidth: 420, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" mb={1}>Reset Password</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>Enter your email to receive a reset link</Typography>
          {sent ? (
            <Alert severity="success">If this email exists, a reset link has been sent.</Alert>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <TextField fullWidth label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required margin="normal" />
              <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>Send Reset Link</Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
