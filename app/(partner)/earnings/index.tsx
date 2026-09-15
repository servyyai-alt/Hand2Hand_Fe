import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../src/services/api.service';
import { SlideUp } from '../../../src/components/animations/SlideUp';
import { Card } from '../../../src/components/ui/Card';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { Skeleton } from '../../../src/components/feedback/Skeleton';
import { colors, spacing } from '../../../src/theme';

type Period = 'today' | 'week' | 'month';

export default function EarningsScreen() {
  const [period, setPeriod] = useState<Period>('today');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['partner', 'earnings', period],
    queryFn: () => apiClient.get(`/partners/earnings?period=${period}`).then(r => r.data.data),
  });

  const periods: { key: Period; label: string }[] = [
    { key:'today', label:'Today' },
    { key:'week',  label:'This week' },
    { key:'month', label:'This month' },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand[600]} />}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>Earnings</Text>

      {/* Period tabs */}
      <View style={styles.tabs}>
        {periods.map(p => (
          <TouchableOpacity
            key={p.key}
            onPress={() => setPeriod(p.key)}
            style={[styles.tab, period === p.key && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, period === p.key && styles.tabLabelActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary card */}
      <SlideUp>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total earned</Text>
          {isLoading
            ? <Skeleton height={44} width={160} borderRadius={8} />
            : <Text style={styles.summaryAmount}>₹{data?.totalEarnings ?? 0}</Text>
          }
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemValue}>{data?.totalDeliveries ?? 0}</Text>
              <Text style={styles.summaryItemLabel}>Deliveries</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemValue}>₹{data?.avgEarningsPerDelivery ?? 0}</Text>
              <Text style={styles.summaryItemLabel}>Avg per trip</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemValue}>{data?.totalDistance ?? 0} km</Text>
              <Text style={styles.summaryItemLabel}>Distance</Text>
            </View>
          </View>
        </Card>
      </SlideUp>

      {/* Delivery-wise breakdown */}
      <Text style={styles.sectionTitle}>Breakdown</Text>
      {isLoading
        ? [1,2,3,4,5].map(i => <Skeleton key={i} height={72} borderRadius={12} style={{ marginBottom:10 }} />)
        : (data?.deliveries || []).length === 0
          ? <Text style={styles.emptyText}>No deliveries in this period</Text>
          : (data?.deliveries || []).map((d: Record<string, unknown>, idx: number) => (
            <SlideUp key={d._id as string} delay={idx * 40}>
              <Card style={styles.deliveryCard}>
                <View style={styles.deliveryRow}>
                  <View style={{ flex:1 }}>
                    <Text style={styles.trackId}>{d.trackingId as string}</Text>
                    <Text style={styles.dropAddr} numberOfLines={1}>{(d.drop as { address: string })?.address}</Text>
                    <Text style={styles.date}>{new Date(d.createdAt as string).toLocaleDateString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</Text>
                  </View>
                  <View style={styles.earningCol}>
                    <Text style={styles.earningAmount}>+₹{(d.fare as { total: number })?.total}</Text>
                    <StatusBadge status={d.status as string} />
                  </View>
                </View>
              </Card>
            </SlideUp>
          ))
      }
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:        { flex:1, backgroundColor:'#f9fafb' },
  content:       { padding:spacing.base, paddingTop:spacing['4xl'], paddingBottom:40 },
  screenTitle:   { fontSize:20, fontWeight:'700', color:colors.neutral[900], marginBottom:16 },
  tabs:          { flexDirection:'row', backgroundColor:colors.neutral[100], borderRadius:12, padding:4, marginBottom:20 },
  tab:           { flex:1, paddingVertical:8, borderRadius:9, alignItems:'center' },
  tabActive:     { backgroundColor:'#fff', ...Platform.select({ web: { boxShadow:'0 1px 2px rgba(0,0,0,0.05)' }, default: { shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.05, shadowRadius:2, elevation:1 } }) },
  tabLabel:      { fontSize:13, fontWeight:'600', color:colors.neutral[500] },
  tabLabelActive:{ color:colors.neutral[900] },
  summaryCard:   { marginBottom:24, alignItems:'center', paddingVertical:24 },
  summaryLabel:  { fontSize:13, color:colors.neutral[500], fontWeight:'500', marginBottom:6 },
  summaryAmount: { fontSize:40, fontWeight:'800', color:colors.neutral[900], marginBottom:20 },
  summaryRow:    { flexDirection:'row', width:'100%', borderTopWidth:1, borderTopColor:colors.neutral[100], paddingTop:16 },
  summaryItem:   { flex:1, alignItems:'center', gap:4 },
  summaryItemValue:{ fontSize:16, fontWeight:'700', color:colors.neutral[900] },
  summaryItemLabel:{ fontSize:11, color:colors.neutral[400] },
  summaryDivider:{ width:1, backgroundColor:colors.neutral[100] },
  sectionTitle:  { fontSize:15, fontWeight:'700', color:colors.neutral[900], marginBottom:12 },
  emptyText:     { textAlign:'center', color:colors.neutral[400], fontSize:14, marginTop:32 },
  deliveryCard:  { marginBottom:10, padding:14 },
  deliveryRow:   { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' },
  trackId:       { fontSize:11, fontFamily:'monospace', color:colors.neutral[400] },
  dropAddr:      { fontSize:13, fontWeight:'600', color:colors.neutral[800], marginVertical:2 },
  date:          { fontSize:11, color:colors.neutral[400] },
  earningCol:    { alignItems:'flex-end', gap:6 },
  earningAmount: { fontSize:16, fontWeight:'800', color:colors.brand[700] },
});
