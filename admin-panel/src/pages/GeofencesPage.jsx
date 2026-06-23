import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress
} from '@mui/material';
import { Add, Edit, Delete, MyLocation } from '@mui/icons-material';
import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet';
import api from '../api/axios';

function LocationPicker({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng); } });
  return null;
}

export default function GeofencesPage() {
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', latitude: 11.1271, longitude: 78.6569, radius_meters: 100, address: '' });

  const fetchGeofences = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/location/geofences');
      setGeofences(data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchGeofences(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', latitude: 11.1271, longitude: 78.6569, radius_meters: 100, address: '' });
    setDialogOpen(true);
  };

  const openEdit = (geo) => {
    setEditing(geo);
    setForm({ name: geo.name, latitude: parseFloat(geo.latitude), longitude: parseFloat(geo.longitude), radius_meters: geo.radius_meters, address: geo.address || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/location/geofences/${editing.id}`, form);
      } else {
        await api.post('/location/geofences', form);
      }
      setDialogOpen(false);
      fetchGeofences();
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this geofence?')) return;
    await api.delete(`/location/geofences/${id}`);
    fetchGeofences();
  };

  const useCurrentLocation = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setForm(f => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5">Geofences</Typography>
          <Typography variant="body2" color="text.secondary">Define office locations for check-in validation</Typography>
        </Box>
        <Button startIcon={<Add />} variant="contained" onClick={openCreate}>Add Geofence</Button>
      </Box>

      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell><TableCell>Coordinates</TableCell>
                  <TableCell>Radius</TableCell><TableCell>Status</TableCell><TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow>
                ) : geofences.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}><Typography color="text.secondary">No geofences configured</Typography></TableCell></TableRow>
                ) : geofences.map((g) => (
                  <TableRow key={g.id} hover>
                    <TableCell>{g.name}</TableCell>
                    <TableCell><Typography variant="body2" fontFamily="monospace">{parseFloat(g.latitude).toFixed(5)}, {parseFloat(g.longitude).toFixed(5)}</Typography></TableCell>
                    <TableCell>{g.radius_meters}m</TableCell>
                    <TableCell><Chip label={g.is_active ? 'Active' : 'Inactive'} color={g.is_active ? 'success' : 'default'} size="small" /></TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => openEdit(g)}><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(g.id)}><Delete fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Geofence' : 'Add Geofence'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField fullWidth label="Office Name" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Address" value={form.address} onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Latitude" type="number" value={form.latitude} onChange={(e) => setForm(p => ({ ...p, latitude: parseFloat(e.target.value) }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Longitude" type="number" value={form.longitude} onChange={(e) => setForm(p => ({ ...p, longitude: parseFloat(e.target.value) }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Radius (meters)" type="number" value={form.radius_meters} onChange={(e) => setForm(p => ({ ...p, radius_meters: parseInt(e.target.value) }))} /></Grid>
            <Grid item xs={12}>
              <Button size="small" startIcon={<MyLocation />} onClick={useCurrentLocation}>Use My Current Location</Button>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ height: 250, borderRadius: 1, overflow: 'hidden' }}>
                <MapContainer key={`${form.latitude}-${form.longitude}`} center={[form.latitude, form.longitude]} zoom={16} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[form.latitude, form.longitude]} />
                  <Circle center={[form.latitude, form.longitude]} radius={form.radius_meters} pathOptions={{ color: '#1976D2', fillOpacity: 0.15 }} />
                  <LocationPicker onPick={(latlng) => setForm(p => ({ ...p, latitude: latlng.lat, longitude: latlng.lng }))} />
                </MapContainer>
              </Box>
              <Typography variant="caption" color="text.secondary">Click on the map to set coordinates</Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
