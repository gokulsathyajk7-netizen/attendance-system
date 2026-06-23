import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, List, TextInput, Button, HelperText, Switch, Divider } from 'react-native-paper';
import api from '../api/axios';

export default function SettingsScreen() {
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);

  const handleChangePassword = async () => {
    setMsg(null);
    setLoading(true);
    try {
      await api.put('/auth/change-password', pwForm);
      setMsg({ type: 'success', text: 'Password changed successfully' });
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.card} elevation={1}>
        <Text style={styles.cardTitle}>Notifications</Text>
        <List.Item
          title="Push Notifications"
          description="Receive check-in, leave, and alert notifications"
          right={() => <Switch value={notifEnabled} onValueChange={setNotifEnabled} color="#1976D2" />}
        />
      </Surface>

      <Surface style={styles.card} elevation={1}>
        <Text style={styles.cardTitle}>Change Password</Text>
        {msg ? <HelperText type={msg.type === 'error' ? 'error' : 'info'} visible>{msg.text}</HelperText> : null}
        <TextInput label="Current Password" secureTextEntry mode="outlined" style={styles.input}
          value={pwForm.currentPassword} onChangeText={(v) => setPwForm(p => ({ ...p, currentPassword: v }))} />
        <TextInput label="New Password" secureTextEntry mode="outlined" style={styles.input}
          value={pwForm.newPassword} onChangeText={(v) => setPwForm(p => ({ ...p, newPassword: v }))} />
        <Button mode="contained" onPress={handleChangePassword} loading={loading} disabled={loading} style={{ marginTop: 8 }}>
          Update Password
        </Button>
      </Surface>

      <Surface style={styles.card} elevation={1}>
        <Text style={styles.cardTitle}>About</Text>
        <List.Item title="App Version" description="1.0.0" />
        <Divider />
        <List.Item title="Wonder Rebar EMS" description="Employee Attendance Management System" />
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9', padding: 16 },
  card: { borderRadius: 16, padding: 16, backgroundColor: '#fff', marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A2035', marginBottom: 8 },
  input: { marginBottom: 10 },
});
