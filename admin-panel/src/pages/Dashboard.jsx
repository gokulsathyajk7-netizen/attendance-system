import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress,
  LinearProgress, Avatar, Chip, Divider
} from '@mui/material';
import {
  People, CheckCircle, Cancel, BeachAccess, Schedule, Warning
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import api from '../api/axios';

const StatCard = ({ title, value, icon, color, subtitle, trend }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>{title}</Typography>
          <Typography variant="h4" fontWeight={700} mt={0.5} color={color}>{value}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
        <Avatar sx={{ bgcolor: `${color}20`, width: 48, height: 48 }}>
          {React.cloneElement(icon, { sx: { color } })}
        </Avatar>
      </Box>
      {trend !== undefined && (
        <Box mt={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">Attendance Rate</Typography>
            <Typography variant="caption" fontWeight={600}>{trend}%</Typography>
          </Box>
          <LinearProgress variant="determinate" value={trend} sx={{ height: 6, borderRadius: 3, bgcolor: `${color}20`, '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 } }} />
        </Box>
      )}
    </CardContent>
  </Card>
);

const COLORS = ['#1976D2', '#C62828', '#2E7D32', '#F57C00', '#6A1B9A'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, monthlyRes] = await Promise.all([
          api.get('/attendance/dashboard'),
          api.get('/reports/monthly'),
        ]);
        setStats(statsRes.data.data);
        // Format monthly data for chart
        const formatted = (monthlyRes.data.data || []).slice(0, 8).map(e => ({
          name: `${e.first_name} ${e.last_name}`.slice(0, 10),
          present: e.present || 0,
          absent: e.absent || 0,
          late: e.late_count || 0,
        }));
        setMonthlyData(formatted);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <CircularProgress size={48} />
    </Box>
  );

  const pieData = stats ? [
    { name: 'Present', value: stats.presentToday },
    { name: 'Absent', value: stats.absentToday },
    { name: 'On Leave', value: stats.onLeave },
    { name: 'Late', value: stats.lateToday },
  ] : [];

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5">Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">{today}</Typography>
        </Box>
        <Chip label="Live" color="success" size="small" sx={{ animation: 'pulse 2s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } } }} />
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="Total Employees" value={stats?.totalEmployees ?? 0} icon={<People />} color="#1976D2" subtitle="Active employees" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="Present Today" value={stats?.presentToday ?? 0} icon={<CheckCircle />} color="#2E7D32" trend={stats?.attendancePercentage} subtitle={`${stats?.attendancePercentage ?? 0}% attendance rate`} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="Absent Today" value={stats?.absentToday ?? 0} icon={<Cancel />} color="#C62828" subtitle="Not checked in yet" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="On Leave" value={stats?.onLeave ?? 0} icon={<BeachAccess />} color="#F57C00" subtitle={`${stats?.pendingLeaves ?? 0} pending approvals`} />
        </Grid>
      </Grid>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="Late Today" value={stats?.lateToday ?? 0} icon={<Warning />} color="#9C27B0" subtitle="Checked in late" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="Pending Leaves" value={stats?.pendingLeaves ?? 0} icon={<Schedule />} color="#0097A7" subtitle="Awaiting approval" />
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3}>
        {/* Today's Distribution */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 380 }}>
            <CardContent>
              <Typography variant="h6" mb={2}>Today's Overview</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Bar Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 380 }}>
            <CardContent>
              <Typography variant="h6" mb={2}>Monthly Attendance (Top Employees)</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" name="Present" fill="#1976D2" radius={[4,4,0,0]} />
                  <Bar dataKey="absent" name="Absent" fill="#C62828" radius={[4,4,0,0]} />
                  <Bar dataKey="late" name="Late" fill="#F57C00" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Department Stats */}
        {stats?.departmentStats?.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>Department-wise Attendance Today</Typography>
                <Grid container spacing={2}>
                  {stats.departmentStats.map((dept, i) => (
                    <Grid item xs={12} sm={6} md={3} key={i}>
                      <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#F4F6F9' }}>
                        <Typography variant="subtitle2" fontWeight={600}>{dept.department}</Typography>
                        <Typography variant="h4" color="primary" fontWeight={700}>{dept.present}</Typography>
                        <Typography variant="caption" color="text.secondary">Present Today</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
