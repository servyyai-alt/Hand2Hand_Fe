import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { apiClient } from '../../src/services/api.service';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing } from '../../src/theme';
import { getApiError, showToast } from '../../src/utils/toast';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!/^[6-9]d{9}$/.test(phone)) {
      showToast('error', 'Invalid number', 'Enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/forgot-password', { phone });
      setDevOtp(res.data.data.devOtp || '');
      setSent(true);
      showToast('success', 'OTP sent', 'Check your mobile for the password reset OTP.');
    } catch (err: unknown) {
      showToast('error', 'Could not send OTP', getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (otp.length !== 6) {
      showToast('error', 'Invalid OTP', 'Enter the 6-digit OTP.');
      return;
    }
    if (password.length < 8) {
      showToast('error', 'Invalid password', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { phone, otp, password });
      showToast('success', 'Password updated', 'You can now log in.');
      router.replace('/(auth)/login');
    } catch (err: unknown) {
      showToast('error', 'Reset failed', getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.subtitle}>
        {sent ? 'Enter the OTP and choose a new password.' : 'Enter your mobile number to receive a reset OTP.'}
      </Text>

      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="10-digit mobile number"
        keyboardType="phone-pad"
        maxLength={10}
        editable={!sent}
        placeholderTextColor={colors.neutral[400]}
      />

      {sent && (
        <>
          {devOtp ? <Text style={styles.devOtp}>Development OTP: {devOtp}</Text> : null}
          <TextInput
            style={styles.input}
            value={otp}
            onChangeText={value => setOtp(value.replace(/D/g, '').slice(0, 6))}
            placeholder="6-digit OTP"
            keyboardType="number-pad"
            maxLength={6}
            placeholderTextColor={colors.neutral[400]}
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="New password (8+ characters)"
            secureTextEntry
            placeholderTextColor={colors.neutral[400]}
          />
        </>
      )}

      <Button
        label={sent ? 'Update password' : 'Send OTP'}
        onPress={sent ? handleReset : handleSend}
        loading={loading}
        fullWidth
      />
      {sent && (
        <TouchableOpacity onPress={handleSend} disabled={loading} style={styles.resend}>
          <Text style={styles.resendText}>Send OTP again</Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#fff', padding:spacing['2xl'], paddingTop:60 },
  back: { fontSize:15, color:colors.brand[600], fontWeight:'500', marginBottom:32 },
  title: { fontSize:24, fontWeight:'700', color:colors.neutral[900] },
  subtitle: { fontSize:14, color:colors.neutral[500], marginTop:6, marginBottom:32 },
  input: { height:50, borderWidth:1, borderColor:colors.neutral[200], borderRadius:12, paddingHorizontal:16, fontSize:15, marginBottom:16, color:colors.neutral[900], backgroundColor:colors.neutral[50] },
  resend: { alignItems:'center', marginTop:20 },
  resendText: { fontSize:13, color:colors.brand[600], fontWeight:'600' },
  devOtp: { fontSize:13, color:colors.brand[700], marginBottom:16, fontWeight:'600' },
});
