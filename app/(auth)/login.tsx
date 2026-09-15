import React, { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { store } from '../../src/store';
import { setCredentials } from '../../src/store/slices/authSlice';
import { storageService } from '../../src/services/storage.service';
import { apiClient } from '../../src/services/api.service';
import { FadeIn } from '../../src/components/animations/FadeIn';
import { SlideUp } from '../../src/components/animations/SlideUp';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing } from '../../src/theme';
import { getApiError, showToast } from '../../src/utils/toast';

export default function LoginScreen() {
  const router   = useRouter();
  const [phone,   setPhone]   = useState('');
  const [password,setPassword]= useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) { showToast('error', 'Missing details', 'Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const res  = await apiClient.post('/auth/login', { phone, password });
      const data = res.data.data;
      store.dispatch(setCredentials(data));
      // Do not block navigation on optional native persistence modules.
      try {
        await storageService.saveTokens(data.accessToken, data.refreshToken);
        await storageService.saveUser(data.user);
      } catch {}
    } catch (err: unknown) {
      showToast('error', 'Login failed', getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FadeIn>
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <Text style={{ fontSize:28 }}>📦</Text>
            </View>
            <Text style={styles.brand}>Hyperlocal</Text>
          </View>
        </FadeIn>

        <SlideUp delay={100}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Mobile number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit mobile number"
                keyboardType="phone-pad"
                maxLength={10}
                placeholderTextColor={colors.neutral[400]}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                placeholderTextColor={colors.neutral[400]}
              />
            </View>

            <Button label="Sign in" onPress={handleLogin} loading={loading} fullWidth />

            <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotRow}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>New to Hyperlocal? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>Create account</Text>
            </TouchableOpacity>
          </View>
        </SlideUp>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#fff' },
  scroll:    { flexGrow:1, padding:spacing['2xl'], paddingTop:80 },
  logoRow:   { flexDirection:'row', alignItems:'center', gap:10, marginBottom:40 },
  logoBox:   { width:48, height:48, borderRadius:14, backgroundColor:colors.brand[600], alignItems:'center', justifyContent:'center' },
  brand:     { fontSize:22, fontWeight:'700', color:colors.neutral[900] },
  title:     { fontSize:26, fontWeight:'700', color:colors.neutral[900] },
  subtitle:  { fontSize:14, color:colors.neutral[500], marginTop:4, marginBottom:32 },
  form:      { gap:16 },
  field:     { gap:6 },
  label:     { fontSize:13, fontWeight:'500', color:colors.neutral[700] },
  input:     { height:50, borderWidth:1, borderColor:colors.neutral[200], borderRadius:12, paddingHorizontal:16, fontSize:15, color:colors.neutral[900], backgroundColor:colors.neutral[50] },
  forgotRow: { alignItems:'center', marginTop:4 },
  forgotText:{ fontSize:13, color:colors.brand[600], fontWeight:'500' },
  registerRow: { flexDirection:'row', justifyContent:'center', marginTop:32 },
  registerText:{ fontSize:13, color:colors.neutral[500] },
  registerLink:{ fontSize:13, color:colors.brand[600], fontWeight:'600' },
});
