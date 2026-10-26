import React, { useState, useEffect, useRef } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Phone,
  ChevronDown,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  User,
} from 'lucide-react-native';
import { store } from '../../src/store';
import { setCredentials, setGuestMode } from '../../src/store/slices/authSlice';
import { storageService } from '../../src/services/storage.service';
import { apiClient } from '../../src/services/api.service';
import { getApiError, showToast } from '../../src/utils/toast';
import { LoginBackgroundVideo } from '../../src/components/auth/LoginBackgroundVideo';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { height: screenHeight } = useWindowDimensions();
  // Calibrated to push card down towards the bottom wave and fully reveal the rider animation
  const heroSpacerHeight = Math.max(120, screenHeight - 458);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      window.scrollTo(0, 0);
    }
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const handleLogin = async () => {
    setErrorMessage(null);
    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
    if (!cleanPhone || !password) {
      const msg = 'Please enter your mobile number and password.';
      setErrorMessage(msg);
      showToast('error', 'Missing details', msg);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { phone: cleanPhone, password });
      const data = res.data.data;
      store.dispatch(setCredentials(data));
      try {
        await storageService.saveTokens(data.accessToken, data.refreshToken);
        await storageService.saveUser(data.user);
      } catch {}

      if (data.user.role === 'DELIVERY_PARTNER') {
        const u = data.user;
        const isApproved =
          u.status === 'ACTIVE' ||
          u.accountStatus === 'ACTIVE' ||
          u.approvalStatus === 'APPROVED' ||
          Boolean(u.canWork) ||
          u.superAdminApprovalStatus === 'APPROVED' ||
          u.adminApprovalStatus === 'APPROVED';
        if (isApproved) {
          router.replace('/(partner)');
        } else {
          router.replace('/(partner)/application-status' as never);
        }
      } else if (data.user.role === 'CUSTOMER') {
        router.replace('/(customer)');
      } else if (['ADMIN', 'SUPER_ADMIN'].includes(data.user.role)) {
        router.replace('/admin' as never);
      }
    } catch (err: unknown) {
      const msg = getApiError(err);
      setErrorMessage(msg);
      showToast('error', 'Login failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    store.dispatch(setGuestMode());
    router.replace('/(customer)');
  };

  return (
    <View style={styles.screen}>
      {/* 1. Background Delivery Animation Video */}
      <LoginBackgroundVideo />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: Math.max(insets.bottom, 12) + 6,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Spacer to showcase delivery rider & city illustration in the background video */}
          <View style={{ height: heroSpacerHeight }} pointerEvents="none" />

          {/* Bottom Section: Form Card & Create Account link */}
          <View style={styles.bottomSection}>
            {/* White Floating Card */}
            <View style={styles.cardContainer}>
              {/* Mobile number field */}
              <Text style={styles.inputLabel}>Mobile number</Text>
              <View style={styles.inputRow}>
                <Phone size={18} color="#64748B" />
                <Text style={styles.countryCode}>+91</Text>
                <ChevronDown size={14} color="#64748B" />
                <View style={styles.verticalDivider} />
                <TextInput
                  style={styles.textInput}
                  value={phone}
                  onChangeText={(v) => {
                    setErrorMessage(null);
                    setPhone(v.replace(/[^0-9]/g, ''));
                  }}
                  placeholder="9876543210"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              {/* Password field */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Password</Text>
              <View style={styles.inputRow}>
                <Lock size={18} color="#64748B" />
                <TextInput
                  style={[styles.textInput, { marginLeft: 8 }]}
                  value={password}
                  onChangeText={(v) => {
                    setErrorMessage(null);
                    setPassword(v);
                  }}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#64748B" />
                  ) : (
                    <Eye size={18} color="#64748B" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Forgot password link */}
              <TouchableOpacity
                onPress={() => router.push('/(auth)/forgot-password')}
                style={styles.forgotBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              {/* Error Message */}
              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Primary Sign In Button (Orange) */}
              <TouchableOpacity
                style={styles.signInBtnShadow}
                onPress={handleLogin}
                activeOpacity={0.88}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#FF8200', '#FA6000']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.signInBtnGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <View style={styles.btnContentRow}>
                      <Text style={styles.signInBtnText}>Sign in</Text>
                      <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
              </View>

              {/* Continue as Guest Button */}
              <TouchableOpacity
                style={styles.guestBtn}
                onPress={handleContinueAsGuest}
                activeOpacity={0.85}
              >
                <View style={styles.btnContentRow}>
                  <User size={18} color="#00417E" strokeWidth={2.2} />
                  <Text style={styles.guestBtnText}>Continue as Guest</Text>
                  <ArrowRight size={16} color="#FB7800" strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Bottom Create Account Link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>New to Hand2Hand? </Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/register')}
                style={styles.createAccountLink}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.createAccountText}>Create account</Text>
                <ArrowRight size={14} color="#FB7800" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      web: {
        maxHeight: '100vh' as any,
      },
    }),
  },
  keyboardContainer: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
    ...Platform.select({
      web: {
        overflowY: 'auto' as any,
        overflowX: 'hidden' as any,
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y' as any,
      },
    }),
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: '100%',
  },

  bottomSection: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  // Floating Form Card
  cardContainer: {
    alignSelf: 'stretch',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    shadowColor: '#00417E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    } : {}),
  },
  inputLabel: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F1E36',
    marginBottom: 6,
  },
  inputRow: {
    height: 48,
    backgroundColor: 'rgba(240, 246, 252, 0.94)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(219, 234, 254, 0.85)',
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  countryCode: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 4,
    marginRight: 2,
  },
  verticalDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  textInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15.5,
    fontWeight: '600',
    color: '#0F172A',
    paddingVertical: 0,
  },

  // Forgot Password
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 10,
  },
  forgotText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#FB7800',
  },

  // Error Box
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Primary Sign In Button
  signInBtnShadow: {
    borderRadius: 12,
    shadowColor: '#FB7800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  signInBtnGradient: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },

  // Secondary Guest Button (White with H2H Blue / Orange accent)
  guestBtn: {
    height: 46,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#00417E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestBtnText: {
    color: '#00417E',
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  // Bottom Register Link
  registerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 6,
    shadowColor: '#00417E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    } : {}),
  },
  registerText: {
    fontSize: 13.5,
    color: '#475569',
    fontWeight: '500',
  },
  createAccountLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  createAccountText: {
    fontSize: 13.5,
    color: '#FB7800',
    fontWeight: '700',
  },
});
