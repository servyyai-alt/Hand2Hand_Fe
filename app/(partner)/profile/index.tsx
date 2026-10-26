import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Bike,
  Star,
  CheckCircle2,
  TrendingUp,
  Package,
  Bell,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../../src/services/api.service';
import { storageService } from '../../../src/services/storage.service';
import { useAppDispatch, useAppSelector } from '../../../src/hooks/useAppSelector';
import { logout } from '../../../src/store/slices/authSlice';
import { colors, spacing } from '../../../src/theme';
import { Card } from '../../../src/components/ui/Card';
import { SlideUp } from '../../../src/components/animations/SlideUp';
import { showToast } from '../../../src/utils/toast';

export default function PartnerProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const authUser = useAppSelector(s => s.auth.user);
  const [loggingOut, setLoggingOut] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['partner', 'profile'],
    queryFn: () => apiClient.get('/partners/profile').then(r => r.data.data),
  });

  const handleLogout = () => {
    const doLogout = async () => {
      setLoggingOut(true);
      try {
        await storageService.clearAll();
        dispatch(logout());
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('info', 'Logged out', 'You have been signed out.');
        router.replace('/(auth)/login');
      } catch {
        dispatch(logout());
        router.replace('/(auth)/login');
      } finally {
        setLoggingOut(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        doLogout();
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out of your Partner account?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.neutral[800]} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image
            source={require('../../../assets/images/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Partner Profile</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <SlideUp delay={50}>
          <Card style={styles.profileCard}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>
                {authUser?.name?.[0]?.toUpperCase() || 'P'}
              </Text>
              <View style={styles.verifiedDot}>
                <ShieldCheck size={14} color="#ffffff" />
              </View>
            </View>

            <Text style={styles.partnerName}>{authUser?.name || 'Delivery Partner'}</Text>
            <Text style={styles.partnerRole}>Registered H2H Delivery Partner</Text>

            <View style={styles.kycBadge}>
              <ShieldCheck size={14} color="#15803d" />
              <Text style={styles.kycBadgeText}>KYC & Documents Verified</Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Phone size={16} color={colors.neutral[500]} />
              <Text style={styles.infoText}>{authUser?.phone || 'Not available'}</Text>
            </View>

            {authUser?.email ? (
              <View style={styles.infoRow}>
                <Mail size={16} color={colors.neutral[500]} />
                <Text style={styles.infoText}>{authUser.email}</Text>
              </View>
            ) : null}
          </Card>
        </SlideUp>

        {/* Vehicle Information */}
        <SlideUp delay={90}>
          <Card style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Bike size={18} color={colors.brand[600]} />
              <Text style={styles.sectionTitle}>Vehicle Details</Text>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Vehicle Type</Text>
                <Text style={styles.gridValue}>
                  {profile?.vehicle?.type || 'Motorcycle / Scooter'}
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Plate / Reg No</Text>
                <Text style={styles.gridValue}>
                  {profile?.vehicle?.registrationNumber || 'TN 23 AB 1234'}
                </Text>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Vehicle Model</Text>
                <Text style={styles.gridValue}>
                  {profile?.vehicle?.model || 'Hero Splendor / Activa'}
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Insurance Status</Text>
                <Text style={[styles.gridValue, { color: '#16a34a' }]}>Valid & Insured</Text>
              </View>
            </View>
          </Card>
        </SlideUp>

        {/* Performance Metrics */}
        <SlideUp delay={130}>
          <Card style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Sparkles size={18} color="#d97706" />
              <Text style={styles.sectionTitle}>Partner Performance</Text>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <View style={styles.metricIconRow}>
                  <Star size={16} color="#d97706" />
                  <Text style={styles.metricVal}>
                    {(profile?.rating || 4.9).toFixed(1)}
                  </Text>
                </View>
                <Text style={styles.metricSub}>Rating</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricBox}>
                <View style={styles.metricIconRow}>
                  <CheckCircle2 size={16} color="#2563eb" />
                  <Text style={styles.metricVal}>
                    {profile?.totalDeliveries || 0}
                  </Text>
                </View>
                <Text style={styles.metricSub}>Trips Done</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricBox}>
                <View style={styles.metricIconRow}>
                  <TrendingUp size={16} color="#16a34a" />
                  <Text style={styles.metricVal}>
                    {profile?.completionRate || 98}%
                  </Text>
                </View>
                <Text style={styles.metricSub}>Completion</Text>
              </View>
            </View>
          </Card>
        </SlideUp>

        {/* Quick Links Menu */}
        <SlideUp delay={170}>
          <Card style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/(partner)/deliveries' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <Package size={18} color={colors.neutral[700]} />
                <Text style={styles.menuLabel}>Delivery History</Text>
              </View>
              <ChevronRight size={18} color={colors.neutral[400]} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/(partner)/earnings')}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <TrendingUp size={18} color={colors.neutral[700]} />
                <Text style={styles.menuLabel}>Earnings & Wallet</Text>
              </View>
              <ChevronRight size={18} color={colors.neutral[400]} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/(partner)/notifications')}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <Bell size={18} color={colors.neutral[700]} />
                <Text style={styles.menuLabel}>Notifications & Alerts</Text>
              </View>
              <ChevronRight size={18} color={colors.neutral[400]} />
            </TouchableOpacity>
          </Card>
        </SlideUp>

        {/* Logout Button */}
        <SlideUp delay={200}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.8}
          >
            {loggingOut ? (
              <ActivityIndicator color="#dc2626" />
            ) : (
              <>
                <LogOut size={18} color="#dc2626" />
                <Text style={styles.logoutText}>Sign Out from Partner Portal</Text>
              </>
            )}
          </TouchableOpacity>
        </SlideUp>

        <Text style={styles.versionText}>H2H Partner App v2.0 • Secure Session</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: spacing['3xl'],
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogo: { width: 32, height: 32, borderRadius: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.neutral[900] },

  content: { padding: 16, paddingBottom: 60, gap: 14 },

  // Profile Card
  profileCard: { padding: 20, alignItems: 'center', borderRadius: 20 },
  avatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.brand[100],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 10,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: colors.brand[700] },
  verifiedDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  partnerName: { fontSize: 18, fontWeight: '800', color: colors.neutral[900] },
  partnerRole: { fontSize: 12, color: colors.neutral[500], marginTop: 2 },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  kycBadgeText: { fontSize: 11, fontWeight: '700', color: '#15803d' },

  infoDivider: { width: '100%', height: 1, backgroundColor: '#f1f5f9', marginVertical: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', paddingVertical: 4 },
  infoText: { fontSize: 13, color: colors.neutral[700], fontWeight: '500' },

  // Section Card
  sectionCard: { padding: 16, borderRadius: 18, gap: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.neutral[900] },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between' },
  gridItem: { flex: 1 },
  gridLabel: { fontSize: 11, color: colors.neutral[400], marginBottom: 2 },
  gridValue: { fontSize: 13, fontWeight: '700', color: colors.neutral[800] },

  // Metrics
  metricsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: 6 },
  metricBox: { alignItems: 'center', gap: 4 },
  metricIconRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricVal: { fontSize: 18, fontWeight: '800', color: colors.neutral[900] },
  metricSub: { fontSize: 11, color: colors.neutral[500], fontWeight: '500' },
  metricDivider: { width: 1, height: 32, backgroundColor: '#f1f5f9' },

  // Menu
  menuCard: { borderRadius: 18, overflow: 'hidden', padding: 0 },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuLabel: { fontSize: 13, fontWeight: '600', color: colors.neutral[800] },
  menuDivider: { height: 1, backgroundColor: '#f8fafc', marginHorizontal: 16 },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 6,
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#dc2626' },
  versionText: { fontSize: 11, color: colors.neutral[400], textAlign: 'center', marginTop: 10 },
});
