import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiClient } from '../../src/services/api.service';
import { store } from '../../src/store';
import { setCredentials } from '../../src/store/slices/authSlice';
import { storageService } from '../../src/services/storage.service';
import { Button } from '../../src/components/ui/Button';
import { SlideUp } from '../../src/components/animations/SlideUp';
import { colors, spacing } from '../../src/theme';
import { getApiError, showToast } from '../../src/utils/toast';

export default function VerifyOTPScreen() {
  const router = useRouter();
  const { phone, devOtp } = useLocalSearchParams<{ phone: string; devOtp?: string }>();
  const [otp, setOtp]       = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [currentDevOtp, setCurrentDevOtp] = useState(devOtp || '');
  const inputs = useRef<Array<TextInput | null>>([]);

  const handleChange = (val: string, idx: number) => {
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
    if (!val && idx > 0) inputs.current[idx - 1]?.focus();
    if (next.every(d => d) && next.join('').length === 6) handleVerify(next.join(''));
  };

  const handleResend = async () => {
    if (!phone || resending) return;
    setResending(true);
    try {
      const res = await apiClient.post('/auth/resend-otp', { phone });
      const nextDevOtp = res.data.data.devOtp || '';
      setCurrentDevOtp(nextDevOtp);
      showToast('success', 'OTP sent', nextDevOtp ? 'Development OTP: ' + nextDevOtp : 'A new code was sent.');
    } catch (err: unknown) {
      showToast('error', 'Could not resend OTP', getApiError(err));
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code || otp.join('');
    if (otpCode.length !== 6) { showToast('error', 'Incomplete OTP', 'Enter all 6 digits.'); return; }
    setLoading(true);
    try {
      const res  = await apiClient.post('/auth/verify-otp', { phone, otp: otpCode });
      const data = res.data.data;
      store.dispatch(setCredentials(data));
      try {
        await storageService.saveTokens(data.accessToken, data.refreshToken);
        await storageService.saveUser(data.user);
      } catch {}
    } catch (err: unknown) {
      showToast('error', 'Invalid OTP', getApiError(err));
      setOtp(['','','','','','']);
      inputs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom:32 }}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>
      <SlideUp>
        <Text style={styles.title}>Verify your number</Text>
        <Text style={styles.subtitle}>Enter the 6-digit OTP sent to {phone}</Text>
        {currentDevOtp ? <Text style={styles.devOtp}>Development OTP: {currentDevOtp}</Text> : null}
        <View style={styles.otpRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={r => { inputs.current[idx] = r; }}
              style={[styles.otpInput, digit && styles.otpInputFilled]}
              value={digit}
              onChangeText={v => handleChange(v.replace(/\D/g,'').slice(-1), idx)}
              keyboardType="number-pad"
              maxLength={1}
              autoFocus={idx === 0}
            />
          ))}
        </View>
        <Button label="Verify OTP" onPress={() => handleVerify()} loading={loading} fullWidth />
        <TouchableOpacity style={styles.resendRow} onPress={handleResend} disabled={resending}>
          <Text style={styles.resendText}>
            Didn't receive the OTP? <Text style={{ color:colors.brand[600], fontWeight:'600' }}>{resending ? 'Sending...' : 'Resend'}</Text>
          </Text>
        </TouchableOpacity>
      </SlideUp>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#fff', padding:spacing['2xl'], paddingTop:60 },
  back:      { fontSize:15, color:colors.brand[600], fontWeight:'500' },
  title:     { fontSize:26, fontWeight:'700', color:colors.neutral[900] },
  subtitle:  { fontSize:14, color:colors.neutral[500], marginTop:6, marginBottom:32 },
  devOtp:    { fontSize:13, color:colors.brand[700], marginBottom:16, textAlign:'center', fontWeight:'600' },
  otpRow:    { flexDirection:'row', gap:10, marginBottom:32, justifyContent:'center' },
  otpInput:  { width:46, height:56, borderWidth:1.5, borderColor:colors.neutral[200], borderRadius:12, textAlign:'center', fontSize:22, fontWeight:'700', color:colors.neutral[900] },
  otpInputFilled:{ borderColor:colors.brand[600], backgroundColor:colors.brand[50] },
  resendRow: { marginTop:20, alignItems:'center' },
  resendText:{ fontSize:13, color:colors.neutral[500] },
});
