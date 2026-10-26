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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Truck, ArrowLeft, Lock, Phone, AlertCircle, Mail } from 'lucide-react-native';
import { store } from '../../src/store';
import { setCredentials } from '../../src/store/slices/authSlice';
import { storageService } from '../../src/services/storage.service';
import { apiClient } from '../../src/services/api.service';
import { colors } from '../../src/theme';
import { getApiError, showToast } from '../../src/utils/toast';

export default function PartnerLoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; email?: string }>();

  const [identifier, setIdentifier] = useState(
    params.phone ? String(params.phone) : (params.email ? String(params.email) : '')
  );
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePartnerLogin = async () => {
    setErrorMsg(null);
    const trimmedId = identifier.trim();
    if (!trimmedId || !password) {
      setErrorMsg('Please enter your mobile number or email ID, and password.');
      return;
    }

    setLoading(true);
    try {
      const isEmail = trimmedId.includes('@');
      const loginPayload = isEmail
        ? { email: trimmedId.toLowerCase(), password }
        : { phone: trimmedId.replace(/\D/g, ''), password };

      const res = await apiClient.post('/auth/login', loginPayload);
      const data = res.data.data;

      if (data.user.role !== 'DELIVERY_PARTNER') {
        throw new Error('This account is not registered as an H2H Delivery Partner.');
      }

      store.dispatch(setCredentials(data));
      try {
        await storageService.saveTokens(data.accessToken, data.refreshToken);
        await storageService.saveUser(data.user);
      } catch {}

      const u = data.user;
      const isApproved =
        u.status === 'ACTIVE' ||
        u.accountStatus === 'ACTIVE' ||
        u.approvalStatus === 'APPROVED' ||
        Boolean(u.canWork) ||
        u.superAdminApprovalStatus === 'APPROVED' ||
        u.adminApprovalStatus === 'APPROVED';

      if (isApproved) {
        showToast('success', 'Welcome Partner', 'Logged into Delivery Partner Portal.');
        router.replace('/(partner)');
      } else {
        showToast('info', 'Application Under Review', 'Your Delivery Partner onboarding is in verification.');
        router.replace('/(partner)/application-status' as never);
      }
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
        <Text style={styles.headerTitle}>Delivery Partner Portal</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.heroBox}>
          <View style={styles.heroIconWrap}>
            <Truck size={34} color={colors.secondary} />
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>H2H COURIER NETWORK</Text>
          </View>
          <Text style={styles.title}>Delivery Partner Sign In</Text>
          <Text style={styles.subtitle}>
            Access delivery gigs, real-time route assignments and daily earnings.
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
            <Text style={styles.label}>REGISTERED PHONE OR EMAIL</Text>
            <View style={styles.inputWrap}>
              {identifier.includes('@') ? (
                <Mail size={18} color={colors.outline} />
              ) : (
                <Phone size={18} color={colors.outline} />
              )}
              <TextInput
                style={styles.input}
                value={identifier}
                onChangeText={(t) => {
                  setErrorMsg(null);
                  setIdentifier(t);
                }}
                placeholder="10-digit mobile or email ID"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={identifier.includes('@') ? 'email-address' : 'default'}
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
                placeholder="Account password"
                placeholderTextColor={colors.outline}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handlePartnerLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In as Delivery Partner</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.switchPortalBtn}
          onPress={() => router.replace('/(auth)/login')}
          activeOpacity={0.7}
        >
          <Text style={styles.switchPortalText}>Looking for Customer Login? Tap here</Text>
        </TouchableOpacity>
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
    backgroundColor: colors.secondaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: colors.secondaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.secondary,
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
    color: colors.secondary,
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
    backgroundColor: colors.secondaryContainer,
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
  switchPortalBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchPortalText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
});
