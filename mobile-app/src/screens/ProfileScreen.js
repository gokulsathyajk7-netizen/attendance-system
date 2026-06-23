import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Surface, Avatar, List, Button, ActivityIndicator, Divider } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me').then(({ data }) => setProfile(data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.headerCard} elevation={2}>
        <Avatar.Text size={72} label={`${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`} style={{ backgroundColor: '#1976D2' }} />
        <Text style={styles.name}>{profile?.first_name} {profile?.last_name}</Text>
        <Text style={styles.designation}>{profile?.designation} · {profile?.department}</Text>
      </Surface>

      <Surface style={styles.card} elevation={1}>
        <List.Item title="Employee Code" description={profile?.employee_code} left={() => <List.Icon icon="badge-account" />} />
        <Divider />
        <List.Item title="Email" description={profile?.email} left={() => <List.Icon icon="email" />} />
        <Divider />
        <List.Item title="Mobile" description={profile?.mobile} left={() => <List.Icon icon="phone" />} />
        <Divider />
        <List.Item title="Status" description={profile?.status} left={() => <List.Icon icon="check-circle" />} />
        <Divider />
        <List.Item title="Last Login" description={profile?.last_login ? new Date(profile.last_login).toLocaleString() : '-'} left={() => <List.Icon icon="clock-outline" />} />
      </Surface>

      <Button mode="outlined" icon="logout" onPress={handleLogout} style={styles.logoutBtn} textColor="#C62828">
        Logout
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: { borderRadius: 16, padding: 24, alignItems: 'center', backgroundColor: '#fff', marginBottom: 16 },
  name: { fontSize: 18, fontWeight: '700', marginTop: 12, color: '#1A2035' },
  designation: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  card: { borderRadius: 16, backgroundColor: '#fff', marginBottom: 16, overflow: 'hidden' },
  logoutBtn: { borderRadius: 10, borderColor: '#C62828', marginBottom: 30 },
});
