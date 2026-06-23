import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Surface, Button, ActivityIndicator, Chip, Divider } from 'react-native-paper';
import { getCurrentLocation } from '../utils/location';
import api from '../api/axios';

export default function AttendanceScreen() {
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Fetching location...');

  const fetchToday = useCallback(async () => {
    try {
      const { data } = await api.get('/attendance/today');
      setToday(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    setLocationStatus('Getting your location...');
    try {
      const loc = await getCurrentLocation();
      if (!loc) { setActionLoading(false); return; }
      setLocationStatus('Verifying location...');

      const { data } = await api.post('/attendance/checkin', {
        latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy,
        device_info: 'Expo Mobile App',
      });

      Alert.alert('Checked In ✅', data.data.isLate ? `Marked late by ${data.data.lateByMinutes} min.` : 'You have successfully checked in.');
      fetchToday();
    } catch (err) {
      Alert.alert('Check-In Failed', err.response?.data?.message || 'Something went wrong.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const loc = await getCurrentLocation();
      const { data } = await api.post('/attendance/checkout', {
        latitude: loc?.latitude, longitude: loc?.longitude, accuracy: loc?.accuracy,
        device_info: 'Expo Mobile App',
      });
      Alert.alert('Checked Out ✅', `Total working hours: ${data.data.totalWorkingHours}`);
      fetchToday();
    } catch (err) {
      Alert.alert('Check-Out Failed', err.response?.data?.message || 'Something went wrong.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBreak = async (action) => {
    setActionLoading(true);
    try {
      await api.post('/attendance/break', { action });
      Alert.alert(action === 'break_start' ? 'Break Started' : 'Break Ended', '');
      fetchToday();
    } catch (err) {
      Alert.alert('Action Failed', err.response?.data?.message || 'Something went wrong.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  const hasCheckedIn = Boolean(today?.check_in_time);
  const hasCheckedOut = Boolean(today?.check_out_time);

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.clockCard} elevation={2}>
        <Text style={styles.bigTime}>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
        <Text style={styles.bigDate}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
      </Surface>

      <Surface style={styles.card} elevation={1}>
        <View style={styles.row}>
          <Text style={styles.label}>Check In</Text>
          <Text style={styles.value}>{today?.check_in_time ? new Date(today.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</Text>
        </View>
        <Divider />
        <View style={styles.row}>
          <Text style={styles.label}>Check Out</Text>
          <Text style={styles.value}>{today?.check_out_time ? new Date(today.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</Text>
        </View>
        {today?.is_late ? (
          <>
            <Divider />
            <View style={styles.row}>
              <Chip icon="clock-alert" style={{ backgroundColor: '#FFF3E0' }} textStyle={{ color: '#F57C00' }}>
                Late by {today.late_by_minutes} min
              </Chip>
            </View>
          </>
        ) : null}
      </Surface>

      <View style={styles.actions}>
        {!hasCheckedIn && (
          <Button mode="contained" icon="login" onPress={handleCheckIn} loading={actionLoading} disabled={actionLoading} style={styles.checkInBtn} contentStyle={{ paddingVertical: 8 }}>
            Check In
          </Button>
        )}
        {hasCheckedIn && !hasCheckedOut && (
          <>
            <View style={styles.breakRow}>
              <Button mode="outlined" icon="coffee" onPress={() => handleBreak('break_start')} disabled={actionLoading} style={{ flex: 1 }}>
                Start Break
              </Button>
              <Button mode="outlined" icon="coffee-off" onPress={() => handleBreak('break_end')} disabled={actionLoading} style={{ flex: 1 }}>
                End Break
              </Button>
            </View>
            <Button mode="contained" icon="logout" onPress={handleCheckOut} loading={actionLoading} disabled={actionLoading} style={styles.checkOutBtn} contentStyle={{ paddingVertical: 8 }}>
              Check Out
            </Button>
          </>
        )}
        {hasCheckedOut && (
          <Surface style={styles.doneCard} elevation={0}>
            <Text style={styles.doneText}>✅ You've completed your attendance for today.</Text>
          </Surface>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  clockCard: { borderRadius: 16, padding: 24, alignItems: 'center', backgroundColor: '#1976D2', marginBottom: 16 },
  bigTime: { fontSize: 42, fontWeight: '700', color: '#fff' },
  bigDate: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  card: { borderRadius: 16, padding: 16, backgroundColor: '#fff', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  label: { fontSize: 14, color: '#6B7280' },
  value: { fontSize: 16, fontWeight: '700', color: '#1A2035' },
  actions: { gap: 12 },
  checkInBtn: { borderRadius: 12, backgroundColor: '#2E7D32' },
  checkOutBtn: { borderRadius: 12, backgroundColor: '#C62828' },
  breakRow: { flexDirection: 'row', gap: 10 },
  doneCard: { borderRadius: 12, padding: 16, backgroundColor: '#E8F5E9', alignItems: 'center' },
  doneText: { color: '#2E7D32', fontWeight: '600' },
});
