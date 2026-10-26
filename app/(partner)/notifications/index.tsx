import React, { useState } from 'react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Package,
  AlertCircle,
  TrendingUp,
  CheckCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { notificationService, AppNotification } from '../../../src/services/notification.service';
import { colors, spacing } from '../../../src/theme';
import { Card } from '../../../src/components/ui/Card';
import { SlideUp } from '../../../src/components/animations/SlideUp';
import { showToast } from '../../../src/utils/toast';

export default function PartnerNotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => notificationService.getNotifications({ filter }),
  });

  const notifications: AppNotification[] = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('success', 'All Read', 'All notifications marked as read.');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'DELIVERY_ASSIGNED':
      case 'ITEM_PICKED_UP':
      case 'DELIVERED':
        return <Package size={18} color={colors.brand[600]} />;
      case 'PAYMENT':
        return <TrendingUp size={18} color="#16a34a" />;
      default:
        return <Bell size={18} color={colors.neutral[600]} />;
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.neutral[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
          >
            <CheckCheck size={18} color={colors.brand[600]} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrap}>
        <TouchableOpacity
          style={[styles.tab, filter === 'all' && styles.tabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filter === 'unread' && styles.tabActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.tabText, filter === 'unread' && styles.tabTextActive]}>
            Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand[600]} />}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.brand[600]} />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Bell size={44} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySub}>
              {filter === 'unread'
                ? 'You have caught up with all updates.'
                : 'Delivery alerts and updates will appear here.'}
            </Text>
          </View>
        ) : (
          notifications.map((item, index) => (
            <SlideUp key={item._id} delay={index * 25}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  if (!item.isRead) {
                    markReadMutation.mutate(item._id);
                  }
                  if (item.deliveryId) {
                    router.push('/(partner)/active-delivery');
                  }
                }}
              >
                <Card style={[styles.notifCard, !item.isRead && styles.notifCardUnread]}>
                  <View style={styles.notifRow}>
                    <View style={styles.iconWrap}>{getIcon(item.type)}</View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifTitle}>{item.title}</Text>
                      <Text style={styles.notifDesc}>{item.description}</Text>
                      <Text style={styles.notifTime}>
                        {new Date(item.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    {!item.isRead && <View style={styles.unreadDot} />}
                  </View>
                </Card>
              </TouchableOpacity>
            </SlideUp>
          ))
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
  markAllBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
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
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  tabActive: { backgroundColor: colors.brand[600] },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.neutral[600] },
  tabTextActive: { color: '#ffffff', fontWeight: '700' },

  listContent: { padding: 16, paddingBottom: 60, gap: 10 },
  loadingWrap: { padding: 32, alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 13, color: colors.neutral[500] },
  emptyWrap: { padding: 48, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.neutral[800] },
  emptySub: { fontSize: 13, color: colors.neutral[400], textAlign: 'center' },

  notifCard: { padding: 14, borderRadius: 16 },
  notifCardUnread: { backgroundColor: '#f8fafc', borderColor: colors.brand[200], borderWidth: 1.5 },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: { fontSize: 14, fontWeight: '700', color: colors.neutral[900] },
  notifDesc: { fontSize: 12, color: colors.neutral[600], marginTop: 2, lineHeight: 17 },
  notifTime: { fontSize: 10, color: colors.neutral[400], marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand[600], marginTop: 4 },
});
