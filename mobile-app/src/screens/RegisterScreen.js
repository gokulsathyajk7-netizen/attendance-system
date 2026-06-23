import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Surface, HelperText } from 'react-native-paper';
import api from '../api/axios';

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', mobile: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError('');
    if (!form.first_name || !form.email || !form.mobile) {
      setError('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      // Self-registration submits a request; admin completes onboarding (sets dept/role/password)
      await api.post('/employees/self-register-request', form);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration request failed. Contact your admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Surface style={styles.card} elevation={2}>
          <Text style={styles.title}>Request Access</Text>
          <Text style={styles.subtitle}>
            New employee accounts are created by your admin. Submit your details and you'll receive login credentials by email.
          </Text>

          {success ? (
            <HelperText type="info" visible style={{ fontSize: 14 }}>
              Request submitted! Your admin will create your account and email you login details.
            </HelperText>
          ) : (
            <>
              {error ? <HelperText type="error" visible>{error}</HelperText> : null}
              <TextInput label="First Name" value={form.first_name} mode="outlined" style={styles.input}
                onChangeText={(v) => setForm(p => ({ ...p, first_name: v }))} />
              <TextInput label="Last Name" value={form.last_name} mode="outlined" style={styles.input}
                onChangeText={(v) => setForm(p => ({ ...p, last_name: v }))} />
              <TextInput label="Email" value={form.email} mode="outlined" style={styles.input} keyboardType="email-address" autoCapitalize="none"
                onChangeText={(v) => setForm(p => ({ ...p, email: v }))} />
              <TextInput label="Mobile Number" value={form.mobile} mode="outlined" style={styles.input} keyboardType="phone-pad"
                onChangeText={(v) => setForm(p => ({ ...p, mobile: v }))} />
              <Button mode="contained" onPress={handleRegister} loading={loading} disabled={loading} style={styles.btn}>
                Submit Request
              </Button>
            </>
          )}

          <Button mode="text" onPress={() => navigation.goBack()} style={{ marginTop: 8 }}>
            Back to Login
          </Button>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F4F6F9' },
  card: { borderRadius: 16, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  input: { marginBottom: 12 },
  btn: { borderRadius: 10, marginTop: 8 },
});
