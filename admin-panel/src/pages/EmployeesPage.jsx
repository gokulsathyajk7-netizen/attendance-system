import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, IconButton, Chip, Avatar, Menu, MenuItem, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, FormControl,
  InputLabel, Select, CircularProgress, Tooltip, Alert
} from '@mui/material';
import {
  Search, Add, MoreVert, Edit, Delete, Block, CheckCircle,
  Download, FilterList, Visibility
} from '@mui/icons-material';
import api from '../api/axios';

const STATUS_COLORS = { active: 'success', inactive: 'default', suspended: 'error' };

function EmployeeForm({ open, onClose, employee, departments, onSaved }) {
  const isEdit = Boolean(employee);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', mobile: '', department_id: '',
    designation: '', salary: '', joining_date: '', role: 'employee', status: 'active',
    address: '', emergency_contact: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (employee) {
      setForm({
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        mobile: employee.mobile || '',
        department_id: employee.department_id || '',
        designation: employee.designation || '',
        salary: employee.salary || '',
        joining_date: employee.joining_date ? employee.joining_date.split('T')[0] : '',
        role: employee.role || 'employee',
        status: employee.status || 'active',
        address: employee.address || '',
        emergency_contact: employee.emergency_contact || '',
      });
    } else {
      setForm({ first_name:'',last_name:'',email:'',mobile:'',department_id:'',designation:'',salary:'',joining_date:'',role:'employee',status:'active',address:'',emergency_contact:'' });
    }
  }, [employee]);

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => v !== '' && formData.append(k, v));
      if (isEdit) {
        await api.put(`/employees/${employee.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/employees', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}><TextField fullWidth label="First Name" value={form.first_name} onChange={set('first_name')} required /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Last Name" value={form.last_name} onChange={set('last_name')} required /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Email" type="email" value={form.email} onChange={set('email')} required disabled={isEdit} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Mobile" value={form.mobile} onChange={set('mobile')} required /></Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Department</InputLabel>
              <Select value={form.department_id} onChange={set('department_id')} label="Department">
                {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Designation" value={form.designation} onChange={set('designation')} required /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Salary" type="number" value={form.salary} onChange={set('salary')} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Joining Date" type="date" value={form.joining_date} onChange={set('joining_date')} required InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select value={form.role} onChange={set('role')} label="Role">
                <MenuItem value="employee">Employee</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="super_admin">Super Admin</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={form.status} onChange={set('status')} label="Status">
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}><TextField fullWidth label="Address" multiline rows={2} value={form.address} onChange={set('address')} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Emergency Contact" value={form.emergency_contact} onChange={set('emergency_contact')} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={20} /> : isEdit ? 'Update' : 'Create Employee'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page + 1, limit: rowsPerPage,
        ...(search && { search }),
        ...(deptFilter && { department_id: deptFilter }),
        ...(statusFilter && { status: statusFilter }),
      });
      const { data } = await api.get(`/employees?${params}`);
      setEmployees(data.data);
      setTotal(data.pagination.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, deptFilter, statusFilter]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
  useEffect(() => {
    api.get('/departments').then(({ data }) => setDepartments(data.data)).catch(() => {});
  }, []);

  const handleMenuOpen = (e, emp) => { setMenuAnchor(e.currentTarget); setSelectedEmp(emp); };
  const handleMenuClose = () => { setMenuAnchor(null); };

  const handleDelete = async () => {
    try {
      await api.delete(`/employees/${selectedEmp.id}`);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
    setDeleteConfirm(false);
    handleMenuClose();
  };

  const handleStatusToggle = async (status) => {
    try {
      await api.patch(`/employees/${selectedEmp.id}/status`, { status });
      fetchEmployees();
    } catch {}
    handleMenuClose();
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/employees/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'employees.csv'; a.click();
    } catch {}
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5">Employees</Typography>
          <Typography variant="body2" color="text.secondary">{total} total employees</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<Download />} variant="outlined" onClick={handleExport}>Export CSV</Button>
          <Button startIcon={<Add />} variant="contained" onClick={() => { setSelectedEmp(null); setFormOpen(true); }}>Add Employee</Button>
        </Box>
      </Box>

      <Card>
        <CardContent>
          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search employees..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              size="small" sx={{ minWidth: 260 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Department</InputLabel>
              <Select value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(0); }} label="Department">
                <MenuItem value="">All</MenuItem>
                {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} label="Status">
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Designation</TableCell>
                  <TableCell>Mobile</TableCell>
                  <TableCell>Joining Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow>
                ) : employees.length === 0 ? (
                  <TableRow><TableCell colSpan={9} align="center" sx={{ py: 6 }}><Typography color="text.secondary">No employees found</Typography></TableCell></TableRow>
                ) : employees.map((emp) => (
                  <TableRow key={emp.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar src={emp.profile_image ? `/uploads/${emp.profile_image}` : undefined} sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 13 }}>
                          {emp.first_name?.[0]}{emp.last_name?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{emp.first_name} {emp.last_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{emp.email}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><Typography variant="body2" fontFamily="monospace">{emp.employee_code}</Typography></TableCell>
                    <TableCell>{emp.department_name || '-'}</TableCell>
                    <TableCell>{emp.designation}</TableCell>
                    <TableCell>{emp.mobile}</TableCell>
                    <TableCell>{emp.joining_date ? new Date(emp.joining_date).toLocaleDateString('en-IN') : '-'}</TableCell>
                    <TableCell><Chip label={emp.status} color={STATUS_COLORS[emp.status] || 'default'} size="small" /></TableCell>
                    <TableCell><Chip label={emp.role?.replace('_', ' ')} size="small" variant="outlined" /></TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, emp)}><MoreVert /></IconButton>
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

      {/* Row Actions Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={() => { setFormOpen(true); handleMenuClose(); }}><Edit fontSize="small" sx={{ mr: 1 }} /> Edit</MenuItem>
        <MenuItem onClick={() => handleStatusToggle(selectedEmp?.status === 'active' ? 'suspended' : 'active')}>
          {selectedEmp?.status === 'active' ? <><Block fontSize="small" sx={{ mr: 1 }} /> Suspend</> : <><CheckCircle fontSize="small" sx={{ mr: 1 }} /> Activate</>}
        </MenuItem>
        <MenuItem onClick={() => { setDeleteConfirm(true); handleMenuClose(); }} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirm */}
      <Dialog open={deleteConfirm} onClose={() => setDeleteConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Employee?</DialogTitle>
        <DialogContent><Typography>This will permanently delete <strong>{selectedEmp?.first_name} {selectedEmp?.last_name}</strong> and all their data.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Form */}
      <EmployeeForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        employee={selectedEmp}
        departments={departments}
        onSaved={fetchEmployees}
      />
    </Box>
  );
}
