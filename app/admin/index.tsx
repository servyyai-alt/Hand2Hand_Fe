import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Building2,
  Users,
  Truck,
  Package,
  TrendingUp,
  Clock,
  LogOut,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react-native';
import { store } from '../../src/store';
import { logout } from '../../src/store/slices/authSlice';
import { storageService } from '../../src/services/storage.service';
import { apiClient } from '../../src/services/api.service';
import { colors } from '../../src/theme';
import { showToast } from '../../src/utils/toast';

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await apiClient.get('/admin/dashboard');
      setDashboard(res.data.data);
    } catch (err: any) {
      showToast('error', 'Error', 'Failed to load live admin metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handleLogout = async () => {
    await storageService.clearAll();
    store.dispatch(logout());
    router.replace('/(auth)/admin-login');
  };

  return (
    <View style={styles.screen}>
      {/* Admin App Bar */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerBrand}>
          <View style={styles.brandIconBox}>
            <Building2 size={20} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.brandBadge}>H2H PLATFORM OPS</Text>
            <Text style={styles.brandTitle}>Admin Console</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.7}>
            <RefreshCw size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <LogOut size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Fetching platform metrics...</Text>
          </View>
        ) : (
          <>
            {/* Live Operational Health Bar */}
            <View style={styles.healthBanner}>
              <View style={styles.healthDot} />
              <Text style={styles.healthText}>Network Active • Real-time Sync</Text>
            </View>

            {/* Metrics Grid 1: Delivery Operations */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>TODAY'S DELIVERIES</Text>
              <View style={styles.metricGrid}>
                <View style={styles.metricCard}>
                  <View style={[styles.metricIconWrap, { backgroundColor: colors.primaryFixed }]}>
                    <Package size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.metricValue}>{dashboard?.todayDeliveries ?? 0}</Text>
                  <Text style={styles.metricLabel}>Total Bookings</Text>
                </View>

                <View style={styles.metricCard}>
                  <View style={[styles.metricIconWrap, { backgroundColor: colors.secondaryFixed }]}>
                    <Truck size={18} color={colors.secondary} />
                  </View>
                  <Text style={styles.metricValue}>{dashboard?.activeDeliveries ?? 0}</Text>
                  <Text style={styles.metricLabel}>In Transit / Active</Text>
                </View>

                <View style={styles.metricCard}>
                  <View style={[styles.metricIconWrap, { backgroundColor: '#e6f7ec' }]}>
                    <CheckCircle2 size={18} color={colors.tertiary} />
                  </View>
                  <Text style={styles.metricValue}>{dashboard?.completed ?? 0}</Text>
                  <Text style={styles.metricLabel}>Completed</Text>
                </View>

                <View style={styles.metricCard}>
                  <View style={[styles.metricIconWrap, { backgroundColor: colors.errorContainer }]}>
                    <AlertCircle size={18} color={colors.error} />
                  </View>
                  <Text style={styles.metricValue}>{dashboard?.cancelled ?? 0}</Text>
                  <Text style={styles.metricLabel}>Cancelled</Text>
                </View>
              </View>
            </View>

            {/* Metrics Grid 2: Platform Users & Revenue */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>USERS & REVENUE</Text>
              <View style={styles.metricGrid}>
                <View style={styles.metricCard}>
                  <View style={[styles.metricIconWrap, { backgroundColor: colors.primaryFixed }]}>
                    <Users size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.metricValue}>{dashboard?.totalCustomers ?? 0}</Text>
                  <Text style={styles.metricLabel}>Customers</Text>
                </View>

                <View style={styles.metricCard}>
                  <View style={[styles.metricIconWrap, { backgroundColor: colors.secondaryFixed }]}>
                    <Truck size={18} color={colors.secondary} />
                  </View>
                  <Text style={styles.metricValue}>{dashboard?.totalPartners ?? 0}</Text>
                  <Text style={styles.metricLabel}>Partners ({dashboard?.activePartners ?? 0} online)</Text>
                </View>

                <View style={[styles.metricCard, { width: '100%' }]}>
                  <View style={[styles.metricIconWrap, { backgroundColor: '#e6f7ec' }]}>
                    <TrendingUp size={18} color={colors.tertiary} />
                  </View>
                  <Text style={styles.metricValue}>₹{dashboard?.todayRevenue ?? 0}</Text>
                  <Text style={styles.metricLabel}>Today's Delivery Fare Volume (INR)</Text>
                </View>
              </View>
            </View>

            {/* Dispatch Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>DISPATCH QUEUE BREAKDOWN</Text>
              <View style={styles.queueCard}>
                <View style={styles.queueRow}>
                  <Text style={styles.queueLabel}>Searching Nearby Partner</Text>
                  <View style={styles.queueBadge}>
                    <Text style={styles.queueBadgeText}>{dashboard?.searchingPartner ?? 0}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.queueRow}>
                  <Text style={styles.queueLabel}>Partner Assigned / Arriving</Text>
                  <View style={styles.queueBadge}>
                    <Text style={styles.queueBadgeText}>{dashboard?.partnerAssigned ?? 0}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.queueRow}>
                  <Text style={styles.queueLabel}>In-Transit to Destination</Text>
                  <View style={styles.queueBadge}>
                    <Text style={styles.queueBadgeText}>{dashboard?.inTransit ?? 0}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.queueRow}>
                  <Text style={styles.queueLabel}>Average Delivery Duration</Text>
                  <View style={[styles.queueBadge, { backgroundColor: colors.primaryFixed }]}>
                    <Text style={[styles.queueBadgeText, { color: colors.primary }]}>
                      {dashboard?.avgDeliveryMinutes ?? 28} mins
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
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
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffdad6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 18,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  healthBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e6f7ec',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.tertiary,
  },
  healthText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.tertiary,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    gap: 6,
    shadowColor: '#111c2d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.onSurface,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  queueCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    overflow: 'hidden',
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  queueLabel: {
    fontSize: 13,
    color: colors.onSurface,
    fontWeight: '600',
  },
  queueBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  queueBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.onSurface,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceContainer,
  },
});
