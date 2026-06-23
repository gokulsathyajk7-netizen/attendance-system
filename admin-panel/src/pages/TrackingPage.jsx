import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Avatar, Chip,
  List, ListItem, ListItemAvatar, ListItemText, CircularProgress, Divider
} from '@mui/material';
import { LocationOn, AccessTime } from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import api from '../api/axios';

// Fix default marker icon issue with leaflet+vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function TrackingPage() {
  const [employees, setEmployees] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState(null);

  const fetchData = async () => {
    try {
      const [locRes, geoRes] = await Promise.all([
        api.get('/location/live'),
        api.get('/location/geofences'),
      ]);
      setEmployees(locRes.data.data.filter(e => e.latitude && e.longitude));
      setGeofences(geoRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const defaultCenter = geofences[0]
    ? [parseFloat(geofences[0].latitude), parseFloat(geofences[0].longitude)]
    : employees[0]
    ? [parseFloat(employees[0].latitude), parseFloat(employees[0].longitude)]
    : [11.1271, 78.6569]; // Tamil Nadu fallback

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <CircularProgress size={48} />
    </Box>
  );

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">Live Tracking</Typography>
        <Typography variant="body2" color="text.secondary">{employees.length} employees with active location · Refreshes every 15s</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 600 }}>
            <MapContainer center={defaultCenter} zoom={14} style={{ height: '100%', width: '100%', borderRadius: 12 }}>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {geofences.map((geo) => (
                <Circle
                  key={geo.id}
                  center={[parseFloat(geo.latitude), parseFloat(geo.longitude)]}
                  radius={geo.radius_meters}
                  pathOptions={{ color: '#1976D2', fillColor: '#1976D2', fillOpacity: 0.1 }}
                >
                  <Popup>{geo.name} (Radius: {geo.radius_meters}m)</Popup>
                </Circle>
              ))}
              {employees.map((emp) => (
                <Marker key={emp.id} position={[parseFloat(emp.latitude), parseFloat(emp.longitude)]}>
                  <Popup>
                    <Typography variant="subtitle2" fontWeight={600}>{emp.first_name} {emp.last_name}</Typography>
                    <Typography variant="caption" display="block">{emp.employee_code} · {emp.department}</Typography>
                    <Typography variant="caption" display="block">Status: {emp.attendance_status || 'No record'}</Typography>
                    <Typography variant="caption" color="text.secondary">Updated: {emp.recorded_at ? new Date(emp.recorded_at).toLocaleTimeString() : '-'}</Typography>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: 600, overflow: 'auto' }}>
            <CardContent>
              <Typography variant="h6" mb={2}>Active Employees</Typography>
              {employees.length === 0 ? (
                <Typography color="text.secondary" variant="body2">No employees currently sharing location.</Typography>
              ) : (
                <List disablePadding>
                  {employees.map((emp, idx) => (
                    <React.Fragment key={emp.id}>
                      <ListItem disableGutters sx={{ cursor: 'pointer' }} onClick={() => setSelectedEmp(emp)}>
                        <ListItemAvatar>
                          <Avatar src={emp.profile_image ? `/uploads/${emp.profile_image}` : undefined} sx={{ bgcolor: 'primary.main' }}>
                            {emp.first_name?.[0]}{emp.last_name?.[0]}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${emp.first_name} ${emp.last_name}`}
                          secondary={
                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AccessTime sx={{ fontSize: 12 }} />
                              {emp.recorded_at ? new Date(emp.recorded_at).toLocaleTimeString() : '-'}
                            </Box>
                          }
                        />
                        <Chip
                          size="small"
                          label={emp.attendance_status || 'N/A'}
                          color={emp.attendance_status === 'present' ? 'success' : 'default'}
                        />
                      </ListItem>
                      {idx < employees.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
