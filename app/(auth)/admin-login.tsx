import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Building2, ArrowLeft, Lock, Mail, AlertCircle, ShieldAlert } from 'lucide-react-native';
import { store } from '../../src/store';
import { setCredentials } from '../../src/store/slices/authSlice';
import { storageService } from '../../src/services/storage.service';
import { apiClient } from '../../src/services/api.service';
import { colors } from '../../src/theme';
import { getApiError, showToast } from '../../src/utils/toast';

export default function AdminLoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAdminLogin = async () => {
    setErrorMsg(null);
    if (!identifier || !password) {
      setErrorMsg('Please enter your admin credentials.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { phoneOrEmail: identifier.trim(), password });
      const data = res.data.data;

      if (!['ADMIN', 'SUPER_ADMIN'].includes(data.user.role)) {
        throw new Error('Access denied: Unauthorized account role for H2H Admin Portal.');
      }

      store.dispatch(setCredentials(data));
      try {
        await storageService.saveTokens(data.accessToken, data.refreshToken);
        await storageService.saveUser(data.user);
      } catch {}

      showToast('success', 'Admin Authenticated', 'Welcome to H2H Operations Console.');
      router.replace('/admin' as never);
    } catch (err: any) {
      const msg = getApiError(err);
      setErrorMsg(msg);
      showToast('error', 'Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>H2H Admin Console</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.heroBox}>
          <View style={styles.heroIconWrap}>
            <Building2 size={34} color={colors.primary} />
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>RESTRICTED ACCESS</Text>
          </View>
          <Text style={styles.title}>Admin Portal Sign In</Text>
          <Text style={styles.subtitle}>
            Authorized platform personnel only. Access deliveries, dispatch queues and partner audits.
          </Text>
        </View>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <AlertCircle size={18} color={colors.error} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <View style={styles.field}>
            <Text style={styles.label}>ADMIN EMAIL OR MOBILE</Text>
            <View style={styles.inputWrap}>
              <Mail size={18} color={colors.outline} />
              <TextInput
                style={styles.input}
                value={identifier}
                onChangeText={(t) => {
                  setErrorMsg(null);
                  setIdentifier(t);
                }}
                placeholder="admin@h2hdelivery.com"
                autoCapitalize="none"
                placeholderTextColor={colors.outline}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.inputWrap}>
              <Lock size={18} color={colors.outline} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(t) => {
                  setErrorMsg(null);
                  setPassword(t);
                }}
                placeholder="Security password"
                placeholderTextColor={colors.outline}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleAdminLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.loginBtnText}>Authorize & Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.securityWarning}>
          <ShieldAlert size={16} color={colors.outline} />
          <Text style={styles.securityWarningText}>
            All admin sessions and activities are recorded and audited for compliance.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
  },
  scroll: {
    padding: 20,
    gap: 20,
  },
  heroBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  heroIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.onSurface,
  },
  subtitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.errorContainer,
    padding: 14,
    borderRadius: 14,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    flex: 1,
  },
  formCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.onSurface,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  securityWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  securityWarningText: {
    fontSize: 11,
    color: colors.outline,
    textAlign: 'center',
    lineHeight: 16,
  },
});
