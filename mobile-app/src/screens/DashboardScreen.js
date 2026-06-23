import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Surface, ActivityIndicator, Avatar, ProgressBar, Chip } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [today, setToday] = useState(null);
  const [summary, setSummary] = useState(null);
  const [balance, setBalance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [todayRes, summaryRes, balanceRes] = await Promise.all([
        api.get('/attendance/today'),
        api.get('/attendance/summary'),
        api.get('/leaves/balance'),
      ]);
      setToday(todayRes.data.data);
      setSummary(summaryRes.data.data);
      setBalance(balanceRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  const status = today?.status || 'not_started';
  const statusConfig = {
    present: { label: 'Checked In', color: '#2E7D32' },
    not_started: { label: 'Not Checked In', color: '#9E9E9E' },
    half_day: { label: 'Half Day', color: '#F57C00' },
    leave: { label: 'On Leave', color: '#0097A7' },
    absent: { label: 'Absent', color: '#C62828' },
  };
  const cfg = statusConfig[status] || statusConfig.not_started;
  const totalLeaveDays = balance.reduce((s, b) => s + parseFloat(b.remaining_days || 0), 0);

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi, {user?.first_name || 'there'} 👋</Text>
          <Text style={styles.date}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        </View>
        <Avatar.Text size={44} label={`${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`} style={{ backgroundColor: '#1976D2' }} />
      </View>

      {/* Status Card */}
      <Surface style={styles.statusCard} elevation={2}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Today's Status</Text>
          <Chip style={{ backgroundColor: `${cfg.color}20` }} textStyle={{ color: cfg.color, fontWeight: '600' }}>{cfg.label}</Chip>
        </View>
        <View style={styles.timeRow}>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Check In</Text>
            <Text style={styles.timeValue}>{today?.check_in_time ? new Date(today.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</Text>
          </View>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Check Out</Text>
            <Text style={styles.timeValue}>{today?.check_out_time ? new Date(today.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</Text>
          </View>
        </View>
      </Surface>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <Surface style={styles.statCard} elevation={1}>
          <Text style={styles.statValue}>{summary?.present_days || 0}</Text>
          <Text style={styles.statLabel}>Present Days</Text>
        </Surface>
        <Surface style={styles.statCard} elevation={1}>
          <Text style={[styles.statValue, { color: '#F57C00' }]}>{summary?.late_days || 0}</Text>
          <Text style={styles.statLabel}>Late Days</Text>
        </Surface>
        <Surface style={styles.statCard} elevation={1}>
          <Text style={[styles.statValue, { color: '#0097A7' }]}>{totalLeaveDays}</Text>
          <Text style={styles.statLabel}>Leave Balance</Text>
        </Surface>
      </View>

      {/* Monthly Attendance Progress */}
      <Surface style={styles.card} elevation={1}>
        <Text style={styles.cardTitle}>This Month</Text>
        <View style={{ marginTop: 12 }}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Attendance Rate</Text>
            <Text style={styles.progressValue}>
              {summary?.total_days ? Math.round((summary.present_days / summary.total_days) * 100) : 0}%
            </Text>
          </View>
          <ProgressBar
            progress={summary?.total_days ? summary.present_days / summary.total_days : 0}
            color="#1976D2" style={styles.progressBar}
          />
        </View>
      </Surface>

      {/* Leave Balance Breakdown */}
      <Surface style={styles.card} elevation={1}>
        <Text style={styles.cardTitle}>Leave Balance</Text>
        {balance.map((b) => (
          <View key={b.leave_type_id} style={styles.leaveRow}>
            <Text style={styles.leaveType}>{b.name}</Text>
            <Text style={styles.leaveValue}>{b.remaining_days} / {b.allocated_days} days</Text>
          </View>
        ))}
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting: { fontSize: 20, fontWeight: '700', color: '#1A2035' },
  date: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  statusCard: { borderRadius: 16, padding: 16, marginBottom: 16, backgroundColor: '#fff' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-around' },
  timeBox: { alignItems: 'center' },
  timeLabel: { fontSize: 12, color: '#9CA3AF' },
  timeValue: { fontSize: 20, fontWeight: '700', color: '#1A2035', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', backgroundColor: '#fff' },
  statValue: { fontSize: 22, fontWeight: '700', color: '#1976D2' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  card: { borderRadius: 16, padding: 16, marginBottom: 16, backgroundColor: '#fff' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#374151' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, color: '#6B7280' },
  progressValue: { fontSize: 13, fontWeight: '700', color: '#1976D2' },
  progressBar: { height: 8, borderRadius: 4 },
  leaveRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  leaveType: { fontSize: 13, color: '#374151' },
  leaveValue: { fontSize: 13, fontWeight: '600', color: '#1A2035' },
});
