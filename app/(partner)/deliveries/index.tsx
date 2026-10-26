import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Search,
  X,
  Bike,
  Package,
  Calendar,
  ChevronRight,
  TrendingUp,
} from 'lucide-react-native';
import { apiClient } from '../../../src/services/api.service';
import { colors, spacing } from '../../../src/theme';
import { Card } from '../../../src/components/ui/Card';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { SlideUp } from '../../../src/components/animations/SlideUp';

type DeliveryFilter = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export default function PartnerDeliveriesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<DeliveryFilter>('ALL');
  const [search, setSearch] = useState('');

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['partner', 'deliveries', filter],
    queryFn: () =>
      apiClient
        .get(`/partners/deliveries?status=${filter}&limit=50`)
        .then(r => r.data.data),
  });

  const deliveries: any[] = data?.data || [];

  const filteredDeliveries = deliveries.filter(d => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const tracking = (d.trackingId || '').toLowerCase();
    const pickup = (d.pickup?.address || '').toLowerCase();
    const drop = (d.drop?.address || '').toLowerCase();
    return tracking.includes(q) || pickup.includes(q) || drop.includes(q);
  });

  const filterTabs: { key: DeliveryFilter; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'ACTIVE', label: 'Active' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'CANCELLED', label: 'Cancelled' },
  ];

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
          <Text style={styles.headerTitle}>Delivery History</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsWrap}>
        {filterTabs.map(t => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setFilter(t.key)}
            style={[styles.tab, filter === t.key && styles.tabActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, filter === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <Search size={18} color={colors.neutral[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by ID or location..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={16} color={colors.neutral[400]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Deliveries List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand[600]} />}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.brand[600]} />
            <Text style={styles.loadingText}>Loading deliveries...</Text>
          </View>
        ) : filteredDeliveries.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Bike size={44} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No deliveries found</Text>
            <Text style={styles.emptySub}>
              {filter === 'ACTIVE'
                ? 'You have no active orders in progress.'
                : 'No delivery records matching the selected filter.'}
            </Text>
          </View>
        ) : (
          filteredDeliveries.map((item, index) => {
            const isActive = ['PARTNER_ASSIGNED', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT'].includes(item.status);
            return (
              <SlideUp key={item._id} delay={index * 30}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    if (isActive) {
                      router.push('/(partner)/active-delivery');
                    }
                  }}
                >
                  <Card style={[styles.card, isActive && styles.cardActive]}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.trackingId}>#{item.trackingId}</Text>
                        <View style={styles.dateRow}>
                          <Calendar size={12} color={colors.neutral[400]} />
                          <Text style={styles.dateText}>
                            {new Date(item.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Text>
                        </View>
                      </View>
                      <StatusBadge status={item.status} />
                    </View>

                    {/* Route Details */}
                    <View style={styles.routeContainer}>
                      <View style={styles.routeRow}>
                        <View style={[styles.dot, { backgroundColor: colors.brand[600] }]} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brand[700] }}>Collect (Recipient): </Text>
                        <Text style={styles.addrText} numberOfLines={1}>
                          {item.pickup?.address}
                        </Text>
                      </View>
                      <View style={styles.routeLine} />
                      <View style={styles.routeRow}>
                        <View style={[styles.dot, { backgroundColor: '#dc2626' }]} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#b91c1c' }}>Deliver (Sender): </Text>
                        <Text style={styles.addrText} numberOfLines={1}>
                          {item.drop?.address}
                        </Text>
                      </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.cardFooter}>
                      <View style={styles.categoryBadge}>
                        <Package size={12} color={colors.neutral[600]} />
                        <Text style={styles.categoryText}>{item.category || 'Package'}</Text>
                      </View>

                      <View style={styles.fareRow}>
                        <Text style={styles.fareLabel}>Earnings:</Text>
                        <Text style={styles.fareValue}>₹{item.fare?.total ?? 0}</Text>
                        {isActive && <ChevronRight size={16} color={colors.brand[600]} />}
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              </SlideUp>
            );
          })
        )}
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

  tabsWrap: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  tabActive: { backgroundColor: colors.brand[600] },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.neutral[600] },
  tabTextActive: { color: '#ffffff', fontWeight: '700' },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.neutral[900] },

  listContent: { padding: 16, paddingBottom: 60, gap: 12 },
  loadingWrap: { padding: 32, alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 13, color: colors.neutral[500] },
  emptyWrap: { padding: 48, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.neutral[800] },
  emptySub: { fontSize: 13, color: colors.neutral[400], textAlign: 'center' },

  card: { padding: 14, borderRadius: 16, gap: 10 },
  cardActive: { borderColor: colors.brand[200], backgroundColor: '#faf5ff' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  trackingId: { fontSize: 13, fontWeight: '700', fontFamily: 'monospace', color: colors.neutral[900] },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  dateText: { fontSize: 11, color: colors.neutral[400] },

  routeContainer: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, gap: 4 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  addrText: { fontSize: 12, fontWeight: '600', color: colors.neutral[700], flex: 1 },
  routeLine: { width: 1, height: 8, backgroundColor: '#cbd5e1', marginLeft: 3.5 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  categoryText: { fontSize: 11, fontWeight: '600', color: colors.neutral[600] },
  fareRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fareLabel: { fontSize: 12, color: colors.neutral[500] },
  fareValue: { fontSize: 15, fontWeight: '800', color: '#16a34a' },
});
