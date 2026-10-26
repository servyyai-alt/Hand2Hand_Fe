import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch, StyleSheet, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Star, CheckCircle, Bike, ChevronRight, Bell, Navigation, AlertCircle, ArrowRight, Package } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../src/services/api.service';
import { socketService } from '../../src/services/socket.service';
import { useAppSelector, useAppDispatch } from '../../src/hooks/useAppSelector';
import { setOnlineStatus, setCurrentDelivery } from '../../src/store/slices/partnerSlice';
import { FadeIn } from '../../src/components/animations/FadeIn';
import { SlideUp } from '../../src/components/animations/SlideUp';
import { Card } from '../../src/components/ui/Card';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { Skeleton } from '../../src/components/feedback/Skeleton';
import { colors, spacing } from '../../src/theme';
import { showToast } from '../../src/utils/toast';

export default function PartnerDashboard() {
  const router    = useRouter();
  const dispatch  = useAppDispatch();
  const user      = useAppSelector(s => s.auth.user);
  const isOnline  = useAppSelector(s => s.partner.isOnline);
  const [toggling, setToggling] = useState(false);

  // Sync profile & online state
  const { data: profile } = useQuery({
    queryKey: ['partner', 'profile'],
    queryFn: () => apiClient.get('/partners/profile').then(r => r.data.data),
  });

  useEffect(() => {
    if (profile && typeof profile.isOnline === 'boolean') {
      dispatch(setOnlineStatus(profile.isOnline));
    }
  }, [profile]);

  // Active delivery check
  const { data: activeDelivery, refetch: refetchActive } = useQuery({
    queryKey: ['partner', 'active-delivery'],
    queryFn: () => apiClient.get('/partners/deliveries/active').then(r => r.data.data),
    refetchInterval: 8000,
  });

  useEffect(() => {
    if (activeDelivery) {
      dispatch(setCurrentDelivery(activeDelivery._id));
    } else {
      dispatch(setCurrentDelivery(null));
    }
  }, [activeDelivery]);

  // Available requests count
  const { data: availableRequests, refetch: refetchRequests } = useQuery({
    queryKey: ['partner', 'requests', 'available'],
    queryFn: () => apiClient.get('/partners/deliveries/available').then(r => r.data.data),
    enabled: isOnline,
    refetchInterval: 10000,
  });

  // Earnings data
  const { data: earnings, isLoading, refetch: refetchEarnings, isRefetching } = useQuery({
    queryKey: ['partner', 'dashboard', 'earnings'],
    queryFn: () => apiClient.get('/partners/earnings').then(r => r.data.data),
  });

  // Recent completed deliveries
  const { data: recentData, isLoading: recentLoading, refetch: refetchRecent } = useQuery({
    queryKey: ['partner', 'deliveries', 'recent'],
    queryFn: () => apiClient.get('/partners/deliveries?page=1&limit=5').then(r => r.data.data),
  });

  useEffect(() => {
    socketService.connect();
    return () => {};
  }, []);

  const handleRefresh = async () => {
    await Promise.all([refetchEarnings(), refetchActive(), refetchRequests(), refetchRecent()]);
  };

  const handleToggleOnline = async () => {
    setToggling(true);
    try {
      const next = !isOnline;
      await apiClient.post('/partners/availability', { isOnline: next });
      dispatch(setOnlineStatus(next));
      if (next) {
        socketService.emit('partner:go-online');
        showToast('success', 'You are Online', 'Ready to accept delivery orders.');
      } else {
        socketService.emit('partner:go-offline');
        showToast('info', 'You are Offline', 'You will not receive new requests.');
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      showToast('error', 'Update failed', 'Could not update availability. Try again.');
    } finally {
      setToggling(false);
    }
  };

  const stats = [
    { icon: <TrendingUp size={18} color={colors.brand[600]} />, label: "Today's earnings", value: `₹${earnings?.todayEarnings ?? 0}`, bg: colors.brand[50] },
    { icon: <CheckCircle size={18} color="#2563eb" />,          label: "Today's orders",   value: earnings?.todayDeliveries ?? 0,    bg: '#eff6ff' },
    { icon: <Star size={18} color="#d97706" />,                 label: "Rating",           value: (earnings?.rating ?? 4.9).toFixed(1), bg: '#fffbeb' },
    { icon: <Bike size={18} color="#7c3aed" />,                 label: "Completion",       value: `${earnings?.completionRate ?? 98}%`, bg: '#f5f3ff' },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.brand[600]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header */}
      <FadeIn>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logoBadge}
              resizeMode="contain"
            />
            <View>
              <View style={styles.partnerTagRow}>
                <Text style={styles.brandTitle}>Hand2Hand</Text>
                <View style={styles.partnerBadge}>
                  <Text style={styles.partnerBadgeText}>PARTNER</Text>
                </View>
              </View>
              <Text style={styles.name}>{user?.name?.split(' ')[0] || 'Partner'} 👋</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/(partner)/notifications')}
              activeOpacity={0.7}
            >
              <Bell size={20} color={colors.neutral[700]} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatarBox}
              onPress={() => router.push('/(partner)/profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarText}>
                {user?.name?.[0]?.toUpperCase() || 'P'}
              </Text>
              <View style={[styles.avatarStatusDot, { backgroundColor: isOnline ? '#16a34a' : '#9ca3af' }]} />
            </TouchableOpacity>
          </View>
        </View>
      </FadeIn>

      {/* Online / Offline Toggle Banner */}
      <SlideUp delay={50}>
        <Card style={[styles.onlineCard, isOnline ? styles.onlineCardActive : styles.onlineCardInactive]}>
          <View style={styles.onlineRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={styles.onlineStatusBadge}>
                <View style={[styles.statusIndicator, { backgroundColor: isOnline ? '#16a34a' : '#6b7280' }]} />
                <Text style={styles.onlineTitle}>
                  {isOnline ? "You're Online" : "You're Offline"}
                </Text>
              </View>
              <Text style={styles.onlineSub}>
                {isOnline
                  ? "Available for delivery requests in your area"
                  : "Go online to receive new delivery orders and start earning"}
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              disabled={toggling}
              trackColor={{ false: colors.neutral[300], true: colors.brand[500] }}
              thumbColor="#fff"
            />
          </View>
        </Card>
      </SlideUp>

      {/* ACTIVE DELIVERY IN PROGRESS (CRITICAL) */}
      {activeDelivery ? (
        <SlideUp delay={80}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/(partner)/active-delivery')}
          >
            <Card style={styles.activeDeliveryCard}>
              <View style={styles.activeDeliveryHeader}>
                <View style={styles.livePulseRow}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.activeDeliveryTitle}>ACTIVE DELIVERY IN PROGRESS</Text>
                </View>
                <StatusBadge status={activeDelivery.status} />
              </View>

              <Text style={styles.activeTrackingId}>#{activeDelivery.trackingId}</Text>

              <View style={styles.activeRouteBox}>
                <View style={styles.activeRouteLine}>
                  <View style={[styles.routeDot, { backgroundColor: colors.brand[600] }]} />
                  <Text style={styles.activeRouteText} numberOfLines={1}>
                    Pickup: {activeDelivery.pickup?.address}
                  </Text>
                </View>
                <View style={styles.activeRouteDivider} />
                <View style={styles.activeRouteLine}>
                  <View style={[styles.routeDot, { backgroundColor: '#dc2626' }]} />
                  <Text style={styles.activeRouteText} numberOfLines={1}>
                    Drop: {activeDelivery.drop?.address}
                  </Text>
                </View>
              </View>

              <View style={styles.activeFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Navigation size={16} color={colors.brand[700]} />
                  <Text style={styles.activeActionPrompt}>Tap to open active delivery workflow</Text>
                </View>
                <ArrowRight size={18} color={colors.brand[700]} />
              </View>
            </Card>
          </TouchableOpacity>
        </SlideUp>
      ) : null}

      {/* Available Requests Banner (When online and idle) */}
      {isOnline && !activeDelivery ? (
        <SlideUp delay={100}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/(partner)/requests')}
            style={styles.requestsBanner}
          >
            <View style={styles.requestsBannerLeft}>
              <View style={styles.packageIconWrap}>
                <Package size={22} color={colors.brand[600]} />
              </View>
              <View>
                <Text style={styles.requestsBannerTitle}>
                  {availableRequests?.length ? `${availableRequests.length} Delivery Requests Available` : 'Listening for Orders...'}
                </Text>
                <Text style={styles.requestsBannerSub}>
                  {availableRequests?.length ? 'Tap to review and accept nearby deliveries' : 'Keep the app open to receive alerts'}
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={colors.brand[600]} />
          </TouchableOpacity>
        </SlideUp>
      ) : null}

      {/* Stats Grid */}
      <SlideUp delay={140}>
        <View style={styles.statsGrid}>
          {isLoading
            ? [1, 2, 3, 4].map(i => <Skeleton key={i} height={84} borderRadius={14} style={{ width: '47%' }} />)
            : stats.map(s => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: s.bg }]}>
                <View style={styles.statHeader}>
                  {s.icon}
                  <Text style={styles.statValue}>{s.value}</Text>
                </View>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))
          }
        </View>
      </SlideUp>

      {/* Quick Nav Actions */}
      <SlideUp delay={170}>
        <View style={styles.quickNavRow}>
          <TouchableOpacity
            style={styles.quickNavCard}
            onPress={() => router.push('/(partner)/deliveries' as any)}
            activeOpacity={0.8}
          >
            <Bike size={20} color={colors.brand[600]} />
            <Text style={styles.quickNavTitle}>My Deliveries</Text>
            <Text style={styles.quickNavSub}>View history</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickNavCard}
            onPress={() => router.push('/(partner)/earnings')}
            activeOpacity={0.8}
          >
            <TrendingUp size={20} color="#16a34a" />
            <Text style={styles.quickNavTitle}>Earnings & Wallet</Text>
            <Text style={styles.quickNavSub}>₹{earnings?.walletBalance ?? 0} balance</Text>
          </TouchableOpacity>
        </View>
      </SlideUp>

      {/* Recent Completed Deliveries */}
      <SlideUp delay={200}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Deliveries</Text>
          <TouchableOpacity onPress={() => router.push('/(partner)/deliveries' as any)}>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        {recentLoading
          ? [1, 2].map(i => <Skeleton key={i} height={72} borderRadius={12} style={{ marginBottom: 10 }} />)
          : (recentData?.data || []).length === 0 ? (
            <Card style={styles.emptyRecentCard}>
              <Bike size={32} color={colors.neutral[300]} />
              <Text style={styles.emptyRecentTitle}>No completed deliveries yet</Text>
              <Text style={styles.emptyRecentSub}>Go online and accept orders to start your journey.</Text>
            </Card>
          ) : (
            (recentData?.data || []).map((d: Record<string, any>) => (
              <Card key={d._id as string} style={styles.deliveryRow}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.trackId}>#{d.trackingId as string}</Text>
                    <Text style={styles.dropAddr} numberOfLines={1}>{d.drop?.address}</Text>
                    <Text style={styles.timeText}>
                      {new Date(d.createdAt).toLocaleDateString()} • {d.category}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <StatusBadge status={d.status as string} />
                    <Text style={styles.fare}>+₹{d.fare?.total ?? 0}</Text>
                  </View>
                </View>
              </Card>
            ))
          )
        }
      </SlideUp>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: spacing.base, paddingTop: spacing['3xl'], paddingBottom: 60, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  partnerTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandTitle: { fontSize: 17, fontWeight: '800', color: colors.neutral[900], letterSpacing: -0.3 },
  partnerBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  partnerBadgeText: { fontSize: 9, fontWeight: '800', color: '#1d4ed8', letterSpacing: 0.5 },
  name: { fontSize: 13, fontWeight: '700', color: colors.neutral[600], marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.brand[100],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: { fontSize: 17, fontWeight: '700', color: colors.brand[700] },
  avatarStatusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },

  // Online Card
  onlineCard: { padding: 16, borderRadius: 18, borderWidth: 1.5 },
  onlineCardActive: { borderColor: colors.brand[200], backgroundColor: '#fff7ed' },
  onlineCardInactive: { borderColor: '#e2e8f0', backgroundColor: '#ffffff' },
  onlineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  onlineStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statusIndicator: { width: 10, height: 10, borderRadius: 5 },
  onlineTitle: { fontSize: 16, fontWeight: '800', color: colors.neutral[900] },
  onlineSub: { fontSize: 12, color: colors.neutral[500], lineHeight: 17 },

  // Active Delivery Card
  activeDeliveryCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
  },
  activeDeliveryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  livePulseRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
  activeDeliveryTitle: { fontSize: 11, fontWeight: '800', color: '#1d4ed8', letterSpacing: 0.8 },
  activeTrackingId: { fontSize: 12, fontFamily: 'monospace', fontWeight: '700', color: colors.neutral[600], marginBottom: 10 },
  activeRouteBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 10, marginBottom: 12 },
  activeRouteLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  activeRouteText: { fontSize: 12, fontWeight: '600', color: colors.neutral[800], flex: 1 },
  activeRouteDivider: { height: 12, width: 1, backgroundColor: '#cbd5e1', marginLeft: 3.5, marginVertical: 2 },
  activeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#dbeafe', paddingTop: 10 },
  activeActionPrompt: { fontSize: 13, fontWeight: '700', color: colors.brand[700] },

  // Requests Banner
  requestsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.brand[200],
    borderRadius: 16,
    padding: 14,
    shadowColor: colors.brand[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  requestsBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  packageIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' },
  requestsBannerTitle: { fontSize: 14, fontWeight: '700', color: colors.neutral[900] },
  requestsBannerSub: { fontSize: 12, color: colors.neutral[500], marginTop: 2 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', borderRadius: 16, padding: 14, gap: 8 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.neutral[900] },
  statLabel: { fontSize: 11, color: colors.neutral[500], fontWeight: '600' },

  // Quick Nav
  quickNavRow: { flexDirection: 'row', gap: 10 },
  quickNavCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  quickNavTitle: { fontSize: 13, fontWeight: '700', color: colors.neutral[900], marginTop: 4 },
  quickNavSub: { fontSize: 11, color: colors.neutral[500] },

  // Recent
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.neutral[900] },
  viewAll: { fontSize: 13, color: colors.brand[600], fontWeight: '700' },
  deliveryRow: { padding: 14, borderRadius: 14, marginBottom: 8 },
  trackId: { fontSize: 11, fontFamily: 'monospace', color: colors.neutral[400] },
  dropAddr: { fontSize: 13, fontWeight: '600', color: colors.neutral[800], marginTop: 2 },
  timeText: { fontSize: 11, color: colors.neutral[400], marginTop: 2 },
  fare: { fontSize: 14, fontWeight: '800', color: '#16a34a' },
  emptyRecentCard: { padding: 24, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyRecentTitle: { fontSize: 14, fontWeight: '700', color: colors.neutral[700] },
  emptyRecentSub: { fontSize: 12, color: colors.neutral[400], textAlign: 'center' },
});

