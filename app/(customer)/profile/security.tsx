import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Trash2,
  AlertTriangle,
} from 'lucide-react-native';
import { profileService } from '../../../src/services/profile.service';
import { storageService } from '../../../src/services/storage.service';
import { store } from '../../../src/store';
import { logout } from '../../../src/store/slices/authSlice';
import { showToast } from '../../../src/utils/toast';
import { useAppSelector } from '../../../src/hooks/useAppSelector';
import { GuestAuthPrompt } from '../../../src/components/auth/GuestAuthPrompt';

export default function SecurityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authUser = useAppSelector((s) => s.auth.user);
  const isGuest = useAppSelector((s) => s.auth.isGuest);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changing, setChanging] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Logout modal state
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Account deletion modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleChangePassword = async () => {
    setPasswordError(null);
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setPasswordError('Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setChanging(true);
    try {
      await profileService.changePassword(currentPassword, newPassword);
      showToast('success', 'Password Updated', 'Your account password was updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to update password.';
      setPasswordError(msg);
      showToast('error', 'Error', msg);
    } finally {
      setChanging(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await storageService.clearAll();
    } catch {
      // ignore
    } finally {
      setLoggingOut(false);
      setLogoutModalVisible(false);
      store.dispatch(logout());
      router.replace('/(auth)/login');
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await profileService.deleteAccount(deleteReason.trim() || undefined);
      setDeleteModalVisible(false);
      await storageService.clearAll();
      store.dispatch(logout());
      showToast('info', 'Account Deactivated', 'Your H2H account has been safely deactivated.');
      router.replace('/(auth)/login');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to delete account.';
      showToast('error', 'Error', msg);
    } finally {
      setDeleting(false);
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
            <ArrowLeft size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Password & Security</Text>
          <View style={{ width: 40 }} />
        </View>
        <GuestAuthPrompt
          title="Sign in to continue"
          description="Sign in or create an account to manage your password and account security."
          icon={<ShieldCheck size={28} color="#00417E" />}
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
          accessibilityLabel="Go back to profile"
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle}>Password & Security</Text>
          <Text style={styles.headerSubtitle}>Keep your account safe and secure</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 140 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Card 1: Change Password */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.headerIconBox}>
              <Lock size={18} color="#00417E" />
            </View>
            <View style={styles.headerTitleCol}>
              <Text style={styles.cardTitle}>Change Password</Text>
              <Text style={styles.cardSubtitle}>Use a strong password to keep your account safe.</Text>
            </View>
          </View>

          {passwordError ? (
            <View style={styles.errorBanner}>
              <AlertTriangle size={15} color="#DC2626" />
              <Text style={styles.errorBannerText}>{passwordError}</Text>
            </View>
          ) : null}

          {/* Current Password Field */}
          <View style={styles.inputWrap}>
            <Lock size={18} color="#94A3B8" style={styles.fieldLeadIcon} />
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={(t) => {
                setPasswordError(null);
                setCurrentPassword(t);
              }}
              placeholder="Enter current password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showCurrent}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowCurrent(!showCurrent)}
              activeOpacity={0.7}
              style={styles.eyeBtn}
              accessibilityLabel={showCurrent ? 'Hide current password' : 'Show current password'}
            >
              {showCurrent ? <Eye size={18} color="#94A3B8" /> : <EyeOff size={18} color="#94A3B8" />}
            </TouchableOpacity>
          </View>

          {/* New Password Field */}
          <View style={styles.inputWrap}>
            <Lock size={18} color="#94A3B8" style={styles.fieldLeadIcon} />
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={(t) => {
                setPasswordError(null);
                setNewPassword(t);
              }}
              placeholder="Enter new password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showNew}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowNew(!showNew)}
              activeOpacity={0.7}
              style={styles.eyeBtn}
              accessibilityLabel={showNew ? 'Hide new password' : 'Show new password'}
            >
              {showNew ? <Eye size={18} color="#94A3B8" /> : <EyeOff size={18} color="#94A3B8" />}
            </TouchableOpacity>
          </View>

          {/* Confirm New Password Field */}
          <View style={styles.inputWrap}>
            <Lock size={18} color="#94A3B8" style={styles.fieldLeadIcon} />
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={(t) => {
                setPasswordError(null);
                setConfirmPassword(t);
              }}
              placeholder="Re-enter new password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowConfirm(!showConfirm)}
              activeOpacity={0.7}
              style={styles.eyeBtn}
              accessibilityLabel={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirm ? <Eye size={18} color="#94A3B8" /> : <EyeOff size={18} color="#94A3B8" />}
            </TouchableOpacity>
          </View>

          {/* Update Password Button */}
          <TouchableOpacity
            style={[styles.primaryBtn, changing && styles.btnDisabled]}
            onPress={handleChangePassword}
            disabled={changing}
            activeOpacity={0.8}
          >
            {changing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Card 2: Account Security */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.headerIconBox}>
              <Shield size={18} color="#00417E" />
            </View>
            <View style={styles.headerTitleCol}>
              <Text style={styles.cardTitle}>Account Security</Text>
              <Text style={styles.cardSubtitle}>Manage your account security settings.</Text>
            </View>
          </View>

          {/* Row 1: OTP Verification */}
          <View style={styles.securityRow}>
            <View style={styles.greenIconBox}>
              <ShieldCheck size={18} color="#16A34A" />
            </View>
            <View style={styles.secRowCol}>
              <Text style={styles.secRowTitle}>OTP Verification</Text>
              <Text style={styles.secRowSubtitle}>Your mobile number is verified for secure access.</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* Row 2: Log Out */}
          <TouchableOpacity
            style={styles.securityRow}
            onPress={() => setLogoutModalVisible(true)}
            activeOpacity={0.7}
            accessibilityLabel="Log out option"
          >
            <View style={styles.headerIconBox}>
              <LogOut size={18} color="#00417E" />
            </View>
            <View style={styles.secRowCol}>
              <Text style={styles.secRowTitle}>Log Out</Text>
              <Text style={styles.secRowSubtitle}>Securely sign out from your account on this device.</Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Card 3: Danger Zone */}
        <View style={styles.dangerCard}>
          <View style={styles.dangerTopRow}>
            <View style={styles.dangerIconBox}>
              <Trash2 size={18} color="#DC2626" />
            </View>
            <View style={styles.dangerTextCol}>
              <Text style={styles.dangerBadge}>Danger Zone</Text>
              <Text style={styles.dangerTitle}>Delete Account</Text>
              <Text style={styles.dangerDesc}>
                Request deletion of your H2H customer account. Your data will be handled as per our data retention policy.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={() => setDeleteModalVisible(true)}
            activeOpacity={0.8}
            accessibilityLabel="Request Account Deletion"
          >
            <Text style={styles.dangerBtnText}>Request Account Deletion</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.logoutIconBox}>
              <LogOut size={26} color="#00417E" />
            </View>
            <Text style={styles.modalTitle}>Log Out</Text>
            <Text style={styles.modalDesc}>
              Are you sure you want to securely log out from your account on this device?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, styles.modalBtnRow]}
                onPress={() => setLogoutModalVisible(false)}
                disabled={loggingOut}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText} numberOfLines={1}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalLogoutBtn, styles.modalBtnRow, loggingOut && styles.btnDisabled]}
                onPress={handleLogout}
                disabled={loggingOut}
                activeOpacity={0.8}
              >
                {loggingOut ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalLogoutText} numberOfLines={1}>Log Out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Account Deactivation Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.dangerModalIconBox}>
              <AlertTriangle size={26} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>Deactivate Your Account?</Text>
            <Text style={styles.modalDesc}>
              This action will revoke your access to the H2H Customer Portal. Please review the consequences before continuing.
            </Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Reason for leaving (optional)</Text>
              <TextInput
                style={styles.modalInput}
                value={deleteReason}
                onChangeText={setDeleteReason}
                placeholder="Let us know how we could improve..."
                placeholderTextColor="#94A3B8"
                editable={!deleting}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, styles.modalBtnRow]}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deleting}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText} numberOfLines={1}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalDeleteBtn, styles.modalBtnRow, deleting && styles.btnDisabled]}
                onPress={handleDeleteAccount}
                disabled={deleting}
                activeOpacity={0.8}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalDeleteText} numberOfLines={1}>Confirm Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 2,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },

  // Card Base
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 2,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  cardSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 16,
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
    lineHeight: 16,
  },

  // Inputs
  inputWrap: {
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  fieldLeadIcon: {
    marginRight: 2,
  },
  input: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    padding: 0,
  },
  eyeBtn: {
    padding: 4,
  },

  // Primary Update Button
  primaryBtn: {
    height: 48,
    backgroundColor: '#003B73',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.65,
  },

  // Account Security Rows
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 12,
  },
  greenIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secRowCol: {
    flex: 1,
    gap: 2,
  },
  secRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
  },
  secRowSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#16A34A',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },

  // Danger Zone
  dangerCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 14,
  },
  dangerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  dangerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerTextCol: {
    flex: 1,
    gap: 2,
  },
  dangerBadge: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#DC2626',
    lineHeight: 17,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 19,
    marginTop: 1,
  },
  dangerDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginTop: 3,
  },
  dangerBtn: {
    height: 46,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtnText: {
    color: '#DC2626',
    fontSize: 13.5,
    fontWeight: '700',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  logoutIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerModalIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
  },
  modalDesc: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalInputGroup: {
    width: '100%',
    gap: 5,
    marginTop: 4,
  },
  modalInputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 13,
    color: '#0F172A',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    width: '100%',
    marginTop: 12,
  },
  modalBtnRow: {
    flex: 1,
    height: 44,
  },
  modalCancelBtn: {
    height: 44,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  modalLogoutBtn: {
    flex: 1,
    height: 44,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#003B73',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  modalLogoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  modalDeleteBtn: {
    height: 44,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modalDeleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
