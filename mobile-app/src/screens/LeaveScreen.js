import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
  Text, Surface, Button, Chip, ActivityIndicator, FAB, Modal, Portal,
  TextInput, Menu, Divider, HelperText
} from 'react-native-paper';
import api from '../api/axios';

const STATUS_COLORS = { pending: '#F57C00', approved: '#2E7D32', rejected: '#C62828', cancelled: '#9E9E9E' };

export default function LeaveScreen() {
  const [leaves, setLeaves] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [form, setForm] = useState({ leave_type_id: null, from_date: '', to_date: '', reason: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [leavesRes, typesRes] = await Promise.all([
        api.get('/leaves'),
        api.get('/leaves/types'),
      ]);
      setLeaves(leavesRes.data.data);
      setLeaveTypes(typesRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApply = async () => {
    setError('');
    if (!form.leave_type_id || !form.from_date || !form.to_date || !form.reason) {
      setError('Please fill in all fields (dates as YYYY-MM-DD)');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/leaves', form);
      setModalVisible(false);
      setForm({ leave_type_id: null, from_date: '', to_date: '', reason: '' });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply leave');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTypeName = leaveTypes.find(t => t.id === form.leave_type_id)?.name || 'Select Leave Type';

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}>
        {leaves.length === 0 ? (
          <View style={styles.center}><Text style={{ color: '#9CA3AF' }}>No leave requests yet</Text></View>
        ) : leaves.map((l) => (
          <Surface key={l.id} style={styles.leaveCard} elevation={1}>
            <View style={styles.leaveHeader}>
              <Text style={styles.leaveType}>{l.leave_type_name}</Text>
              <Chip style={{ backgroundColor: `${STATUS_COLORS[l.status]}20` }} textStyle={{ color: STATUS_COLORS[l.status], fontSize: 11 }}>
                {l.status}
              </Chip>
            </View>
            <Text style={styles.leaveDates}>{new Date(l.from_date).toLocaleDateString('en-IN')} → {new Date(l.to_date).toLocaleDateString('en-IN')} ({l.total_days} days)</Text>
            <Text style={styles.leaveReason}>{l.reason}</Text>
            {l.review_comment ? <Text style={styles.reviewComment}>Admin: {l.review_comment}</Text> : null}
          </Surface>
        ))}
        <View style={{ height: 80 }} />
      </ScrollView>

      <FAB icon="plus" label="Apply Leave" style={styles.fab} onPress={() => setModalVisible(true)} />

      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>Apply for Leave</Text>
          {error ? <HelperText type="error" visible>{error}</HelperText> : null}

          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Button mode="outlined" onPress={() => setMenuVisible(true)} style={styles.input}>
                {selectedTypeName}
              </Button>
            }
          >
            {leaveTypes.map((t) => (
              <Menu.Item key={t.id} title={t.name} onPress={() => { setForm(p => ({ ...p, leave_type_id: t.id })); setMenuVisible(false); }} />
            ))}
          </Menu>

          <TextInput label="From Date (YYYY-MM-DD)" value={form.from_date} onChangeText={(v) => setForm(p => ({ ...p, from_date: v }))} mode="outlined" style={styles.input} />
          <TextInput label="To Date (YYYY-MM-DD)" value={form.to_date} onChangeText={(v) => setForm(p => ({ ...p, to_date: v }))} mode="outlined" style={styles.input} />
          <TextInput label="Reason" value={form.reason} onChangeText={(v) => setForm(p => ({ ...p, reason: v }))} mode="outlined" multiline numberOfLines={3} style={styles.input} />

          <View style={styles.modalActions}>
            <Button mode="text" onPress={() => setModalVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleApply} loading={submitting} disabled={submitting}>Submit</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  leaveCard: { margin: 12, marginBottom: 0, borderRadius: 12, padding: 14, backgroundColor: '#fff' },
  leaveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leaveType: { fontSize: 15, fontWeight: '700', color: '#1A2035' },
  leaveDates: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  leaveReason: { fontSize: 13, color: '#374151', marginTop: 6 },
  reviewComment: { fontSize: 12, color: '#1976D2', marginTop: 6, fontStyle: 'italic' },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#1976D2' },
  modal: { backgroundColor: '#fff', margin: 20, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  input: { marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
});
