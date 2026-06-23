import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import api from '../api/axios';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });

  const fetchDepts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/departments');
      setDepartments(data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchDepts(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', code: '', description: '' }); setDialogOpen(true); };
  const openEdit = (d) => { setEditing(d); setForm({ name: d.name, code: d.code, description: d.description || '' }); setDialogOpen(true); };

  const handleSave = async () => {
    try {
      if (editing) await api.put(`/departments/${editing.id}`, form);
      else await api.post('/departments', form);
      setDialogOpen(false);
      fetchDepts();
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this department?')) return;
    try {
      await api.delete(`/departments/${id}`);
      fetchDepts();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5">Departments</Typography>
          <Typography variant="body2" color="text.secondary">Organize employees by department</Typography>
        </Box>
        <Button startIcon={<Add />} variant="contained" onClick={openCreate}>Add Department</Button>
      </Box>

      <Grid container spacing={2}>
        {loading ? (
          <Grid item xs={12}><Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box></Grid>
        ) : departments.map((d) => (
          <Grid item xs={12} sm={6} md={4} key={d.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h6">{d.name}</Typography>
                    <Chip label={d.code} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => openEdit(d)}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(d.id)}><Delete fontSize="small" /></IconButton>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" mt={1}>{d.description || 'No description'}</Typography>
                <Typography variant="h4" color="primary" fontWeight={700} mt={2}>{d.employee_count}</Typography>
                <Typography variant="caption" color="text.secondary">Employees</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? 'Edit Department' : 'Add Department'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="normal" label="Department Name" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
          <TextField fullWidth margin="normal" label="Code" value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} />
          <TextField fullWidth margin="normal" label="Description" multiline rows={2} value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
