import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Switch, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Star, CheckCircle, Bike, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../src/services/api.service';
import { socketService } from '../../src/services/socket.service';
import { useAppSelector, useAppDispatch } from '../../src/hooks/useAppSelector';
import { setOnlineStatus } from '../../src/store/slices/partnerSlice';
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

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['partner', 'dashboard'],
    queryFn: () => apiClient.get('/partners/earnings').then(r => r.data.data),
  });

  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['partner', 'deliveries', 'recent'],
    queryFn: () => apiClient.get('/partners/deliveries?page=1&limit=5').then(r => r.data.data),
  });

  useEffect(() => {
    socketService.connect();
    return () => {};
  }, []);

  const handleToggleOnline = async () => {
    setToggling(true);
    try {
      const next = !isOnline;
      await apiClient.post('/partners/availability', { isOnline: next });
      dispatch(setOnlineStatus(next));
      if (next) {
        socketService.emit('partner:go-online');
      } else {
        socketService.emit('partner:go-offline');
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      showToast('error', 'Update failed', 'Could not update availability. Try again.');
    } finally {
      setToggling(false);
    }
  };

  const stats = [
    { icon: <TrendingUp size={18} color={colors.brand[600]} />, label: "Today's earnings", value: `₹${data?.todayEarnings ?? 0}`, bg: colors.brand[50] },
    { icon: <CheckCircle size={18} color="#2563eb" />,          label: "Deliveries",       value: data?.todayDeliveries ?? 0,    bg: '#eff6ff' },
    { icon: <Star size={18} color="#d97706" />,                 label: "Rating",           value: (data?.rating ?? 0).toFixed(1),bg: '#fffbeb' },
    { icon: <Bike size={18} color="#7c3aed" />,                 label: "Completion",       value: `${data?.completionRate ?? 0}%`,bg: '#f5f3ff' },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand[600]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <FadeIn>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.name}>{user?.name?.split(' ')[0]} 👋</Text>
          </View>
          <View style={styles.avatarBox}>
            <Text style={{ fontSize:18 }}>{user?.name?.[0]?.toUpperCase()}</Text>
          </View>
        </View>
      </FadeIn>

      {/* Online Toggle */}
      <SlideUp delay={80}>
        <Card style={[styles.onlineCard, isOnline && styles.onlineCardActive]}>
          <View style={styles.onlineRow}>
            <View>
              <Text style={styles.onlineTitle}>{isOnline ? '🟢 You are Online' : '⚫ You are Offline'}</Text>
              <Text style={styles.onlineSub}>
                {isOnline ? 'You will receive delivery requests' : 'Toggle to start earning'}
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              disabled={toggling}
              trackColor={{ false: colors.neutral[200], true: colors.brand[500] }}
              thumbColor="#fff"
            />
          </View>
        </Card>
      </SlideUp>

      {/* Stats Grid */}
      <SlideUp delay={140}>
        <View style={styles.statsGrid}>
          {isLoading
            ? [1,2,3,4].map(i => <Skeleton key={i} height={80} borderRadius={12} />)
            : stats.map(s => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: s.bg }]}>
                {s.icon}
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))
          }
        </View>
      </SlideUp>

      {/* Recent Deliveries */}
      <SlideUp delay={200}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent deliveries</Text>
          <TouchableOpacity onPress={() => router.push('/(partner)/earnings')}>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        {recentLoading
          ? [1,2].map(i => <Skeleton key={i} height={72} borderRadius={12} style={{ marginBottom:10 }} />)
          : (recentData?.data || []).map((d: Record<string, unknown>) => (
            <Card key={d._id as string} style={styles.deliveryRow}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                <View style={{ flex:1 }}>
                  <Text style={styles.trackId}>{d.trackingId as string}</Text>
                  <Text style={styles.dropAddr} numberOfLines={1}>{(d.drop as { address: string })?.address}</Text>
                </View>
                <View style={{ alignItems:'flex-end', gap:4 }}>
                  <StatusBadge status={d.status as string} />
                  <Text style={styles.fare}>₹{(d.fare as { total: number })?.total}</Text>
                </View>
              </View>
            </Card>
          ))
        }
      </SlideUp>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:          { flex:1, backgroundColor:'#f9fafb' },
  content:         { padding:spacing.base, paddingTop:spacing['4xl'], paddingBottom:40, gap:4 },
  header:          { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 },
  greeting:        { fontSize:14, color:colors.neutral[500], fontWeight:'500' },
  name:            { fontSize:22, fontWeight:'700', color:colors.neutral[900], marginTop:2 },
  avatarBox:       { width:44, height:44, borderRadius:22, backgroundColor:colors.brand[100], alignItems:'center', justifyContent:'center' },
  onlineCard:      { marginBottom:16, borderWidth:1.5, borderColor:colors.neutral[100] },
  onlineCardActive:{ borderColor:colors.brand[200], backgroundColor:colors.brand[50] },
  onlineRow:       { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  onlineTitle:     { fontSize:16, fontWeight:'700', color:colors.neutral[900] },
  onlineSub:       { fontSize:12, color:colors.neutral[500], marginTop:3 },
  statsGrid:       { flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:20 },
  statCard:        { width:'47%', borderRadius:14, padding:14, gap:6 },
  statValue:       { fontSize:22, fontWeight:'700', color:colors.neutral[900] },
  statLabel:       { fontSize:11, color:colors.neutral[500], fontWeight:'500' },
  sectionHeader:   { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  sectionTitle:    { fontSize:16, fontWeight:'700', color:colors.neutral[900] },
  viewAll:         { fontSize:13, color:colors.brand[600], fontWeight:'600' },
  deliveryRow:     { marginBottom:10, padding:14 },
  trackId:         { fontSize:11, fontFamily:'monospace', color:colors.neutral[500] },
  dropAddr:        { fontSize:13, fontWeight:'500', color:colors.neutral[800], marginTop:2 },
  fare:            { fontSize:12, fontWeight:'600', color:colors.neutral[600] },
});
