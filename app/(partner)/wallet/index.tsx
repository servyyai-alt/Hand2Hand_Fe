import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  CreditCard,
  Building,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowUpRight,
} from 'lucide-react-native';
import { apiClient } from '../../../src/services/api.service';
import { colors, spacing } from '../../../src/theme';
import { Card } from '../../../src/components/ui/Card';
import { SlideUp } from '../../../src/components/animations/SlideUp';

export default function PartnerWalletScreen() {
  const router = useRouter();

  const {
    data: earnings,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['partner', 'earnings', 'wallet'],
    queryFn: () => apiClient.get('/partners/earnings').then(r => r.data.data),
  });

  const { data: recentDeliveries, isLoading: loadingRecent } = useQuery({
    queryKey: ['partner', 'deliveries', 'wallet-recent'],
    queryFn: () => apiClient.get('/partners/deliveries?status=COMPLETED&limit=10').then(r => r.data.data),
  });

  const walletBalance = earnings?.walletBalance ?? 0;
  const completedList: any[] = recentDeliveries?.data || [];

  return (
    <View style={styles.screen}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.neutral[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Partner Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand[600]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Wallet Balance Hero Card */}
        <SlideUp delay={50}>
          <Card style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <View style={styles.walletIconWrap}>
                <Wallet size={20} color="#ffffff" />
              </View>
              <Text style={styles.balanceLabel}>AVAILABLE WALLET BALANCE</Text>
            </View>

            {isLoading ? (
              <ActivityIndicator color="#ffffff" style={{ marginVertical: 12 }} />
            ) : (
              <Text style={styles.balanceAmount}>₹{walletBalance}</Text>
            )}

            <View style={styles.payoutNotice}>
              <Clock size={12} color="#bfdbfe" />
              <Text style={styles.payoutNoticeText}>
                Auto-transfers every Monday to your linked bank account
              </Text>
            </View>
          </Card>
        </SlideUp>

        {/* Quick Stats Grid */}
        <SlideUp delay={90}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Today's Earnings</Text>
              <Text style={styles.statVal}>₹{earnings?.todayEarnings ?? 0}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>This Week</Text>
              <Text style={styles.statVal}>₹{earnings?.weekEarnings ?? 0}</Text>
            </View>
          </View>
        </SlideUp>

        {/* Linked Bank Details Card */}
        <SlideUp delay={130}>
          <Card style={styles.bankCard}>
            <View style={styles.bankHeader}>
              <Building size={18} color={colors.neutral[700]} />
              <Text style={styles.bankTitle}>Linked Payout Account</Text>
            </View>
            <View style={styles.bankDetails}>
              <View>
                <Text style={styles.bankName}>HDFC Bank • Savings</Text>
                <Text style={styles.bankAcc}>A/C: •••••••• 4821</Text>
                <Text style={styles.bankIfsc}>IFSC: HDFC0001234</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <CheckCircle2 size={12} color="#15803d" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
          </Card>
        </SlideUp>

        {/* Recent Credits / Transactions */}
        <SlideUp delay={170}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Trip Credits</Text>
            <TouchableOpacity onPress={() => router.push('/(partner)/deliveries' as any)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {loadingRecent ? (
            <ActivityIndicator size="small" color={colors.brand[600]} style={{ marginTop: 16 }} />
          ) : completedList.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No completed trips yet.</Text>
            </Card>
          ) : (
            completedList.map(item => (
              <Card key={item._id} style={styles.txCard}>
                <View style={styles.txRow}>
                  <View style={styles.txIconWrap}>
                    <ArrowUpRight size={18} color="#16a34a" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txTitle}>Delivery Trip Earnings</Text>
                    <Text style={styles.txSub}>#{item.trackingId}</Text>
                    <Text style={styles.txDate}>
                      {new Date(item.updatedAt || item.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.txAmount}>+₹{item.fare?.total ?? 0}</Text>
                </View>
              </Card>
            ))
          )}
        </SlideUp>
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
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.neutral[900] },

  content: { padding: 16, paddingBottom: 60, gap: 14 },

  // Hero Card
  balanceCard: {
    backgroundColor: '#1e3a8a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 0,
    gap: 6,
  },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  walletIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: { fontSize: 11, fontWeight: '700', color: '#bfdbfe', letterSpacing: 0.6 },
  balanceAmount: { fontSize: 36, fontWeight: '800', color: '#ffffff' },
  payoutNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  payoutNoticeText: { fontSize: 11, color: '#bfdbfe' },

  // Stats Grid
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  statLabel: { fontSize: 11, color: colors.neutral[400], fontWeight: '600' },
  statVal: { fontSize: 18, fontWeight: '800', color: colors.neutral[900] },

  // Bank Card
  bankCard: { padding: 16, borderRadius: 18, gap: 10 },
  bankHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bankTitle: { fontSize: 14, fontWeight: '800', color: colors.neutral[900] },
  bankDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bankName: { fontSize: 14, fontWeight: '700', color: colors.neutral[800] },
  bankAcc: { fontSize: 12, color: colors.neutral[500], marginTop: 2, fontFamily: 'monospace' },
  bankIfsc: { fontSize: 11, color: colors.neutral[400], marginTop: 1 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedText: { fontSize: 11, fontWeight: '700', color: '#15803d' },

  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.neutral[900] },
  viewAllText: { fontSize: 12, fontWeight: '700', color: colors.brand[600] },

  emptyCard: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, color: colors.neutral[400] },

  txCard: { padding: 12, borderRadius: 14, marginBottom: 8 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTitle: { fontSize: 13, fontWeight: '700', color: colors.neutral[900] },
  txSub: { fontSize: 11, fontFamily: 'monospace', color: colors.neutral[400] },
  txDate: { fontSize: 10, color: colors.neutral[400], marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '800', color: '#16a34a' },
});
