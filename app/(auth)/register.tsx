import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { apiClient } from '../../src/services/api.service';
import { Button } from '../../src/components/ui/Button';
import { SlideUp } from '../../src/components/animations/SlideUp';
import { colors, spacing } from '../../src/theme';
import { getApiError, showToast } from '../../src/utils/toast';

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({ name:'', phone:'', password:'', role:'CUSTOMER' as 'CUSTOMER' | 'DELIVERY_PARTNER' });
  const [loading, setLoading] = useState(false);

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleRegister = async () => {
    if (!form.name || !form.phone || !form.password) { showToast('error', 'Missing details', 'Fill all required fields.'); return; }
    if (!/^[6-9]\d{9}$/.test(form.phone)) { showToast('error', 'Invalid number', 'Enter a valid 10-digit mobile number.'); return; }
    if (form.password.length < 8) { showToast('error', 'Invalid password', 'Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/register', form);
      router.replace({ pathname:'/(auth)/verify-otp', params:{ phone: form.phone, devOtp: res.data.data.devOtp || '' } });
    } catch (err: unknown) {
      showToast('error', 'Registration failed', getApiError(err));
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS==='ios'?'padding':undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom:24 }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>

        <SlideUp>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join Hyperlocal Delivery</Text>

          {/* Role selector */}
          <View style={styles.roleRow}>
            {(['CUSTOMER','DELIVERY_PARTNER'] as const).map(r => (
              <TouchableOpacity
                key={r}
                onPress={() => update('role', r)}
                style={[styles.roleBtn, form.role === r && styles.roleBtnActive]}
              >
                <Text style={[styles.roleBtnText, form.role === r && styles.roleBtnTextActive]}>
                  {r === 'CUSTOMER' ? '🛍️ Customer' : '🛵 Partner'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.form}>
            {[
              { key:'name',     label:'Full name',     placeholder:'Your full name',        keyboard:'default' as const },
              { key:'phone',    label:'Mobile number', placeholder:'10-digit number',        keyboard:'phone-pad' as const },
              { key:'password', label:'Password',      placeholder:'Min 8 characters',       keyboard:'default' as const, secure:true },
            ].map(f => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={form[f.key as keyof typeof form]}
                  onChangeText={v => update(f.key, v)}
                  placeholder={f.placeholder}
                  keyboardType={f.keyboard}
                  secureTextEntry={f.secure}
                  placeholderTextColor={colors.neutral[400]}
                  maxLength={f.key==='phone'?10:undefined}
                />
              </View>
            ))}
            <Button label="Create account" onPress={handleRegister} loading={loading} fullWidth />
          </View>
        </SlideUp>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flex:1, backgroundColor:'#fff' },
  scroll:     { flexGrow:1, padding:spacing['2xl'], paddingTop:60 },
  back:       { fontSize:15, color:colors.brand[600], fontWeight:'500' },
  title:      { fontSize:26, fontWeight:'700', color:colors.neutral[900] },
  subtitle:   { fontSize:14, color:colors.neutral[500], marginTop:4, marginBottom:24 },
  roleRow:    { flexDirection:'row', gap:10, marginBottom:24 },
  roleBtn:    { flex:1, padding:14, borderRadius:12, borderWidth:1.5, borderColor:colors.neutral[200], alignItems:'center' },
  roleBtnActive:{ borderColor:colors.brand[600], backgroundColor:colors.brand[50] },
  roleBtnText:  { fontSize:13, fontWeight:'600', color:colors.neutral[600] },
  roleBtnTextActive:{ color:colors.brand[700] },
  form:  { gap:16 },
  field: { gap:6 },
  label: { fontSize:13, fontWeight:'500', color:colors.neutral[700] },
  input: { height:50, borderWidth:1, borderColor:colors.neutral[200], borderRadius:12, paddingHorizontal:16, fontSize:15, color:colors.neutral[900], backgroundColor:colors.neutral[50] },
});
