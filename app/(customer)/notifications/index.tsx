import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  Package,
  CheckCircle2,
  Clock,
  Settings,
  ArrowRight,
  ShieldAlert,
  CreditCard,
  Tag,
  ShieldCheck,
  CheckCheck,
  AlertCircle,
  Bike,
  Navigation,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService, AppNotification } from '../../../src/services/notification.service';
import { useAppSelector } from '../../../src/hooks/useAppSelector';
import { store } from '../../../src/store';
import { setUnreadCount } from '../../../src/store/slices/notificationSlice';
import { colors } from '../../../src/theme';
import { showToast } from '../../../src/utils/toast';
import { GuestAuthPrompt } from '../../../src/components/auth/GuestAuthPrompt';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const queryClient = useQueryClient();
  const { user, accessToken: token, isGuest } = useAppSelector((s) => s.auth);

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch real notifications from backend
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['customer', 'notifications', activeTab],
    queryFn: async () => {
      const res = await notificationService.getNotifications({
        filter: activeTab,
        page: 1,
        limit: 30,
      });
      store.dispatch(setUnreadCount(res.unreadCount || 0));
      return res;
    },
    enabled: Boolean(user && token),
    retry: 1,
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount ?? 0;

  // Mark all as read mutation
  const markAllMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'notifications'] });
      store.dispatch(setUnreadCount(0));
      showToast('success', 'Updated', 'All notifications marked as read');
    },
  });

  // Mark single as read mutation
  const markSingleMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'notifications'] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleNotificationPress = async (item: AppNotification) => {
    if (!item.isRead) {
      markSingleMutation.mutate(item._id);
    }

    if (item.deliveryId) {
      router.push({
        pathname: '/(customer)/deliveries/[id]',
        params: { id: item.deliveryId },
      });
    } else if (item.type === 'PAYMENT') {
      router.push('/(customer)/payments');
    } else if (item.actionUrl) {
      router.push(item.actionUrl as any);
    }
  };

  // Group notifications into "Today" and "Earlier"
  const { todayList, earlierList } = useMemo(() => {
    const today: AppNotification[] = [];
    const earlier: AppNotification[] = [];
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    notifications.forEach((item) => {
      const itemDate = new Date(item.createdAt);
      if (itemDate >= startOfToday) {
        today.push(item);
      } else {
        earlier.push(item);
      }
    });

    return { todayList: today, earlierList: earlier };
  }, [notifications]);

  const renderIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'DELIVERED':
        return (
          <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
            <CheckCircle2 size={18} color="#16A34A" />
          </View>
        );
      case 'DELIVERY_ASSIGNED':
        return (
          <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
            <Bike size={18} color="#00417E" />
          </View>
        );
      case 'PARTNER_ARRIVING':
        return (
          <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
            <Navigation size={18} color="#00417E" />
          </View>
        );
      case 'ITEM_PICKED_UP':
      case 'IN_PROGRESS':
        return (
          <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
            <Package size={18} color="#D97706" />
          </View>
        );
      case 'CANCELLED':
        return (
          <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
            <AlertCircle size={18} color="#DC2626" />
          </View>
        );
      case 'PAYMENT':
        return (
          <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
            <CreditCard size={18} color="#7C3AED" />
          </View>
        );
      case 'SECURITY':
        return (
          <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
            <ShieldCheck size={18} color="#00417E" />
          </View>
        );
      case 'PROMOTION':
        return (
          <View style={[styles.iconBox, { backgroundColor: '#FFF7ED' }]}>
            <Tag size={18} color="#FF6A1A" />
          </View>
        );
      default:
        return (
          <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
            <Bell size={18} color="#00417E" />
          </View>
        );
    }
  };

  const formatTimestamp = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isSameDay = d.toDateString() === now.toDateString();

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isSameDay) {
      return timeStr;
    }
    const monthDay = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${monthDay}, ${timeStr}`;
  };

  const renderCard = (item: AppNotification) => (
    <TouchableOpacity
      key={item._id}
      style={[styles.card, !item.isRead && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
      accessibilityLabel={`Notification: ${item.title}`}
    >
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardLead}>
          {renderIcon(item.type)}
          <View style={styles.cardTitleCol}>
            <View style={styles.titleWithBadge}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {!item.isRead && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.cardTime}>{formatTimestamp(item.createdAt)}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.cardDesc} numberOfLines={3}>
        {item.description}
      </Text>

      <View style={styles.cardFooter}>
        {item.orderRef ? (
          <View style={styles.orderBadge}>
            <Package size={11} color="#00417E" />
            <Text style={styles.orderBadgeText}>{item.orderRef}</Text>
          </View>
        ) : (
          <View />
        )}

        {item.deliveryId ? (
          <View style={styles.actionRow}>
            <Text style={styles.actionText}>View Order</Text>
            <ArrowRight size={13} color="#00417E" />
          </View>
        ) : item.type === 'PAYMENT' ? (
          <View style={styles.actionRow}>
            <Text style={styles.actionText}>View Receipt</Text>
            <ArrowRight size={13} color="#00417E" />
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  if (isGuest || !user) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>Stay updated on your deliveries</Text>
          </View>
        </View>
        <GuestAuthPrompt
          title="Sign in to continue"
          description="Sign in or create an account to receive real-time delivery alerts, status updates, and promotions."
          icon={<Bell size={28} color="#00417E" />}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>Stay updated on your deliveries</Text>
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 ? (
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              activeOpacity={0.7}
              accessibilityLabel="Mark all as read"
            >
              <CheckCheck size={16} color="#00417E" />
              {windowWidth >= 360 && <Text style={styles.markAllText}>Mark read</Text>}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
          onPress={() => setActiveTab('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'unread' && styles.tabBtnActive]}
          onPress={() => setActiveTab('unread')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'unread' && styles.tabTextActive]}>
            Unread
          </Text>
          {unreadCount > 0 && (
            <View style={styles.unreadTabBadge}>
              <Text style={styles.unreadTabBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 140 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#00417E']}
          />
        }
      >
        {isLoading && !refreshing ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color="#00417E" />
            <Text style={styles.stateText}>Loading notifications...</Text>
          </View>
        ) : isError ? (
          <View style={styles.stateContainer}>
            <ShieldAlert size={32} color="#DC2626" />
            <Text style={styles.stateTitle}>Unable to load notifications</Text>
            <Text style={styles.stateText}>Please check your connection and try again.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()} activeOpacity={0.8}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : notifications.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Bell size={28} color="#00417E" />
            </View>
            <Text style={styles.emptyTitle}>You're all caught up!</Text>
            <Text style={styles.emptyDesc}>
              Updates about your deliveries, payments, and account activity will appear here.
            </Text>
          </View>
        ) : (
          /* Grouped Notification Cards */
          <View style={styles.listContainer}>
            {todayList.length > 0 && (
              <View style={styles.groupSection}>
                <Text style={styles.groupHeader}>TODAY</Text>
                {todayList.map(renderCard)}
              </View>
            )}

            {earlierList.length > 0 && (
              <View style={styles.groupSection}>
                <Text style={styles.groupHeader}>EARLIER</Text>
                {earlierList.map(renderCard)}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    gap: 12,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
  },
  markAllText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00417E',
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#00417E',
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  unreadTabBadge: {
    backgroundColor: '#FF6A1A',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  unreadTabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  stateContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  stateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  stateText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#00417E',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
  },
  listContainer: {
    gap: 18,
  },
  groupSection: {
    gap: 10,
  },
  groupHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00417E',
    letterSpacing: 0.8,
    paddingHorizontal: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  unreadCard: {
    borderColor: '#BFDBFE',
    backgroundColor: '#FBFDFF',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardLead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitleCol: {
    flex: 1,
    gap: 2,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
    flex: 1,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF6A1A',
    flexShrink: 0,
  },
  cardTime: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 15,
  },
  cardDesc: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 17,
    marginLeft: 46,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginLeft: 46,
    marginTop: 2,
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  orderBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#00417E',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00417E',
  },
});
