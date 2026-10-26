import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  MapPin,
  Package,
  CreditCard,
  Bell,
  Shield,
  HelpCircle,
  Ticket,
  FileText,
  ChevronRight,
  LogOut,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Phone,
  Mail,
  LogIn,
} from 'lucide-react-native';
import { useAppSelector } from '../../../src/hooks/useAppSelector';
import { store } from '../../../src/store';
import { logout, updateUser } from '../../../src/store/slices/authSlice';
import { storageService } from '../../../src/services/storage.service';
import { profileService, UserProfileResponse } from '../../../src/services/profile.service';
import { colors } from '../../../src/theme';
import { GuestAuthPrompt } from '../../../src/components/auth/GuestAuthPrompt';

export default function ProfileMainHubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authUser = useAppSelector((s) => s.auth.user);
  const isGuest = useAppSelector((s) => s.auth.isGuest);

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState<boolean>(false);

  // Guest Auth Modal state
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalTitle, setAuthModalTitle] = useState<string>('Sign in to continue');
  const [authModalDesc, setAuthModalDesc] = useState<string>('Sign in or create an account to access this feature.');

  const handleProtectedAction = (action: () => void, title: string, desc: string) => {
    if (isGuest || !authUser) {
      setAuthModalTitle(title);
      setAuthModalDesc(desc);
      setShowAuthModal(true);
      return;
    }
    action();
  };

  const fetchProfile = useCallback(async () => {
    if (isGuest || !authUser) {
      setLoading(false);
      return;
    }
    try {
      const data = await profileService.getProfile();
      setProfile(data);
      store.dispatch(
        updateUser({
          name: data.name,
          email: data.email,
          avatar: data.avatar,
        })
      );
    } catch {
      // Fallback to redux user
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleLogout = async () => {
    setLogoutModalVisible(false);
    try {
      await storageService.clearAll();
    } catch {}
    store.dispatch(logout());
    router.replace('/(auth)/login');
  };

  const displayName = isGuest || !authUser ? 'Guest User' : (profile?.name || authUser?.name || 'Customer');
  const displayPhone = isGuest || !authUser ? '' : (profile?.phone || authUser?.phone || '');
  const displayEmail = isGuest || !authUser ? '' : (profile?.email || authUser?.email || '');
  const displayAvatar = isGuest || !authUser ? undefined : (profile?.avatar || authUser?.avatar);
  const addressesCount = isGuest || !authUser ? 0 : (profile?.addressesCount ?? profile?.addresses?.length ?? 0);

  return (
    <View style={styles.screen}>
      {/* Top App Bar */}
      <View style={[styles.appBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.appBarBrand}>
          <View style={styles.brandIconCircle}>
            <Text style={styles.brandIconText}>H</Text>
          </View>
          <View>
            <Text style={styles.brandSub}>DELIVERY</Text>
            <Text style={styles.appBarTitle}>Profile</Text>
          </View>
        </View>
        <View style={styles.appBarRight}>
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => router.push('/(customer)/notifications')}
            activeOpacity={0.7}
          >
            <Bell size={20} color={colors.onSurfaceVariant} />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerAvatarWrap}
            onPress={() => router.push('/(customer)/profile/edit')}
            activeOpacity={0.7}
          >
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Text style={styles.headerAvatarPlaceholderText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 160 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Identity Card */}
        {isGuest || !authUser ? (
          <View style={styles.identityCard}>
            <View style={styles.identityTopRow}>
              <View style={styles.avatarWrap}>
                <View style={[styles.largeAvatarPlaceholder, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1.5 }]}>
                  <Text style={[styles.largeAvatarPlaceholderText, { color: '#00417E' }]}>
                    G
                  </Text>
                </View>
              </View>

              <View style={styles.identityDetails}>
                <View style={styles.badgeRow}>
                  <View style={[styles.customerBadge, { backgroundColor: '#EFF6FF' }]}>
                    <Text style={[styles.customerBadgeText, { color: '#00417E' }]}>GUEST SESSION</Text>
                  </View>
                </View>

                <Text style={styles.userName} numberOfLines={1}>
                  Guest User
                </Text>

                <Text style={[styles.contactText, { marginTop: 2, color: '#64748B' }]} numberOfLines={1}>
                  Browsing without account
                </Text>
              </View>
            </View>

            {/* Guest Sign-in CTA banner inside identity card */}
            <View style={styles.guestCtaCard}>
              <Text style={styles.guestCtaTitle}>Save addresses & sync deliveries</Text>
              <Text style={styles.guestCtaDesc}>
                Sign in to place delivery orders, manage saved addresses, and track shipments in real time.
              </Text>
              <View style={styles.guestCtaBtnRow}>
                <TouchableOpacity
                  style={styles.guestCtaSignIn}
                  onPress={() => router.push('/(auth)/login')}
                  activeOpacity={0.88}
                >
                  <Text style={styles.guestCtaSignInText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.guestCtaRegister}
                  onPress={() => router.push('/(auth)/register')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.guestCtaRegisterText}>Create Account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.identityCard}>
            <View style={styles.identityTopRow}>
              <View style={styles.avatarWrap}>
                {displayAvatar ? (
                  <Image source={{ uri: displayAvatar }} style={styles.largeAvatar} />
                ) : (
                  <View style={styles.largeAvatarPlaceholder}>
                    <Text style={styles.largeAvatarPlaceholderText}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.identityDetails}>
                <View style={styles.badgeRow}>
                  <View style={styles.customerBadge}>
                    <Text style={styles.customerBadgeText}>CUSTOMER</Text>
                  </View>
                  <View style={styles.activeBadge}>
                    <CheckCircle2 size={11} color={colors.tertiary} />
                    <Text style={styles.activeBadgeText}>Active</Text>
                  </View>
                </View>

                <Text style={styles.userName} numberOfLines={1}>
                  {displayName}
                </Text>

                {displayPhone ? (
                  <View style={styles.contactItem}>
                    <Phone size={12} color={colors.onSurfaceVariant} />
                    <Text style={styles.contactText} numberOfLines={1}>
                      {`+91\u00A0${displayPhone.replace(/^(\+91|91|\s)+/, '')}`}
                    </Text>
                    <View style={styles.verifiedPill}>
                      <CheckCircle2 size={10} color={colors.tertiary} />
                      <Text style={styles.verifiedPillText}>Verified</Text>
                    </View>
                  </View>
                ) : null}

                {displayEmail ? (
                  <View style={styles.contactItem}>
                    <Mail size={12} color={colors.onSurfaceVariant} />
                    <Text style={styles.contactText} numberOfLines={1}>{displayEmail}</Text>
                    <View style={styles.verifiedPill}>
                      <CheckCircle2 size={10} color={colors.tertiary} />
                      <Text style={styles.verifiedPillText}>Verified</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>

            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => router.push('/(customer)/profile/edit')}
              activeOpacity={0.8}
            >
              <User size={15} color={colors.primary} />
              <Text style={styles.editProfileBtnText}>Edit Profile Details</Text>
              <ArrowRight size={15} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Section: Account & Services */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ACCOUNT & DELIVERIES</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon={<MapPin size={18} color={colors.primary} />}
              title="Saved Addresses"
              subtitle="Home, work & frequent drop points"
              badge={addressesCount > 0 ? `${addressesCount} Saved` : undefined}
              onPress={() => handleProtectedAction(() => router.push('/(customer)/profile/addresses'), 'Saved Addresses', 'Sign in or create an account to view and manage your saved addresses.')}
            />
            <View style={styles.divider} />
            <MenuItem
              icon={<Package size={18} color={colors.secondaryContainer} />}
              title="My Deliveries & Orders"
              subtitle="Track your deliveries and view your order history."
              onPress={() => handleProtectedAction(() => router.push('/(customer)/deliveries'), 'My Deliveries & Orders', 'Sign in or create an account to view your delivery orders and history.')}
            />
            <View style={styles.divider} />
            <MenuItem
              icon={<CreditCard size={18} color={colors.tertiary} />}
              title="Payment Methods & Invoices"
              subtitle="UPI, cards & fare receipts"
              onPress={() => handleProtectedAction(() => router.push('/(customer)/payments'), 'Payment Methods & Invoices', 'Sign in or create an account to view your payments and download invoices.')}
            />
          </View>
        </View>

        {/* Section: Security */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SECURITY</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon={<Shield size={18} color={colors.primary} />}
              title="Password & Security"
              subtitle="Change password & account privacy"
              onPress={() => handleProtectedAction(() => router.push('/(customer)/profile/security'), 'Password & Security', 'Sign in or create an account to update security and password settings.')}
            />
          </View>
        </View>

        {/* Section: Support & Policies */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SUPPORT & POLICIES</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon={<HelpCircle size={18} color={colors.primary} />}
              title="Help & Support Center"
              subtitle="FAQs, 24/7 care & user guides"
              onPress={() => router.push('/(customer)/profile/support')}
            />
            <View style={styles.divider} />
            <MenuItem
              icon={<Ticket size={18} color={colors.secondaryContainer} />}
              title="Support Tickets"
              subtitle="Track reported issues & messages"
              onPress={() => handleProtectedAction(() => router.push('/(customer)/profile/tickets'), 'Support Tickets', 'Sign in or create an account to view and report support tickets.')}
            />
            <View style={styles.divider} />
            <MenuItem
              icon={<FileText size={18} color={colors.onSurfaceVariant} />}
              title="Terms of Service & Policies"
              subtitle="Privacy policy, terms & refunds"
              onPress={() => router.push('/(customer)/profile/policies')}
            />
          </View>
        </View>

        {/* Session Action: Logout or Sign In */}
        {isGuest || !authUser ? (
          <TouchableOpacity
            style={[styles.logoutButton, { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }]}
            onPress={() => {
              store.dispatch(logout());
              router.replace('/(auth)/login');
            }}
            activeOpacity={0.8}
          >
            <LogIn size={18} color="#00417E" />
            <Text style={[styles.logoutButtonText, { color: '#00417E' }]}>Sign In to Account</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => setLogoutModalVisible(true)}
            activeOpacity={0.8}
          >
            <LogOut size={18} color={colors.error} />
            <Text style={styles.logoutButtonText}>Log Out of Account</Text>
          </TouchableOpacity>
        )}

        {/* Footer Build Tag */}
        <View style={styles.footer}>
          <Text style={styles.footerVersion}>H2H Delivery v1.0.0 (Build 2026.09)</Text>
          <Text style={styles.footerTagline}>Made with ❤️ for Human-to-Human Deliveries</Text>
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
          <View style={styles.modalBox}>
            <View style={styles.modalIconWrap}>
              <LogOut size={28} color={colors.error} />
            </View>
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalDesc}>
              Are you sure you want to log out from your H2H Customer account?
            </Text>
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setLogoutModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Guest Auth Prompt Modal */}
      <GuestAuthPrompt
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title={authModalTitle}
        description={authModalDesc}
      />
    </View>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
}

function MenuItem({ icon, title, subtitle, badge, onPress }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuIconBox}>{icon}</View>
      <View style={styles.menuTextCol}>
        <View style={styles.menuTitleRow}>
          <Text style={styles.menuTitle} numberOfLines={1}>{title}</Text>
          {badge ? (
            <View style={styles.menuItemBadge}>
              <Text style={styles.menuItemBadgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.menuSubtitle} numberOfLines={2}>{subtitle}</Text>
      </View>
      <ChevronRight size={18} color={colors.outline} style={styles.menuChevron} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  appBarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 2px 4px rgba(17, 28, 45, 0.25)' },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  brandIconText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 20,
    textAlign: 'center',
  },
  brandSub: {
    fontSize: 9.5,
    fontWeight: '700',
    lineHeight: 12,
    color: colors.secondaryContainer,
    letterSpacing: 1.2,
  },
  appBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 21,
    color: colors.onSurface,
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondaryContainer,
  },
  headerAvatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
  },
  headerAvatar: {
    width: 38,
    height: 38,
  },
  headerAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarPlaceholderText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 20,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 18,
  },
  identityCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    ...Platform.select({
      web: { boxShadow: '0px 4px 10px rgba(17, 28, 45, 0.05)' },
      default: {
        shadowColor: '#111c2d',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
      },
    }),
  },
  identityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 2,
    borderColor: colors.primaryFixed,
    flexShrink: 0,
  },
  largeAvatar: {
    width: 60,
    height: 60,
  },
  largeAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeAvatarPlaceholderText: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
    color: colors.primary,
  },
  identityDetails: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  customerBadge: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  customerBadgeText: {
    color: colors.primary,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    lineHeight: 12,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#e6f7ec',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  activeBadgeText: {
    color: colors.tertiary,
    fontSize: 10.5,
    fontWeight: '600',
    lineHeight: 13,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
    color: colors.onSurface,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'nowrap',
    marginTop: 1,
  },
  contactText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
    flexShrink: 1,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  verifiedPillText: {
    color: colors.tertiary,
    fontSize: 9.5,
    fontWeight: '700',
    lineHeight: 12,
  },
  editProfileBtn: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editProfileBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 18,
    color: colors.primary,
  },
  guestCtaCard: {
    marginTop: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  guestCtaTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F1E36',
    marginBottom: 4,
  },
  guestCtaDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 12,
  },
  guestCtaBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guestCtaSignIn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FB7800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestCtaSignInText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  guestCtaRegister: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#00417E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestCtaRegisterText: {
    color: '#00417E',
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    color: colors.primary,
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  sectionSubHeader: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
  },
  portalsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 4,
    paddingHorizontal: 4,
  },
  menuCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    ...Platform.select({
      web: { boxShadow: '0px 2px 6px rgba(17, 28, 45, 0.04)' },
      default: {
        shadowColor: '#111c2d',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
      },
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    flexShrink: 0,
  },
  menuTextCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  menuTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 18,
    color: colors.onSurface,
    flexShrink: 1,
  },
  menuItemBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 999,
  },
  menuItemBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
    color: colors.primary,
  },
  menuSubtitle: {
    fontSize: 11.5,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
  },
  menuChevron: {
    alignSelf: 'center',
    flexShrink: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceContainer,
    marginHorizontal: 14,
  },
  portalCardActive: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 18,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.primaryFixed,
    gap: 6,
    ...Platform.select({
      web: { boxShadow: '0px 2px 6px rgba(17, 28, 45, 0.04)' },
      default: {
        shadowColor: '#111c2d',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
      },
    }),
  },
  portalCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    gap: 6,
    marginTop: 10,
    ...Platform.select({
      web: { boxShadow: '0px 2px 6px rgba(17, 28, 45, 0.04)' },
      default: {
        shadowColor: '#111c2d',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
      },
    }),
  },
  portalCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  portalPillBlue: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  portalPillBlueText: {
    color: colors.primary,
    fontSize: 9.5,
    fontWeight: '800',
    lineHeight: 12,
  },
  portalPillOrange: {
    backgroundColor: colors.secondaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  portalPillOrangeText: {
    color: colors.secondary,
    fontSize: 9.5,
    fontWeight: '800',
    lineHeight: 12,
  },
  portalPillNavy: {
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  portalPillNavyText: {
    color: colors.onSurface,
    fontSize: 9.5,
    fontWeight: '800',
    lineHeight: 12,
  },
  portalTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    lineHeight: 19,
    color: colors.onSurface,
    marginTop: 2,
  },
  portalDesc: {
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
  portalLinkOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
  },
  portalLinkOrangeText: {
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 16,
    color: colors.secondaryContainer,
  },
  portalLinkNavy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
  },
  portalLinkNavyText: {
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 16,
    color: colors.primary,
  },
  logoutButton: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ffdad6',
  },
  logoutButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 18,
    color: colors.error,
  },
  footer: {
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    marginBottom: 20,
  },
  footerVersion: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.outline,
  },
  footerTagline: {
    fontSize: 11,
    color: colors.outline,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      web: { boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.15)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffdad6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  modalDesc: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
