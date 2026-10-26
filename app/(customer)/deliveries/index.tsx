import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  Search,
  X,
  Plus,
  Navigation,
  Star,
  FileText,
  AlertCircle,
  Phone,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Bike,
} from 'lucide-react-native';
import {
  deliveryService,
  Delivery,
  DeliveryStatus,
  DeliverySummary,
} from '../../../src/services/delivery.service';
import { profileService } from '../../../src/services/profile.service';
import { colors } from '../../../src/theme';
import { showToast } from '../../../src/utils/toast';
import { useAppSelector } from '../../../src/hooks/useAppSelector';
import { GuestAuthPrompt } from '../../../src/components/auth/GuestAuthPrompt';

type FilterType = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export default function DeliveriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;
  const isGuest = useAppSelector((s) => s.auth.isGuest);
  const authUser = useAppSelector((s) => s.auth.user);

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [summary, setSummary] = useState<DeliverySummary>({
    activeCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Modals state
  const [cancelModalDelivery, setCancelModalDelivery] = useState<Delivery | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const [rateModalDelivery, setRateModalDelivery] = useState<Delivery | null>(null);
  const [selectedRating, setSelectedRating] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const [receiptDelivery, setReceiptDelivery] = useState<Delivery | null>(null);

  const [ticketModalDelivery, setTicketModalDelivery] = useState<Delivery | null>(null);
  const [ticketCategory, setTicketCategory] = useState('DELIVERY_DELAY');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [isRaisingTicket, setIsRaisingTicket] = useState(false);

  const fetchDeliveries = useCallback(async (isRefresh = false) => {
    if (isGuest || !authUser) {
      setLoading(false);
      return;
    }
    if (!isRefresh) setLoading(true);
    try {
      const res = await deliveryService.getMyDeliveries({
        status: activeFilter !== 'ALL' ? activeFilter : undefined,
        search: searchQuery.trim() || undefined,
        limit: 50,
      });
      setDeliveries(res.data || []);
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to load deliveries';
      showToast('error', 'Deliveries Error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeliveries(true);
  };

  const handleCancelDelivery = async () => {
    if (!cancelModalDelivery) return;
    setIsCancelling(true);
    try {
      await deliveryService.cancelDelivery(cancelModalDelivery._id, cancelReason.trim() || 'Cancelled by user');
      showToast('success', 'Order Cancelled', 'Your delivery booking has been cancelled.');
      setCancelModalDelivery(null);
      setCancelReason('');
      fetchDeliveries(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to cancel delivery.';
      showToast('error', 'Cancellation Failed', msg);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!rateModalDelivery) return;
    setIsSubmittingRating(true);
    try {
      await deliveryService.submitRating(rateModalDelivery._id, selectedRating, ratingFeedback);
      showToast('success', 'Rating Submitted', 'Thank you for rating your delivery hero!');
      // Update local state immediately
      setDeliveries((prev) =>
        prev.map((d) =>
          d._id === rateModalDelivery._id
            ? { ...d, rating: { rating: selectedRating, feedback: ratingFeedback, createdAt: new Date().toISOString() } }
            : d
        )
      );
      setRateModalDelivery(null);
      setRatingFeedback('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to submit rating.';
      showToast('error', 'Rating Error', msg);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleRaiseTicket = async () => {
    if (!ticketModalDelivery) return;
    if (!ticketSubject.trim() || !ticketDescription.trim()) {
      showToast('error', 'Incomplete Form', 'Please provide a subject and issue description.');
      return;
    }
    setIsRaisingTicket(true);
    try {
      await profileService.createTicket({
        category: ticketCategory,
        subject: `[Order ${ticketModalDelivery.trackingId}] ${ticketSubject.trim()}`,
        description: ticketDescription.trim(),
        priority: 'HIGH',
        relatedDeliveryId: ticketModalDelivery._id,
      });
      showToast('success', 'Ticket Raised', 'Support ticket created. Our team will contact you.');
      setTicketModalDelivery(null);
      setTicketSubject('');
      setTicketDescription('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to raise ticket.';
      showToast('error', 'Ticket Error', msg);
    } finally {
      setIsRaisingTicket(false);
    }
  };

  const openCall = (phoneNumber: string) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      showToast('info', 'Phone Number', phoneNumber);
    });
  };

  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'CREATED':
        return { label: 'Awaiting Partner', bg: '#FFF7ED', color: '#EA580C', icon: Clock };
      case 'PARTNER_ASSIGNED':
        return { label: 'Partner Assigned', bg: '#EFF6FF', color: '#2563EB', icon: Bike };
      case 'ARRIVED_AT_PICKUP':
        return { label: 'Partner Arriving at Pickup', bg: '#F5F3FF', color: '#7C3AED', icon: MapPin };
      case 'PICKED_UP':
        return { label: 'Item Collected', bg: '#ECFDF5', color: '#059669', icon: Package };
      case 'IN_TRANSIT':
        return { label: 'In Transit', bg: '#E0F2FE', color: '#0284C7', icon: Navigation };
      case 'DELIVERED':
        return { label: 'Delivered', bg: '#DCFCE7', color: '#16A34A', icon: CheckCircle2 };
      case 'CANCELLED':
        return { label: 'Cancelled', bg: '#FEE2E2', color: '#DC2626', icon: XCircle };
      default:
        return { label: status, bg: colors.surfaceContainer, color: colors.onSurfaceVariant, icon: Package };
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  if (isGuest || !authUser) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
        <View style={[styles.headerNarrowTopRow, { paddingHorizontal: 16, marginBottom: 12 }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace('/(customer)')}
            activeOpacity={0.7}
            accessibilityLabel="Back to Home"
          >
            <ArrowLeft size={18} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.onSurface }}>
            My Orders
          </Text>
          <View style={{ width: 36 }} />
        </View>
        <GuestAuthPrompt
          title="Sign in to continue"
          description="Sign in or create an account to view your active deliveries, order history, and live tracking."
          icon={<Package size={28} color="#00417E" />}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Responsive Header */}
      {isNarrow ? (
        /* Mobile Narrow Screens (< 380px, e.g. 320px) */
        <View style={[styles.headerNarrow, { paddingTop: insets.top + 8 }]}>
          {/* Row 1: Back Navigation + Action Buttons */}
          <View style={styles.headerNarrowTopRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.replace('/(customer)/profile')}
              activeOpacity={0.7}
              accessibilityLabel="Back to Profile"
            >
              <ArrowLeft size={18} color={colors.onSurface} />
            </TouchableOpacity>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.headerActionBtn, showSearchBar && styles.headerActionBtnActive]}
                onPress={() => setShowSearchBar((prev) => !prev)}
                activeOpacity={0.7}
                accessibilityLabel="Search Deliveries"
              >
                <Search size={16} color={showSearchBar ? colors.primary : colors.onSurface} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerSendBtn}
                onPress={() => router.push('/(customer)/create-delivery')}
                activeOpacity={0.8}
                accessibilityLabel="Book a Delivery"
              >
                <Plus size={14} color="#ffffff" strokeWidth={2.5} />
                <Text style={styles.headerSendBtnText}>Book Delivery</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Row 2: Complete Heading without truncation + Subtitle */}
          <View style={styles.headerNarrowTitleBlock}>
            <Text style={styles.headerNarrowTitle}>
              My Deliveries & Orders
            </Text>
            <Text style={styles.headerSubtitle}>
              Track your deliveries and view your order history.
            </Text>
          </View>
        </View>
      ) : (
        /* Standard / Wide Screens (>= 380px, tablets, desktop) */
        <View style={[styles.headerWide, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerWideTopRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.replace('/(customer)/profile')}
              activeOpacity={0.7}
              accessibilityLabel="Back to Profile"
            >
              <ArrowLeft size={18} color={colors.onSurface} />
            </TouchableOpacity>

            <View style={styles.headerWideTitleWrap}>
              <Text style={styles.headerWideTitle}>
                My Deliveries & Orders
              </Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.headerActionBtn, showSearchBar && styles.headerActionBtnActive]}
                onPress={() => setShowSearchBar((prev) => !prev)}
                activeOpacity={0.7}
                accessibilityLabel="Search Deliveries"
              >
                <Search size={16} color={showSearchBar ? colors.primary : colors.onSurface} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerSendBtn}
                onPress={() => router.push('/(customer)/create-delivery')}
                activeOpacity={0.8}
                accessibilityLabel="Book a Delivery"
              >
                <Plus size={14} color="#ffffff" strokeWidth={2.5} />
                <Text style={styles.headerSendBtnText}>Book Delivery</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.headerSubBarWide}>
            <Text style={styles.headerSubtitle}>
              Track your deliveries and view your order history.
            </Text>
          </View>
        </View>
      )}

      {/* Optional Search Bar */}
      {showSearchBar ? (
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <Search size={16} color={colors.outline} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tracking ID, item, or address..."
              placeholderTextColor={colors.outline}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              clearButtonMode="while-editing"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={10}>
                <X size={16} color={colors.outline} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 140 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* 3 Summary Cards */}
        <View style={styles.summaryRow}>
          {/* Active Deliveries */}
          <TouchableOpacity
            style={[
              styles.summaryCard,
              styles.summaryCardActive,
              activeFilter === 'ACTIVE' && styles.summaryCardSelected,
            ]}
            onPress={() => setActiveFilter(activeFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
            activeOpacity={0.8}
          >
            <View style={styles.summaryIconWrapActive}>
              <Clock size={15} color={colors.primary} />
            </View>
            <Text style={styles.summaryCountActive}>{summary.activeCount}</Text>
            <Text style={styles.summaryLabelActive}>Active</Text>
          </TouchableOpacity>

          {/* Completed Deliveries */}
          <TouchableOpacity
            style={[
              styles.summaryCard,
              styles.summaryCardCompleted,
              activeFilter === 'COMPLETED' && styles.summaryCardSelected,
            ]}
            onPress={() => setActiveFilter(activeFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
            activeOpacity={0.8}
          >
            <View style={styles.summaryIconWrapCompleted}>
              <CheckCircle2 size={15} color={colors.tertiaryContainer} />
            </View>
            <Text style={styles.summaryCountCompleted}>{summary.completedCount}</Text>
            <Text style={styles.summaryLabelCompleted}>Completed</Text>
          </TouchableOpacity>

          {/* Cancelled Deliveries */}
          <TouchableOpacity
            style={[
              styles.summaryCard,
              styles.summaryCardCancelled,
              activeFilter === 'CANCELLED' && styles.summaryCardSelected,
            ]}
            onPress={() => setActiveFilter(activeFilter === 'CANCELLED' ? 'ALL' : 'CANCELLED')}
            activeOpacity={0.8}
          >
            <View style={styles.summaryIconWrapCancelled}>
              <XCircle size={15} color={colors.secondaryContainer} />
            </View>
            <Text style={styles.summaryCountCancelled}>{summary.cancelledCount}</Text>
            <Text style={styles.summaryLabelCancelled}>Cancelled</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Chips Bar (Horizontally scrollable for mobile viewports) */}
        <View style={styles.filterTabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTabsScroll}
          >
            {(['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as FilterType[]).map((tab) => {
              const isSel = activeFilter === tab;
              let count = summary.totalCount;
              if (tab === 'ACTIVE') count = summary.activeCount;
              if (tab === 'COMPLETED') count = summary.completedCount;
              if (tab === 'CANCELLED') count = summary.cancelledCount;

              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.filterChip, isSel && styles.filterChipSelected]}
                  onPress={() => setActiveFilter(tab)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, isSel && styles.filterChipTextSelected]}>
                    {tab === 'ALL' ? 'All Requests' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                  </Text>
                  <View style={[styles.filterCountBadge, isSel && styles.filterCountBadgeSelected]}>
                    <Text style={[styles.filterCountText, isSel && styles.filterCountTextSelected]}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Deliveries List */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Fetching deliveries & order history...</Text>
          </View>
        ) : deliveries.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Package size={30} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {activeFilter === 'ALL'
                ? 'No delivery requests yet'
                : `No ${activeFilter.toLowerCase()} deliveries`}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'ALL'
                ? 'Your delivery requests will appear here once you book a delivery.'
                : `You do not have any deliveries under the ${activeFilter.toLowerCase()} filter.`}
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => router.push('/(customer)/create-delivery')}
              activeOpacity={0.8}
            >
              <Plus size={15} color="#ffffff" strokeWidth={2.5} />
              <Text style={styles.emptyActionBtnText}>Book a Delivery</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Order Cards List */
          <View style={styles.deliveriesList}>
            {deliveries.map((delivery) => {
              const badge = getStatusBadge(delivery.status);
              const StatusIcon = badge.icon;
              const isActive = [
                'CREATED',
                'PARTNER_ASSIGNED',
                'ARRIVED_AT_PICKUP',
                'PICKED_UP',
                'IN_TRANSIT',
              ].includes(delivery.status);
              const isDelivered = delivery.status === 'DELIVERED';
              const isCancelled = delivery.status === 'CANCELLED';
              const isCancellable = ['CREATED', 'PARTNER_ASSIGNED', 'ARRIVED_AT_PICKUP'].includes(
                delivery.status
              );

              return (
                <View key={delivery._id} style={styles.deliveryCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardHeaderLeft}>
                      <Text style={styles.trackingIdText}>{delivery.trackingId}</Text>
                      <Text style={styles.bookingTimeText}>{formatDate(delivery.createdAt)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <StatusIcon size={12} color={badge.color} />
                      <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  {/* Item Description Snippet */}
                  <View style={styles.itemMetaRow}>
                    <View style={styles.categoryPill}>
                      <Package size={12} color={colors.primary} />
                      <Text style={styles.categoryPillText}>{delivery.category || 'Parcel'}</Text>
                    </View>
                    {delivery.weight ? (
                      <Text style={styles.weightText}>{delivery.weight} kg</Text>
                    ) : null}
                    <Text style={styles.itemDescText} numberOfLines={1}>
                      {delivery.description || 'Standard parcel handover'}
                    </Text>
                  </View>

                  {/* Awaiting Partner Banner for Created status */}
                  {delivery.status === 'CREATED' && !delivery.partner ? (
                    <View style={styles.awaitingPartnerCard}>
                      <Clock size={15} color="#D97706" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.awaitingPartnerTitle}>Request Submitted</Text>
                        <Text style={styles.awaitingPartnerDesc}>
                          Waiting for an eligible delivery partner to accept your request.
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Route Visualizer: Pickup ↓ Drop */}
                  <View style={styles.routeContainer}>
                    {/* Product Collection from Recipient */}
                    <View style={styles.routeStep}>
                      <View style={styles.pickupDot} />
                      <View style={styles.routeTextWrap}>
                        <Text style={styles.routeLabel}>1. PRODUCT COLLECTION (RECIPIENT)</Text>
                        <Text style={styles.routeAddress} numberOfLines={2}>
                          {delivery.pickup.address}
                        </Text>
                        <Text style={styles.routeContact}>
                          From: {delivery.pickup.contactName} • {delivery.pickup.contactPhone}
                        </Text>
                      </View>
                    </View>

                    {/* Visual Connector with Downward Arrow */}
                    <View style={styles.routeArrowRow}>
                      <View style={styles.routeDashedLine} />
                      <View style={styles.routeArrowBadge}>
                        <Text style={styles.routeArrowText}>↓</Text>
                      </View>
                      <View style={styles.routeDashedLine} />
                    </View>

                    {/* Final Delivery to Sender */}
                    <View style={styles.routeStep}>
                      <View style={styles.dropDot} />
                      <View style={styles.routeTextWrap}>
                        <Text style={styles.routeLabel}>2. FINAL DELIVERY DESTINATION (YOU / SENDER)</Text>
                        <Text style={styles.routeAddress} numberOfLines={2}>
                          {delivery.drop.address}
                        </Text>
                        <Text style={styles.routeContact}>
                          To: {delivery.drop.contactName} • {delivery.drop.contactPhone}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Assigned Partner Banner (Only when partner is assigned) */}
                  {delivery.partner ? (
                    <View style={styles.partnerBanner}>
                      <View style={styles.partnerAvatarCircle}>
                        <Bike size={16} color={colors.primary} />
                      </View>
                      <View style={styles.partnerInfoWrap}>
                        <View style={styles.partnerNameRow}>
                          <Text style={styles.partnerName}>{delivery.partner.name}</Text>
                          <View style={styles.verifiedPill}>
                            <ShieldCheck size={11} color={colors.tertiaryContainer} />
                            <Text style={styles.verifiedPillText}>Verified</Text>
                          </View>
                        </View>
                        <Text style={styles.partnerVehicleText}>
                          {delivery.partner.vehicle?.make || 'Delivery Partner'}
                          {delivery.partner.rating ? ` • ★ ${delivery.partner.rating.toFixed(1)}` : ''}
                        </Text>
                      </View>
                      {delivery.partner.phone ? (
                        <TouchableOpacity
                          style={styles.partnerCallBtn}
                          onPress={() => openCall(delivery.partner!.phone)}
                          activeOpacity={0.7}
                        >
                          <Phone size={15} color={colors.primary} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Cancellation & Refund Information (if cancelled) */}
                  {isCancelled ? (
                    <View style={styles.cancellationBanner}>
                      <AlertCircle size={16} color={colors.error} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.cancellationTitle}>
                          Cancelled on {formatDate(delivery.updatedAt)}
                        </Text>
                        {delivery.cancellationReason ? (
                          <Text style={styles.cancellationText}>
                            Reason: {delivery.cancellationReason}
                          </Text>
                        ) : null}
                        <Text style={styles.refundStatusText}>
                          {delivery.payment?.status === 'REFUNDED'
                            ? 'Refund Status: Refund completed to original payment method'
                            : delivery.payment?.status === 'PAID'
                            ? 'Refund Status: Refund initiated to original payment method (1–3 days)'
                            : 'Refund Status: No payment was charged'}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Rating display (if already rated) */}
                  {delivery.rating?.rating ? (
                    <View style={styles.ratedBanner}>
                      <View style={styles.ratedStarRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            color={star <= delivery.rating!.rating ? '#F59E0B' : '#E5E7EB'}
                            fill={star <= delivery.rating!.rating ? '#F59E0B' : 'none'}
                          />
                        ))}
                      </View>
                      <Text style={styles.ratedText}>
                        {delivery.rating.feedback ? `"${delivery.rating.feedback}"` : 'You rated this delivery'}
                      </Text>
                    </View>
                  ) : null}

                  {/* Fare & Payment Row */}
                  <View style={styles.fareRow}>
                    <View>
                      <Text style={styles.fareLabel}>Delivery Charge</Text>
                      <Text style={styles.fareAmount}>₹{delivery.fare?.total || 49}</Text>
                    </View>
                    <View style={styles.paymentBadge}>
                      <Text style={styles.paymentBadgeText}>
                        {delivery.payment?.status === 'REFUNDED'
                          ? 'REFUNDED'
                          : `${delivery.payment?.method || 'UPI'} • ${delivery.payment?.status || 'PAID'}`}
                      </Text>
                    </View>
                  </View>

                  {/* Context Sensitive Action Buttons */}
                  <View style={styles.cardActionsRow}>
                    {/* View Details Button (Always Available) */}
                    <TouchableOpacity
                      style={styles.detailsBtn}
                      onPress={() => router.push(`/(customer)/deliveries/${delivery._id}` as any)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.detailsBtnText}>View Details</Text>
                      <ChevronRight size={15} color={colors.onSurface} />
                    </TouchableOpacity>

                    {/* Active Deliveries Actions */}
                    {isActive ? (
                      <TouchableOpacity
                        style={styles.trackPrimaryBtn}
                        onPress={() => router.push(`/(customer)/tracking?id=${delivery._id}` as any)}
                        activeOpacity={0.8}
                      >
                        <Navigation size={14} color="#ffffff" />
                        <Text style={styles.trackPrimaryBtnText}>Track Live</Text>
                      </TouchableOpacity>
                    ) : null}

                    {/* Cancel request button for created/assigned */}
                    {isActive && isCancellable ? (
                      <TouchableOpacity
                        style={styles.cancelActionBtn}
                        onPress={() => setCancelModalDelivery(delivery)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cancelActionBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    ) : null}

                    {/* Delivered Actions */}
                    {isDelivered ? (
                      <>
                        <TouchableOpacity
                          style={styles.receiptActionBtn}
                          onPress={() => setReceiptDelivery(delivery)}
                          activeOpacity={0.7}
                        >
                          <FileText size={14} color={colors.primary} />
                          <Text style={styles.receiptActionBtnText}>Receipt</Text>
                        </TouchableOpacity>

                        {!delivery.rating?.rating ? (
                          <TouchableOpacity
                            style={styles.rateActionBtn}
                            onPress={() => {
                              setSelectedRating(5);
                              setRatingFeedback('');
                              setRateModalDelivery(delivery);
                            }}
                            activeOpacity={0.8}
                          >
                            <Star size={13} color="#ffffff" fill="#ffffff" />
                            <Text style={styles.rateActionBtnText}>Rate Partner</Text>
                          </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                          style={styles.ticketActionBtn}
                          onPress={() => {
                            setTicketSubject('');
                            setTicketDescription('');
                            setTicketCategory('DELIVERY_DELAY');
                            setTicketModalDelivery(delivery);
                          }}
                          activeOpacity={0.7}
                        >
                          <HelpCircle size={14} color={colors.onSurfaceVariant} />
                        </TouchableOpacity>
                      </>
                    ) : null}

                    {/* Cancelled Actions */}
                    {isCancelled ? (
                      <TouchableOpacity
                        style={styles.reorderBtn}
                        onPress={() => router.push('/(customer)/create-delivery')}
                        activeOpacity={0.8}
                      >
                        <RotateCcw size={14} color={colors.secondaryContainer} />
                        <Text style={styles.reorderBtnText}>Send Again</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* MODAL 1: Cancel Request Confirmation */}
      {cancelModalDelivery ? (
        <Modal
          visible={Boolean(cancelModalDelivery)}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!isCancelling) setCancelModalDelivery(null);
          }}
          aria-modal={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalAlertIcon}>
                <XCircle size={28} color={colors.error} />
              </View>
              <Text style={styles.modalTitle}>Cancel Delivery Request?</Text>
              <Text style={styles.modalSubtitle}>
                Are you sure you want to cancel order {cancelModalDelivery.trackingId}? If fare was paid, a refund will be initiated.
              </Text>

              <Text style={styles.inputLabel}>Reason for cancellation (optional)</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="e.g. Changed my mind, incorrect address, etc."
                placeholderTextColor={colors.outline}
                value={cancelReason}
                onChangeText={setCancelReason}
              />

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalSecondaryBtn}
                  onPress={() => setCancelModalDelivery(null)}
                  disabled={isCancelling}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalSecondaryBtnText}>Keep Order</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalDangerBtn, isCancelling && styles.btnDisabled]}
                  onPress={handleCancelDelivery}
                  disabled={isCancelling}
                  activeOpacity={0.8}
                >
                  {isCancelling ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalDangerBtnText}>Confirm Cancel</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* MODAL 2: Rate Delivery Partner */}
      {rateModalDelivery ? (
        <Modal
          visible={Boolean(rateModalDelivery)}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!isSubmittingRating) setRateModalDelivery(null);
          }}
          aria-modal={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalStarIcon}>
                <Star size={28} color="#F59E0B" fill="#F59E0B" />
              </View>
              <Text style={styles.modalTitle}>Rate Your Delivery Partner</Text>
              <Text style={styles.modalSubtitle}>
                How was the delivery service provided by{' '}
                <Text style={{ fontWeight: '700', color: colors.onSurface }}>
                  {rateModalDelivery.partner?.name || 'the delivery hero'}
                </Text>
                ?
              </Text>

              {/* 5 Star Selection */}
              <View style={styles.starSelectRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setSelectedRating(star)}
                    activeOpacity={0.7}
                    style={styles.starTouch}
                  >
                    <Star
                      size={34}
                      color={star <= selectedRating ? '#F59E0B' : '#D1D5DB'}
                      fill={star <= selectedRating ? '#F59E0B' : 'transparent'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.starRatingLabel}>
                {selectedRating === 5
                  ? 'Excellent service! ★★★★★'
                  : selectedRating === 4
                  ? 'Good delivery ★★★★☆'
                  : selectedRating === 3
                  ? 'Average ★★★☆☆'
                  : selectedRating === 2
                  ? 'Below expectations ★★☆☆☆'
                  : 'Poor experience ★☆☆☆☆'}
              </Text>

              <Text style={styles.inputLabel}>Written Feedback (optional)</Text>
              <TextInput
                style={[styles.modalTextInput, { height: 75, textAlignVertical: 'top' }]}
                placeholder="Share your experience (e.g. fast handover, friendly partner)..."
                placeholderTextColor={colors.outline}
                multiline
                value={ratingFeedback}
                onChangeText={setRatingFeedback}
              />

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalSecondaryBtn}
                  onPress={() => setRateModalDelivery(null)}
                  disabled={isSubmittingRating}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalPrimaryBtn, isSubmittingRating && styles.btnDisabled]}
                  onPress={handleSubmitRating}
                  disabled={isSubmittingRating}
                  activeOpacity={0.8}
                >
                  {isSubmittingRating ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalPrimaryBtnText}>Submit Rating</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* MODAL 3: Digital Delivery Receipt */}
      {receiptDelivery ? (
        <Modal
          visible={Boolean(receiptDelivery)}
          transparent
          animationType="fade"
          onRequestClose={() => setReceiptDelivery(null)}
          aria-modal={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.receiptCard}>
              <View style={styles.receiptHeader}>
                <View>
                  <Text style={styles.receiptBrand}>H2H Delivery Receipt</Text>
                  <Text style={styles.receiptOrderNo}>ID: {receiptDelivery.trackingId}</Text>
                </View>
                <TouchableOpacity onPress={() => setReceiptDelivery(null)} hitSlop={10}>
                  <X size={20} color={colors.onSurface} />
                </TouchableOpacity>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Booking Date</Text>
                <Text style={styles.receiptRowVal}>{formatDate(receiptDelivery.createdAt)}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Package Category</Text>
                <Text style={styles.receiptRowVal}>{receiptDelivery.category || 'Parcel'}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Distance Covered</Text>
                <Text style={styles.receiptRowVal}>{receiptDelivery.distance || 3.2} km</Text>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Base Delivery Fare</Text>
                <Text style={styles.receiptRowVal}>₹{receiptDelivery.fare?.base || 40}</Text>
              </View>
              {receiptDelivery.fare?.perKm ? (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptRowLabel}>Distance Charge</Text>
                  <Text style={styles.receiptRowVal}>₹{receiptDelivery.fare.perKm}</Text>
                </View>
              ) : null}
              {receiptDelivery.fare?.weightCharge ? (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptRowLabel}>Weight Surcharge</Text>
                  <Text style={styles.receiptRowVal}>₹{receiptDelivery.fare.weightCharge}</Text>
                </View>
              ) : null}

              <View style={styles.receiptTotalRow}>
                <Text style={styles.receiptTotalLabel}>Total Amount Paid</Text>
                <Text style={styles.receiptTotalVal}>₹{receiptDelivery.fare?.total || 49}</Text>
              </View>

              <View style={styles.receiptPaymentBox}>
                <CheckCircle2 size={16} color={colors.tertiaryContainer} />
                <Text style={styles.receiptPaymentText}>
                  Paid via {receiptDelivery.payment?.method || 'UPI'} • Txn ID:{' '}
                  {receiptDelivery.payment?.transactionId || 'TXN-H2H-SUCCESS'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.receiptCloseBtn}
                onPress={() => setReceiptDelivery(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.receiptCloseBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* MODAL 4: Raise Support Ticket for Order */}
      {ticketModalDelivery ? (
        <Modal
          visible={Boolean(ticketModalDelivery)}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!isRaisingTicket) setTicketModalDelivery(null);
          }}
          aria-modal={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.ticketHeaderRow}>
                <View>
                  <Text style={styles.modalTitle}>Raise Support Ticket</Text>
                  <Text style={styles.modalSubtitle}>Order: {ticketModalDelivery.trackingId}</Text>
                </View>
                <TouchableOpacity onPress={() => setTicketModalDelivery(null)} hitSlop={10}>
                  <X size={20} color={colors.onSurface} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Issue Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catChipsRow}>
                {[
                  { code: 'DELIVERY_DELAY', label: 'Delivery Delayed' },
                  { code: 'DAMAGED_PACKAGE', label: 'Item Damaged' },
                  { code: 'DRIVER_BEHAVIOR', label: 'Partner Issue' },
                  { code: 'WRONG_LOCATION', label: 'Address Issue' },
                  { code: 'BILLING', label: 'Payment / Fare' },
                  { code: 'OTHER', label: 'Other Issue' },
                ].map((c) => (
                  <TouchableOpacity
                    key={c.code}
                    style={[styles.catChip, ticketCategory === c.code && styles.catChipSelected]}
                    onPress={() => setTicketCategory(c.code)}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        ticketCategory === c.code && styles.catChipTextSelected,
                      ]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Brief Subject</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="e.g. Package arrived with slight delay"
                placeholderTextColor={colors.outline}
                value={ticketSubject}
                onChangeText={setTicketSubject}
              />

              <Text style={styles.inputLabel}>Detailed Description</Text>
              <TextInput
                style={[styles.modalTextInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Describe your issue so our customer support can resolve it immediately..."
                placeholderTextColor={colors.outline}
                multiline
                value={ticketDescription}
                onChangeText={setTicketDescription}
              />

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalSecondaryBtn}
                  onPress={() => setTicketModalDelivery(null)}
                  disabled={isRaisingTicket}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalPrimaryBtn, isRaisingTicket && styles.btnDisabled]}
                  onPress={handleRaiseTicket}
                  disabled={isRaisingTicket}
                  activeOpacity={0.8}
                >
                  {isRaisingTicket ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalPrimaryBtnText}>Submit Ticket</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  headerNarrow: {
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
  },
  headerNarrowTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerNarrowTitleBlock: {
    gap: 2,
  },
  headerNarrowTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  headerWide: {
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 4,
  },
  headerWideTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerWideTitleWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  headerWideTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  headerSubBarWide: {
    paddingTop: 2,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionBtnActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  headerSendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(251, 120, 0, 0.28)' } as any,
      default: { elevation: 2 },
    }),
  },
  headerSendBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBarContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.onSurface,
    padding: 0,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.04)' } as any,
      default: { elevation: 2 },
    }),
  },
  summaryCardSelected: {
    borderColor: colors.primary,
    transform: [{ scale: 1.02 }],
  },
  summaryCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: 'rgba(0, 65, 126, 0.1)',
  },
  summaryIconWrapActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryCountActive: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.2,
  },
  summaryLabelActive: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  summaryCardCompleted: {
    backgroundColor: '#F0FDF4',
    borderColor: 'rgba(22, 163, 74, 0.1)',
  },
  summaryIconWrapCompleted: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryCountCompleted: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.tertiaryContainer,
    letterSpacing: -0.2,
  },
  summaryLabelCompleted: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.tertiaryContainer,
    marginTop: 2,
  },
  summaryCardCancelled: {
    backgroundColor: '#FFF7ED',
    borderColor: 'rgba(251, 120, 0, 0.1)',
  },
  summaryIconWrapCancelled: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryCountCancelled: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.secondaryContainer,
    letterSpacing: -0.2,
  },
  summaryLabelCancelled: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryContainer,
    marginTop: 2,
  },
  filterTabsWrapper: {
    marginHorizontal: -12,
  },
  filterTabsScroll: {
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.03)' } as any,
      default: { elevation: 1 },
    }),
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  filterChipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  filterCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainerLow,
  },
  filterCountBadgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  filterCountTextSelected: {
    color: '#ffffff',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  emptyCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    marginTop: 4,
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.03)' } as any,
      default: { elevation: 2 },
    }),
  },
  emptyIconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.onSurface,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 18,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    minHeight: 44,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(0, 65, 126, 0.25)' } as any,
      default: { elevation: 3 },
    }),
  },
  emptyActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  deliveriesList: {
    gap: 12,
  },
  deliveryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    gap: 10,
    ...Platform.select({
      web: { boxShadow: '0 3px 10px rgba(0,0,0,0.03)' } as any,
      default: { elevation: 2 },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  cardHeaderLeft: {
    flex: 1,
    gap: 2,
  },
  trackingIdText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.onSurface,
    letterSpacing: 0.3,
  },
  bookingTimeText: {
    fontSize: 10,
    color: colors.outline,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  weightText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  itemDescText: {
    flex: 1,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  routeContainer: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  routeStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    marginTop: 3,
  },
  dropDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondaryContainer,
    marginTop: 3,
  },
  routeLine: {
    width: 2,
    height: 10,
    backgroundColor: colors.outlineVariant,
    marginLeft: 3,
  },
  routeTextWrap: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  routeAddress: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
    lineHeight: 16,
  },
  routeContact: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  partnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  partnerAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerInfoWrap: {
    flex: 1,
  },
  partnerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partnerName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  verifiedPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.tertiaryContainer,
  },
  partnerVehicleText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  partnerCallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  awaitingPartnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  awaitingPartnerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  awaitingPartnerDesc: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 1,
  },
  routeArrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
    marginVertical: 2,
  },
  routeDashedLine: {
    width: 2,
    height: 10,
    backgroundColor: colors.outlineVariant,
  },
  routeArrowBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeArrowText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    lineHeight: 13,
  },
  cancellationBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  cancellationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
  },
  cancellationText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  refundStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
    marginTop: 2,
  },
  ratedBanner: {
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 4,
  },
  ratedStarRow: {
    flexDirection: 'row',
    gap: 3,
  },
  ratedText: {
    fontSize: 11,
    color: '#92400E',
    fontStyle: 'italic',
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerLow,
  },
  fareLabel: {
    fontSize: 11,
    color: colors.outline,
    fontWeight: '600',
  },
  fareAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.onSurface,
  },
  paymentBadge: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  detailsBtn: {
    flex: 1,
    minWidth: 95,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainerLow,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
  },
  trackPrimaryBtn: {
    flex: 1.2,
    minWidth: 95,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  trackPrimaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  cancelActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.error,
  },
  cancelActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.error,
  },
  receiptActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  receiptActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  rateActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
  },
  rateActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  ticketActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  reorderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryContainer,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 22,
    gap: 12,
    ...Platform.select({
      web: { boxShadow: '0 20px 40px rgba(0,0,0,0.25)' } as any,
      default: { elevation: 10 },
    }),
  },
  modalAlertIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 4,
  },
  modalStarIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.onSurface,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 4,
  },
  modalTextInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalSecondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  modalSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  modalPrimaryBtn: {
    flex: 1.2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  modalPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalDangerBtn: {
    flex: 1.2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
  },
  modalDangerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  starSelectRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  starTouch: {
    padding: 4,
  },
  starRatingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
    textAlign: 'center',
    marginBottom: 6,
  },
  receiptCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 22,
    gap: 10,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  receiptBrand: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
  },
  receiptOrderNo: {
    fontSize: 11,
    color: colors.outline,
    marginTop: 2,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainer,
    marginVertical: 4,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptRowLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  receiptRowVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: colors.surfaceContainer,
  },
  receiptTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.onSurface,
  },
  receiptTotalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  receiptPaymentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  receiptPaymentText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
    flex: 1,
  },
  receiptCloseBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  receiptCloseBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  ticketHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  catChipsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  catChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  catChipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
