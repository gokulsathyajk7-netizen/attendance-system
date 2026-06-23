import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, Tabs, Tab
} from '@mui/material';
import { Download, PictureAsPdf, TableChart } from '@mui/icons-material';
import api from '../api/axios';

export default function ReportsPage() {
  const [tab, setTab] = useState('monthly');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (tab === 'monthly') {
        const { data: res } = await api.get(`/reports/monthly?month=${month}&year=${year}`);
        setData(res.data);
      } else if (tab === 'department') {
        const { data: res } = await api.get(`/reports/department`);
        setData(res.data);
      } else if (tab === 'daily') {
        const { data: res } = await api.get(`/reports/daily?date=${date}`);
        setData(res.data.records);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [tab]);

  const downloadFile = async (url, filename) => {
    try {
      const response = await api.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a'); a.href = blobUrl; a.download = filename; a.click();
    } catch (err) {
      alert('Export failed');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">Reports</Typography>
        <Typography variant="body2" color="text.secondary">Generate and export attendance reports</Typography>
      </Box>

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid #E5E7EB' }}>
          <Tab label="Daily Report" value="daily" />
          <Tab label="Monthly Report" value="monthly" />
          <Tab label="Department Report" value="department" />
        </Tabs>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            {tab === 'daily' && (
              <TextField type="date" size="small" label="Date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            )}
            {tab === 'monthly' && (
              <>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Month</InputLabel>
                  <Select value={month} onChange={(e) => setMonth(e.target.value)} label="Month">
                    {Array.from({ length: 12 }, (_, i) => (
                      <MenuItem key={i+1} value={i+1}>{new Date(2024, i).toLocaleString('en', { month: 'long' })}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField type="number" size="small" label="Year" value={year} onChange={(e) => setYear(e.target.value)} sx={{ width: 110 }} />
              </>
            )}
            <Button variant="contained" onClick={fetchReport} disabled={loading}>Generate</Button>
            <Box sx={{ flex: 1 }} />
            <Button startIcon={<TableChart />} variant="outlined" onClick={() => downloadFile(`/reports/export/excel?type=daily&date=${date}`, `report_${date}.xlsx`)}>Excel</Button>
            <Button startIcon={<PictureAsPdf />} variant="outlined" color="error" onClick={() => downloadFile(`/reports/export/pdf?date=${date}`, `report_${date}.pdf`)}>PDF</Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : (
            <TableContainer>
              {tab === 'monthly' && (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee</TableCell><TableCell>Code</TableCell><TableCell>Department</TableCell>
                      <TableCell>Present</TableCell><TableCell>Absent</TableCell><TableCell>Half Day</TableCell>
                      <TableCell>Leave</TableCell><TableCell>Late</TableCell><TableCell>Total Hours</TableCell>
                      <TableCell>Attendance %</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.map((r, i) => (
                      <TableRow key={i} hover>
                        <TableCell>{r.first_name} {r.last_name}</TableCell>
                        <TableCell>{r.employee_code}</TableCell>
                        <TableCell>{r.department}</TableCell>
                        <TableCell>{r.present || 0}</TableCell>
                        <TableCell>{r.absent || 0}</TableCell>
                        <TableCell>{r.half_day || 0}</TableCell>
                        <TableCell>{r.leave || 0}</TableCell>
                        <TableCell>{r.late_count || 0}</TableCell>
                        <TableCell>{r.total_hours}</TableCell>
                        <TableCell>{r.attendance_pct || 0}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {tab === 'department' && (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Department</TableCell><TableCell>Employees</TableCell>
                      <TableCell>Present</TableCell><TableCell>Absent</TableCell>
                      <TableCell>Late</TableCell><TableCell>Avg Hours</TableCell><TableCell>Attendance %</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.map((r, i) => (
                      <TableRow key={i} hover>
                        <TableCell>{r.department}</TableCell>
                        <TableCell>{r.total_employees}</TableCell>
                        <TableCell>{r.present_count || 0}</TableCell>
                        <TableCell>{r.absent_count || 0}</TableCell>
                        <TableCell>{r.late_count || 0}</TableCell>
                        <TableCell>{r.avg_working_hours}</TableCell>
                        <TableCell>{r.attendance_pct || 0}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {tab === 'daily' && (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee</TableCell><TableCell>Department</TableCell><TableCell>Status</TableCell>
                      <TableCell>Check In</TableCell><TableCell>Check Out</TableCell><TableCell>Hours</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.map((r, i) => (
                      <TableRow key={i} hover>
                        <TableCell>{r.first_name} {r.last_name}</TableCell>
                        <TableCell>{r.department}</TableCell>
                        <TableCell>{r.status || 'absent'}</TableCell>
                        <TableCell>{r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '-'}</TableCell>
                        <TableCell>{r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '-'}</TableCell>
                        <TableCell>{r.total_working_minutes ? `${Math.floor(r.total_working_minutes/60)}h ${r.total_working_minutes%60}m` : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
