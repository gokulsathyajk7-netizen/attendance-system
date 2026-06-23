import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Chip, Avatar,
  TextField, FormControl, InputLabel, Select, MenuItem, CircularProgress,
  Grid, InputAdornment
} from '@mui/material';
import { CalendarMonth, AccessTime } from '@mui/icons-material';
import api from '../api/axios';

const STATUS_COLORS = { present: 'success', absent: 'error', half_day: 'warning', leave: 'info', weekend: 'default', holiday: 'default' };

const fmtTime = (t) => t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-';
const fmtMinutes = (m) => { if (!m) return '0h 0m'; return `${Math.floor(m/60)}h ${m%60}m`; };

export default function AttendancePage() {
  const [records, setRecords] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date, page: page + 1, limit: rowsPerPage,
        ...(deptFilter && { department_id: deptFilter }),
        ...(statusFilter && { status: statusFilter }),
      });
      const { data } = await api.get(`/attendance/admin/list?${params}`);
      setRecords(data.data);
      setTotal(data.pagination.total);

      const { data: dailyData } = await api.get(`/reports/daily?date=${date}`);
      setSummary(dailyData.data.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [date, page, rowsPerPage, deptFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    api.get('/departments').then(({ data }) => setDepartments(data.data)).catch(() => {});
  }, []);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">Attendance</Typography>
        <Typography variant="body2" color="text.secondary">Track daily check-ins and check-outs</Typography>
      </Box>

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={2} mb={3}>
          {[
            { label: 'Total', value: summary.total, color: '#1976D2' },
            { label: 'Present', value: summary.present, color: '#2E7D32' },
            { label: 'Absent', value: summary.absent, color: '#C62828' },
            { label: 'Late', value: summary.late, color: '#F57C00' },
            { label: 'On Leave', value: summary.onLeave, color: '#0097A7' },
            { label: 'Half Day', value: summary.halfDay, color: '#6A1B9A' },
          ].map((s, i) => (
            <Grid item xs={6} sm={4} md={2} key={i}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h5" fontWeight={700} color={s.color}>{s.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              type="date" size="small" value={date} onChange={(e) => { setDate(e.target.value); setPage(0); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonth fontSize="small" /></InputAdornment> }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Department</InputLabel>
              <Select value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(0); }} label="Department">
                <MenuItem value="">All</MenuItem>
                {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} label="Status">
                <MenuItem value="">All</MenuItem>
                <MenuItem value="present">Present</MenuItem>
                <MenuItem value="absent">Absent</MenuItem>
                <MenuItem value="half_day">Half Day</MenuItem>
                <MenuItem value="leave">Leave</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Check In</TableCell>
                  <TableCell>Check Out</TableCell>
                  <TableCell>Working Hours</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Late</TableCell>
                  <TableCell>Geofence</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow>
                ) : records.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><Typography color="text.secondary">No attendance records for this date</Typography></TableCell></TableRow>
                ) : records.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar src={r.profile_image ? `/uploads/${r.profile_image}` : undefined} sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 12 }}>
                          {r.first_name?.[0]}{r.last_name?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{r.first_name} {r.last_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{r.employee_code}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{r.department_name || '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTime fontSize="small" color="action" /> {fmtTime(r.check_in_time)}
                      </Box>
                    </TableCell>
                    <TableCell>{fmtTime(r.check_out_time)}</TableCell>
                    <TableCell>{fmtMinutes(r.total_working_minutes)}</TableCell>
                    <TableCell><Chip label={r.status} color={STATUS_COLORS[r.status] || 'default'} size="small" /></TableCell>
                    <TableCell>
                      {r.is_late ? <Chip label={`+${r.late_by_minutes}m`} color="warning" size="small" variant="outlined" /> : '-'}
                    </TableCell>
                    <TableCell>
                      {r.inside_geofence === 1 ? <Chip label="Inside" color="success" size="small" variant="outlined" /> :
                       r.inside_geofence === 0 ? <Chip label="Outside" color="error" size="small" variant="outlined" /> : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 20, 50]}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
