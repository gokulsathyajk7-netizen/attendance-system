import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import theme from './theme';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import EmployeesPage from './pages/EmployeesPage';
import AttendancePage from './pages/AttendancePage';
import TrackingPage from './pages/TrackingPage';
import LeavesPage from './pages/LeavesPage';
import ReportsPage from './pages/ReportsPage';
import GeofencesPage from './pages/GeofencesPage';
import DepartmentsPage from './pages/DepartmentsPage';
import { SettingsPage, ForgotPasswordPage } from './pages/SettingsPage';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/employees" element={<ProtectedRoute roles={['super_admin','admin','manager']}><EmployeesPage /></ProtectedRoute>} />
              <Route path="/departments" element={<ProtectedRoute roles={['super_admin','admin']}><DepartmentsPage /></ProtectedRoute>} />
              <Route path="/attendance" element={<ProtectedRoute roles={['super_admin','admin','manager']}><AttendancePage /></ProtectedRoute>} />
              <Route path="/tracking" element={<ProtectedRoute roles={['super_admin','admin','manager']}><TrackingPage /></ProtectedRoute>} />
              <Route path="/leaves" element={<ProtectedRoute><LeavesPage /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute roles={['super_admin','admin','manager']}><ReportsPage /></ProtectedRoute>} />
              <Route path="/geofences" element={<ProtectedRoute roles={['super_admin','admin']}><GeofencesPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}
