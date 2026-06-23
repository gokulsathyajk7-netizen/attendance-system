import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Surface, HelperText, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // Navigation handled automatically by RootNavigator watching auth state
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>⏱</Text>
          </View>
          <Text style={styles.title}>AttendMS</Text>
          <Text style={styles.subtitle}>Employee Attendance System</Text>
        </View>

        <Surface style={styles.card} elevation={2}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Sign in to mark your attendance</Text>

          {error ? <HelperText type="error" visible>{error}</HelperText> : null}

          <TextInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            left={<TextInput.Icon icon="email" />}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            style={styles.input}
            left={<TextInput.Icon icon="lock" />}
            right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
          />

          <Button
            mode="text"
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotBtn}
            labelStyle={{ fontSize: 13 }}
          >
            Forgot Password?
          </Button>

          <Button
            mode="contained"
            onPress={handleLogin}
            disabled={loading}
            style={styles.loginBtn}
            contentStyle={{ paddingVertical: 6 }}
          >
            {loading ? <ActivityIndicator color="#fff" /> : 'Sign In'}
          </Button>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#1976D2', padding: 24, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoText: { fontSize: 32 },
  title: { fontSize: 26, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  card: { borderRadius: 16, padding: 24, backgroundColor: '#fff' },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#1A2035' },
  cardSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  input: { marginBottom: 12 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 8 },
  loginBtn: { borderRadius: 10, marginTop: 8 },
});
