import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text, Surface, HelperText } from 'react-native-paper';
import api from '../api/axios';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Surface style={styles.card} elevation={2}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your registered email to receive a reset link</Text>

        {sent ? (
          <HelperText type="info" visible style={{ fontSize: 14 }}>
            If this email exists, a reset link has been sent. Check your inbox.
          </HelperText>
        ) : (
          <>
            {error ? <HelperText type="error" visible>{error}</HelperText> : null}
            <TextInput label="Email Address" value={email} onChangeText={setEmail} mode="outlined"
              keyboardType="email-address" autoCapitalize="none" style={styles.input} />
            <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading} style={styles.btn}>
              Send Reset Link
            </Button>
          </>
        )}

        <Button mode="text" onPress={() => navigation.goBack()} style={{ marginTop: 8 }}>
          Back to Login
        </Button>
      </Surface>
    </ScrollView>
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
