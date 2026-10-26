import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  User,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../src/services/api.service';
import { getApiError, showToast } from '../../src/utils/toast';

export default function CustomerRegisterScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [name, setName] = useState('');
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

  const handleRegister = async () => {
    setErrorMessage(null);
    const trimmedName = name.trim();
    const cleanPhone = phone.trim().replace(/^\+91/, '').replace(/\D/g, '');

    if (!trimmedName || !cleanPhone || !password) {
      const msg = 'Please fill all required fields.';
      setErrorMessage(msg);
      showToast('error', 'Missing details', msg);
      return;
    }
    if (trimmedName.length < 2) {
      const msg = 'Full name must be at least 2 characters.';
      setErrorMessage(msg);
      showToast('error', 'Invalid name', msg);
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      const msg = 'Please enter a valid 10-digit mobile number starting with 6-9.';
      setErrorMessage(msg);
      showToast('error', 'Invalid mobile number', msg);
      return;
    }
    if (password.length < 6) {
      const msg = 'Password must be at least 6 characters.';
      setErrorMessage(msg);
      showToast('error', 'Invalid password', msg);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: trimmedName,
        phone: cleanPhone,
        password: password,
        role: 'CUSTOMER',
      };

      const res = await apiClient.post('/auth/register', payload);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('success', 'OTP Sent', 'A verification OTP has been sent to your mobile number.');
      router.replace({
        pathname: '/(auth)/verify-otp',
        params: {
          phone: cleanPhone,
          devOtp: res.data?.data?.devOtp || '',
        },
      });
    } catch (err: unknown) {
      const msg = getApiError(err);
      setErrorMessage(msg);
      showToast('error', 'Registration failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Top Wave */}
      <View pointerEvents="none" style={styles.topWaveWrap}>
        <Image
          source={require('../../assets/images/register-top-wave.png')}
          style={styles.topWave}
          resizeMode="cover"
        />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.contentWrap}>
          {/* Top Header: Hand2Hand Logo */}
          <View style={styles.topBar}>
            <Image
              source={require('../../assets/images/h2h-header-logo.png')}
              style={styles.h2hLogo}
              resizeMode="contain"
            />
          </View>

          {/* Title & Subtitle */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Sign up to send packages, track live deliveries and manage orders.
            </Text>
          </View>

          {/* Input Form Fields */}
          <View style={styles.formSection}>
            {/* Full Name */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Full name</Text>
              <View style={styles.inputContainer}>
                <User size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={(v) => {
                    setErrorMessage(null);
                    setName(v);
                  }}
                  placeholder="Your full name"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Mobile Number */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Mobile number</Text>
              <View style={styles.inputContainer}>
                <Phone size={20} color="#0f172a" style={styles.inputIcon} />
                <View style={styles.countryCodeWrap}>
                  <Text style={styles.countryCodeText}>+91</Text>
                  <ChevronDown size={14} color="#64748b" />
                </View>
                <View style={styles.inputDivider} />
                <TextInput
                  style={[styles.textInput, { paddingLeft: 0 }]}
                  value={phone}
                  onChangeText={(v) => {
                    setErrorMessage(null);
                    setPhone(v.replace(/[^0-9]/g, ''));
                  }}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <Lock size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={(v) => {
                    setErrorMessage(null);
                    setPassword(v);
                  }}
                  placeholder="Create a password (min 6 chars)"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(p => !p)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#64748b" />
                  ) : (
                    <Eye size={20} color="#64748b" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Message */}
            {errorMessage && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Create account</Text>
                  <ArrowRight size={20} color="#ffffff" strokeWidth={2.5} />
                </>
              )}
            </TouchableOpacity>

            {/* Trust Badge */}
            <View style={styles.trustBadge}>
              <ShieldCheck size={17} color="#2563eb" />
              <Text style={styles.trustText}>Your personal information is securely protected.</Text>
            </View>

            {/* Sign In Link */}
            <View style={styles.signInRow}>
              <Text style={styles.signInPrompt}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/login')}
                style={styles.signInLinkWrap}
              >
                <Text style={styles.signInLink}>Sign in</Text>
                <ArrowRight size={15} color="#f97316" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Bottom Wave Graphic */}
        <View pointerEvents="none" style={styles.bottomWaveWrap}>
          <Image
            source={require('../../assets/images/register-bottom-wave.png')}
            style={styles.bottomWave}
            resizeMode="cover"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      web: {
        maxHeight: '100vh' as any,
      },
    }),
  },
  topWaveWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 105,
    zIndex: 0,
    overflow: 'hidden',
  },
  topWave: {
    width: '100%',
    height: 105,
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 0,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    zIndex: 1,
  },
  contentWrap: {
    width: '100%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 16,
    height: 40,
  },
  h2hLogo: {
    width: 155,
    height: 38,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  formSection: {
    gap: 16,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    height: 52,
  },
  inputIcon: { marginLeft: 12 },
  textInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 10,
    fontSize: 15.5,
    color: '#0f172a',
    fontWeight: '500',
  },
  countryCodeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  inputDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 8,
  },
  eyeBtn: { paddingRight: 14 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f97316',
    height: 52,
    borderRadius: 14,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
    marginTop: 10,
  },
  submitBtnText: {
    fontSize: 17.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  trustText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  signInPrompt: {
    fontSize: 14,
    color: '#64748b',
  },
  signInLinkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  signInLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f97316',
  },
  bottomWaveWrap: {
    width: '100%',
    alignSelf: 'stretch',
    height: 85,
    overflow: 'hidden',
    marginTop: 'auto',
    ...Platform.select({
      web: {
        width: 'calc(100% + 32px)' as any,
        marginLeft: -16,
        marginRight: -16,
      },
      default: {
        marginHorizontal: -16,
      },
    }),
  },
  bottomWave: {
    width: '100%',
    height: 85,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 10,
    padding: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
