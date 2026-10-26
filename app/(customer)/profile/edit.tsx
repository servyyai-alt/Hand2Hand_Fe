import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  ShieldCheck,
  User,
  Phone,
  Mail,
  Calendar,
  PackageCheck,
  AlertCircle,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppSelector } from '../../../src/hooks/useAppSelector';
import { store } from '../../../src/store';
import { updateUser } from '../../../src/store/slices/authSlice';
import { profileService } from '../../../src/services/profile.service';
import { colors } from '../../../src/theme';
import { showToast } from '../../../src/utils/toast';
import { GuestAuthPrompt } from '../../../src/components/auth/GuestAuthPrompt';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authUser = useAppSelector((s) => s.auth.user);
  const isGuest = useAppSelector((s) => s.auth.isGuest);

  const [activeTab, setActiveTab] = useState<'details' | 'personal'>('details');
  const [name, setName] = useState<string>(authUser?.name || '');
  const [email, setEmail] = useState<string>(authUser?.email || '');
  const [avatar, setAvatar] = useState<string | undefined>(authUser?.avatar);
  const [phone, setPhone] = useState<string>(authUser?.phone || '');
  const [createdAt, setCreatedAt] = useState<string>('');
  const [status, setStatus] = useState<string>('ACTIVE');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (isGuest || !authUser) {
        setLoading(false);
        return;
      }
      try {
        const data = await profileService.getProfile();
        setName(data.name || '');
        setEmail(data.email || '');
        setAvatar(data.avatar);
        setPhone(data.phone || '');
        setStatus(data.status || 'ACTIVE');
        if ((data as any).createdAt) {
          setCreatedAt(new Date((data as any).createdAt).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }));
        }
      } catch {
        // use authUser
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Please allow camera roll access to update your profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setAvatar(result.assets[0].uri);
      }
    } catch {
      showToast('error', 'Image Selection', 'Could not open image library');
    }
  };

  const handleSave = async () => {
    setErrorMessage(null);
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setErrorMessage('Full name must be at least 2 characters long.');
      return;
    }

    setSaving(true);
    try {
      const updated = await profileService.updateProfile({
        name: trimmedName,
        email: email.trim() || undefined,
        avatar: avatar || undefined,
      });

      store.dispatch(
        updateUser({
          name: updated.name,
          email: updated.email,
          avatar: updated.avatar,
        })
      );

      showToast('success', 'Profile Updated', 'Your profile details were saved successfully.');
      setTimeout(() => {
        router.replace('/(customer)/profile');
      }, 500);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to update profile.';
      setErrorMessage(msg);
      showToast('error', 'Update Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  if (isGuest || !authUser) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace('/(customer)')}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <GuestAuthPrompt
          title="Sign in to continue"
          description="Sign in or create an account to update your profile details and profile picture."
          icon={<User size={28} color="#00417E" />}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/(customer)/profile')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'details' && styles.tabBtnActive]}
            onPress={() => setActiveTab('details')}
            activeOpacity={0.8}
          >
            <User size={16} color={activeTab === 'details' ? colors.primary : colors.onSurfaceVariant} />
            <Text style={[styles.tabBtnText, activeTab === 'details' && styles.tabBtnTextActive]}>
              Edit Details
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'personal' && styles.tabBtnActive]}
            onPress={() => setActiveTab('personal')}
            activeOpacity={0.8}
          >
            <ShieldCheck size={16} color={activeTab === 'personal' ? colors.primary : colors.onSurfaceVariant} />
            <Text style={[styles.tabBtnText, activeTab === 'personal' && styles.tabBtnTextActive]}>
              Personal Info
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 140 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading profile details...</Text>
          </View>
        ) : activeTab === 'details' ? (
          /* TAB 1: Edit Details */
          <View style={styles.tabContent}>
            {/* Avatar Picker */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarPlaceholderText}>
                      {name ? name.charAt(0).toUpperCase() : 'C'}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.cameraBadge}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                >
                  <Camera size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.avatarHint}>Tap camera icon to change profile photo</Text>
            </View>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <AlertCircle size={18} color={colors.error} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Form Fields */}
            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>FULL NAME</Text>
                <View style={styles.inputWrap}>
                  <User size={18} color={colors.outline} />
                  <TextInput
                    style={styles.textInput}
                    value={name}
                    onChangeText={(t) => {
                      setErrorMessage(null);
                      setName(t);
                    }}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.outline}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
                  <View style={styles.verifiedBadge}>
                    <CheckCircle2 size={11} color={colors.tertiary} />
                    <Text style={styles.verifiedBadgeText}>Verified</Text>
                  </View>
                </View>
                <View style={[styles.inputWrap, styles.disabledInputWrap]}>
                  <Phone size={17} color={colors.outline} />
                  <Text style={styles.disabledInputText}>
                    {`+91\u00A0${phone.replace(/^(\+91|91|\s)+/, '')}`}
                  </Text>
                </View>
                <Text style={styles.fieldNote}>
                  Phone number is permanently linked to your verified account and cannot be modified.
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                  {email ? (
                    <View style={styles.verifiedBadge}>
                      <CheckCircle2 size={12} color={colors.tertiary} />
                      <Text style={styles.verifiedBadgeText}>Linked</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.inputWrap}>
                  <Mail size={18} color={colors.outline} />
                  <TextInput
                    style={styles.textInput}
                    value={email}
                    onChangeText={(t) => {
                      setErrorMessage(null);
                      setEmail(t);
                    }}
                    placeholder="Enter email address (e.g. name@example.com)"
                    placeholderTextColor={colors.outline}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>

            {/* Save Button CTA */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Check size={18} color="#ffffff" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* TAB 2: Personal Information */
          <View style={styles.tabContent}>
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Account Credentials</Text>

              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <ShieldCheck size={20} color={colors.primary} />
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Account Status</Text>
                  <Text style={styles.infoValue}>{status} ✓</Text>
                </View>
                <View style={styles.activeStatusPill}>
                  <Text style={styles.activeStatusPillText}>Active</Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Calendar size={20} color={colors.secondaryContainer} />
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Member Since</Text>
                  <Text style={styles.infoValue}>{createdAt || 'September 2026'}</Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <User size={20} color={colors.tertiary} />
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Role & Platform</Text>
                  <Text style={styles.infoValue}>Customer Portal (H2H Delivery)</Text>
                </View>
              </View>
            </View>

            <View style={styles.noticeBox}>
              <ShieldCheck size={20} color={colors.primary} />
              <View style={styles.noticeCol}>
                <Text style={styles.noticeTitle}>Customer Data Privacy</Text>
                <Text style={styles.noticeDesc}>
                  Your personal contact information and delivery locations are encrypted and only shared with your assigned courier during active order handovers.
                </Text>
              </View>
            </View>
          </View>
        )}
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
    lineHeight: 22,
    color: colors.onSurface,
  },
  headerRightPlaceholder: {
    width: 38,
  },
  tabsWrapper: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: colors.surface,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 999,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  tabBtnActive: {
    backgroundColor: colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },
  tabBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 16,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  tabContent: {
    gap: 14,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    position: 'relative',
    borderWidth: 3,
    borderColor: colors.primaryFixed,
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    color: colors.primary,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarHint: {
    fontSize: 11.5,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.errorContainer,
    padding: 12,
    borderRadius: 14,
  },
  errorText: {
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.error,
    flex: 1,
  },
  formCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    gap: 14,
  },
  inputGroup: {
    gap: 5,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.6,
    lineHeight: 14,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#e6f7ec',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  verifiedBadgeText: {
    color: colors.tertiary,
    fontSize: 9.5,
    fontWeight: '700',
    lineHeight: 12,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    minHeight: 46,
  },
  disabledInputWrap: {
    backgroundColor: colors.surfaceContainer,
    opacity: 0.9,
  },
  disabledInputText: {
    fontSize: 13.5,
    color: colors.onSurface,
    fontWeight: '600',
    lineHeight: 18,
  },
  fieldNote: {
    fontSize: 11,
    color: colors.outline,
    lineHeight: 15,
  },
  textInput: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.onSurface,
    padding: 0,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.secondaryContainer,
    borderRadius: 999,
    paddingVertical: 13,
    shadowColor: colors.secondaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    gap: 12,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    color: colors.onSurface,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 10.5,
    lineHeight: 14,
    color: colors.onSurfaceVariant,
  },
  infoValue: {
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 18,
    color: colors.onSurface,
  },
  activeStatusPill: {
    backgroundColor: '#e6f7ec',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  activeStatusPillText: {
    color: colors.tertiary,
    fontSize: 10.5,
    fontWeight: '700',
    lineHeight: 13,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainer,
  },
  noticeBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    alignItems: 'flex-start',
  },
  noticeCol: {
    flex: 1,
    gap: 3,
  },
  noticeTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 16,
    color: colors.primary,
  },
  noticeDesc: {
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
});
