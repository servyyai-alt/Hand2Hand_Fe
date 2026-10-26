import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, UserPlus, LogIn, X, Shield, Lock } from 'lucide-react-native';

interface GuestAuthPromptProps {
  /** If provided, renders as a popup Modal. Otherwise renders as a full-page screen placeholder. */
  visible?: boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  showBackToHome?: boolean;
}

export function GuestAuthPrompt({
  visible,
  onClose,
  title = 'Sign in to continue',
  description = 'Sign in or create an account to access this feature and manage your deliveries.',
  icon,
  showBackToHome = true,
}: GuestAuthPromptProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isModal = visible !== undefined;

  const handleSignIn = () => {
    if (onClose) onClose();
    router.push('/(auth)/login');
  };

  const handleRegister = () => {
    if (onClose) onClose();
    router.push('/(auth)/register');
  };

  const handleGoHome = () => {
    if (onClose) onClose();
    router.replace('/(customer)');
  };

  const content = (
    <View style={[styles.card, isModal && styles.modalCard]}>
      {isModal && onClose && (
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={20} color="#64748B" />
        </TouchableOpacity>
      )}

      {/* Top Icon Badge */}
      <View style={styles.iconCircle}>
        {icon || <Lock size={28} color="#00417E" />}
      </View>

      {/* Title & Description */}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {/* Buttons */}
      <View style={styles.buttonStack}>
        {/* Primary Sign In Button */}
        <TouchableOpacity
          style={styles.signInBtn}
          onPress={handleSignIn}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['#FF8200', '#FA6000']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            <LogIn size={18} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.signInBtnText}>Sign In</Text>
            <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.2} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Secondary Create Account Button */}
        <TouchableOpacity
          style={styles.registerBtn}
          onPress={handleRegister}
          activeOpacity={0.8}
        >
          <UserPlus size={18} color="#00417E" strokeWidth={2} />
          <Text style={styles.registerBtnText}>Create Account</Text>
        </TouchableOpacity>

        {/* Optional Return to Home Link */}
        {showBackToHome && !isModal && (
          <TouchableOpacity
            style={styles.homeLink}
            onPress={handleGoHome}
            activeOpacity={0.7}
          >
            <Text style={styles.homeLinkText}>← Continue exploring as Guest</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (isModal) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={onClose}
          />
          {content}
        </View>
      </Modal>
    );
  }

  return (
    <View style={styles.screenWrapper}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    } : {}),
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#00417E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    position: 'relative',
  },
  modalCard: {
    zIndex: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F1E36',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
    paddingHorizontal: 6,
  },
  buttonStack: {
    width: '100%',
    gap: 10,
  },
  signInBtn: {
    borderRadius: 12,
    shadowColor: '#FB7800',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  btnGradient: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  registerBtn: {
    height: 46,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#00417E',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  registerBtnText: {
    color: '#00417E',
    fontSize: 15,
    fontWeight: '700',
  },
  homeLink: {
    alignSelf: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  homeLinkText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
});
