import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Clock,
  Package,
  TrendingUp,
  X,
  Check,
  ArrowRight,
  RefreshCw,
  Eye,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { socketService } from '../../../src/services/socket.service';
import { apiClient } from '../../../src/services/api.service';
import { getDeliveryImageUrl } from '../../../src/services/delivery.service';
import { useAppSelector } from '../../../src/hooks/useAppSelector';
import { FadeIn } from '../../../src/components/animations/FadeIn';
import { SlideUp } from '../../../src/components/animations/SlideUp';
import { PressableScale } from '../../../src/components/animations/PressableScale';
import { EmptyState } from '../../../src/components/feedback/EmptyState';
import { Card } from '../../../src/components/ui/Card';
import { Skeleton } from '../../../src/components/feedback/Skeleton';
import { colors, spacing } from '../../../src/theme';
import { getApiError, showToast } from '../../../src/utils/toast';

interface DeliveryRequest {
  deliveryId: string;
  trackingId: string;
  pickup:     { address: string; contactName?: string };
  drop:       { address: string; contactName?: string };
  distance:   number;
  duration:   number;
  category:   string;
  description?: string;
  itemName?: string;
  itemPhoto?: string;
  handlingInstructions?: string;
  fare:       { total: number };
  pickupDistanceKm: number;
}

const REQUEST_TIMEOUT = 45;

export default function RequestsScreen() {
  const router = useRouter();
  const isOnline  = useAppSelector(s => s.partner.isOnline);
  const token = useAppSelector(s => s.auth.accessToken);
  const [incomingRequest, setIncomingRequest] = useState<DeliveryRequest | null>(null);
  const [timeLeft, setTimeLeft] = useState(REQUEST_TIMEOUT);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [inspectPhoto, setInspectPhoto] = useState<{ url: string; title: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Fetch available requests from REST
  const { data: availableRequests, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['partner', 'deliveries', 'available'],
    queryFn: () => apiClient.get('/partners/deliveries/available').then(r => r.data.data),
    enabled: isOnline,
    refetchInterval: 12000,
  });

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  };

  useEffect(() => {
    socketService.on('delivery:request-incoming', (data: unknown) => {
      const req = data as DeliveryRequest;
      setIncomingRequest(req);
      setTimeLeft(REQUEST_TIMEOUT);
      startPulse();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    });

    socketService.on('delivery:request-timeout', () => {
      setIncomingRequest(null);
      pulseAnim.stopAnimation();
    });

    return () => {
      socketService.off('delivery:request-incoming');
      socketService.off('delivery:request-timeout');
    };
  }, []);

  // Countdown timer for incoming request
  useEffect(() => {
    if (!incomingRequest) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setIncomingRequest(null);
          pulseAnim.stopAnimation();
          return REQUEST_TIMEOUT;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [incomingRequest]);

  const handleAccept = async (deliveryId: string) => {
    setAcceptingId(deliveryId);
    try {
      await apiClient.post(`/partners/deliveries/${deliveryId}/accept`);
      socketService.emit('partner:accept-request', { deliveryId });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIncomingRequest(null);
      showToast('success', 'Delivery Accepted!', 'Opening active delivery screen.');
      router.replace('/(partner)/active-delivery');
    } catch (err: unknown) {
      showToast('error', 'Could not accept order', getApiError(err));
      refetch();
    } finally {
      setAcceptingId(null);
    }
  };

  const handleReject = () => {
    if (!incomingRequest) return;
    socketService.emit('partner:reject-request', { deliveryId: incomingRequest.deliveryId });
    setIncomingRequest(null);
    pulseAnim.stopAnimation();
  };

  const renderPhotoInspectModal = () => (
    <Modal
      visible={Boolean(inspectPhoto)}
      animationType="fade"
      transparent
      onRequestClose={() => setInspectPhoto(null)}
    >
      <View style={styles.inspectModalOverlay}>
        <View style={styles.inspectModalCard}>
          <View style={styles.inspectModalHeader}>
            <Text style={styles.inspectModalTitle} numberOfLines={1}>
              {inspectPhoto?.title || 'Customer Product Photo'}
            </Text>
            <TouchableOpacity
              onPress={() => setInspectPhoto(null)}
              style={styles.inspectModalCloseBtn}
              activeOpacity={0.7}
            >
              <X size={18} color="#0f172a" />
            </TouchableOpacity>
          </View>
          {inspectPhoto?.url ? (
            <Image
              source={{ uri: inspectPhoto.url }}
              style={styles.inspectModalImage}
              resizeMode="contain"
            />
          ) : null}
          <Text style={styles.inspectModalNotice}>
            Inspect the item condition before accepting. You must verify physical match at pickup before OTP verification.
          </Text>
        </View>
      </View>
    </Modal>
  );

  if (!isOnline) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Delivery Requests</Text>
        </View>
        <EmptyState
          title="You're Offline"
          message="Switch your status to Online from the Dashboard to start receiving and accepting delivery requests."
        />
      </View>
    );
  }

  // Active incoming socket request popup
  if (incomingRequest) {
    const timerPct = (timeLeft / REQUEST_TIMEOUT) * 100;
    const timerColor = timeLeft > 20 ? colors.brand[600] : timeLeft > 10 ? '#d97706' : '#dc2626';

    return (
      <View style={styles.screen}>
        <FadeIn>
          <Text style={styles.screenTitle}>Incoming Request!</Text>

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Card style={styles.requestCard}>
              <View style={styles.timerBar}>
                <View style={[styles.timerFill, { width: `${timerPct}%`, backgroundColor: timerColor }]} />
              </View>
              <View style={styles.timerRow}>
                <Clock size={13} color={timerColor} />
                <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}s to accept</Text>
              </View>

              <Text style={styles.trackingId}>#{incomingRequest.trackingId}</Text>

              <View style={styles.routeContainer}>
                <View style={styles.routeRow}>
                  <View style={[styles.routeDot, { backgroundColor: colors.brand[600] }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routeLabel}>1. Collect from Recipient</Text>
                    <Text style={styles.routeAddr} numberOfLines={2}>{incomingRequest.pickup?.address}</Text>
                  </View>
                  <Text style={styles.distBadge}>{(incomingRequest.pickupDistanceKm || 1.2).toFixed(1)} km away</Text>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routeRow}>
                  <View style={[styles.routeDot, { backgroundColor: '#dc2626' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routeLabel}>2. Deliver to Sender</Text>
                    <Text style={styles.routeAddr} numberOfLines={2}>{incomingRequest.drop?.address}</Text>
                  </View>
                </View>
              </View>

              {/* Product preview and handling notice */}
              {(incomingRequest.itemPhoto || incomingRequest.itemName || incomingRequest.description) ? (
                <View style={styles.itemInspectionCard}>
                  {incomingRequest.itemPhoto ? (
                    <TouchableOpacity
                      onPress={() => setInspectPhoto({
                        url: getDeliveryImageUrl(incomingRequest.itemPhoto, token),
                        title: incomingRequest.itemName || 'Item Photograph',
                      })}
                      style={styles.thumbWrapper}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: getDeliveryImageUrl(incomingRequest.itemPhoto, token) }}
                        style={styles.itemThumb}
                      />
                      <View style={styles.thumbInspectBadge}>
                        <Eye size={10} color="#ffffff" />
                        <Text style={styles.thumbInspectText}>Inspect</Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.itemCardTitle} numberOfLines={1}>
                      {incomingRequest.itemName || incomingRequest.description || 'Package Handover'}
                    </Text>
                    {incomingRequest.description && incomingRequest.itemName ? (
                      <Text style={styles.itemCardSub} numberOfLines={2}>
                        {incomingRequest.description}
                      </Text>
                    ) : null}
                    {incomingRequest.handlingInstructions ? (
                      <View style={styles.instructionsBadge}>
                        <AlertCircle size={12} color="#D97706" />
                        <Text style={styles.instructionsText} numberOfLines={2}>
                          {incomingRequest.handlingInstructions}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : null}

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <MapPin size={14} color={colors.neutral[500]} />
                  <Text style={styles.statValue}>{(incomingRequest.distance || 3.5).toFixed(1)} km</Text>
                  <Text style={styles.statLabel}>Distance</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Clock size={14} color={colors.neutral[500]} />
                  <Text style={styles.statValue}>{incomingRequest.duration || 15} min</Text>
                  <Text style={styles.statLabel}>Est. time</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <TrendingUp size={14} color={colors.brand[600]} />
                  <Text style={[styles.statValue, { color: colors.brand[700] }]}>₹{incomingRequest.fare?.total}</Text>
                  <Text style={styles.statLabel}>Earnings</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <PressableScale onPress={handleReject} style={styles.rejectBtn}>
                  <X size={20} color="#dc2626" />
                  <Text style={styles.rejectLabel}>Decline</Text>
                </PressableScale>

                <PressableScale
                  onPress={() => handleAccept(incomingRequest.deliveryId)}
                  style={[styles.acceptBtn, acceptingId === incomingRequest.deliveryId && { opacity: 0.7 }]}
                >
                  <Check size={20} color="#fff" />
                  <Text style={styles.acceptLabel}>
                    {acceptingId === incomingRequest.deliveryId ? 'Accepting...' : 'Accept'}
                  </Text>
                </PressableScale>
              </View>
            </Card>
          </Animated.View>
        </FadeIn>
        {renderPhotoInspectModal()}
      </View>
    );
  }

  // Available requests list
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand[600]} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <Image
            source={require('../../../assets/images/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.screenTitle}>Available Deliveries</Text>
            <Text style={styles.screenSub}>Orders in your area ready for pickup</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => refetch()} activeOpacity={0.7}>
          <RefreshCw size={18} color={colors.brand[600]} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        [1, 2, 3].map(i => <Skeleton key={i} height={180} borderRadius={18} style={{ marginBottom: 14 }} />)
      ) : (availableRequests || []).length === 0 ? (
        <View style={styles.waitingContainer}>
          <EmptyState
            title="Searching for Nearby Orders"
            message="No orders available right now. Keep your app online; new delivery requests will appear here automatically."
          />
          <View style={styles.waitingDot}>
            <Animated.View style={[styles.dot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.waitingText}>Listening for incoming deliveries...</Text>
          </View>
        </View>
      ) : (
        (availableRequests || []).map((req: DeliveryRequest) => (
          <SlideUp key={req.deliveryId}>
            <Card style={styles.requestCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.categoryBadge}>
                  <Package size={13} color={colors.brand[700]} />
                  <Text style={styles.categoryBadgeText}>{req.category || 'PARCEL'}</Text>
                </View>
                <Text style={styles.fareHighlight}>₹{req.fare?.total ?? 60}</Text>
              </View>

              <Text style={styles.trackingId}>#{req.trackingId}</Text>

              {/* Route */}
              <View style={styles.routeContainer}>
                <View style={styles.routeRow}>
                  <View style={[styles.routeDot, { backgroundColor: colors.brand[600] }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routeLabel}>1. Collect from Recipient</Text>
                    <Text style={styles.routeAddr} numberOfLines={2}>{req.pickup?.address}</Text>
                  </View>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routeRow}>
                  <View style={[styles.routeDot, { backgroundColor: '#dc2626' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routeLabel}>2. Deliver to Sender</Text>
                    <Text style={styles.routeAddr} numberOfLines={2}>{req.drop?.address}</Text>
                  </View>
                </View>
              </View>

              {/* Product preview snippet */}
              {(req.itemPhoto || req.itemName || req.handlingInstructions) ? (
                <View style={styles.itemInspectionCard}>
                  {req.itemPhoto ? (
                    <TouchableOpacity
                      onPress={() => setInspectPhoto({
                        url: getDeliveryImageUrl(req.itemPhoto, token),
                        title: req.itemName || 'Item Photograph',
                      })}
                      style={styles.thumbWrapper}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: getDeliveryImageUrl(req.itemPhoto, token) }}
                        style={styles.itemThumb}
                      />
                      <View style={styles.thumbInspectBadge}>
                        <Eye size={10} color="#ffffff" />
                        <Text style={styles.thumbInspectText}>Inspect</Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.itemCardTitle} numberOfLines={1}>
                      {req.itemName || req.description || 'Package Handover'}
                    </Text>
                    {req.handlingInstructions ? (
                      <View style={styles.instructionsBadge}>
                        <AlertCircle size={12} color="#D97706" />
                        <Text style={styles.instructionsText} numberOfLines={2}>
                          {req.handlingInstructions}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {/* Quick metrics */}
              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <MapPin size={13} color={colors.neutral[500]} />
                  <Text style={styles.metricText}>{(req.distance || 3).toFixed(1)} km</Text>
                </View>
                <View style={styles.metricDot} />
                <View style={styles.metricItem}>
                  <Clock size={13} color={colors.neutral[500]} />
                  <Text style={styles.metricText}>{req.duration || 15} mins</Text>
                </View>
                {req.description ? (
                  <>
                    <View style={styles.metricDot} />
                    <Text style={styles.descSnippet} numberOfLines={1}>{req.description}</Text>
                  </>
                ) : null}
              </View>

              {/* Accept CTA Button */}
              <PressableScale
                onPress={() => handleAccept(req.deliveryId)}
                style={[styles.acceptCtaBtn, acceptingId === req.deliveryId && { opacity: 0.7 }]}
                disabled={Boolean(acceptingId)}
              >
                <Check size={18} color="#ffffff" strokeWidth={2.5} />
                <Text style={styles.acceptCtaText}>
                  {acceptingId === req.deliveryId ? 'Accepting Order...' : 'Accept Delivery'}
                </Text>
                <ArrowRight size={16} color="#ffffff" />
              </PressableScale>
            </Card>
          </SlideUp>
        ))
      )}
      {renderPhotoInspectModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc', padding: spacing.base, paddingTop: spacing['3xl'] },
  scrollContent: { paddingBottom: 60, gap: 14 },
  header: { marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLogo: { width: 38, height: 38, borderRadius: 10 },
  screenTitle: { fontSize: 18, fontWeight: '800', color: colors.neutral[900] },
  screenSub: { fontSize: 12, color: colors.neutral[500], marginTop: 2 },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  requestCard: { borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brand[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: { fontSize: 11, fontWeight: '700', color: colors.brand[700], letterSpacing: 0.5 },
  fareHighlight: { fontSize: 18, fontWeight: '800', color: '#16a34a' },
  trackingId: { fontSize: 11, fontFamily: 'monospace', color: colors.neutral[400], marginBottom: 12 },

  // Timer
  timerBar: { height: 4, backgroundColor: colors.neutral[100], borderRadius: 2, marginBottom: 8, overflow: 'hidden' },
  timerFill: { height: 4, borderRadius: 2 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  timerText: { fontSize: 12, fontWeight: '700' },

  // Route
  routeContainer: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, marginBottom: 12, gap: 4 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  routeDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  routeLine: { width: 1, height: 16, backgroundColor: colors.neutral[200], marginLeft: 4.5, marginVertical: 2 },
  routeLabel: { fontSize: 10, color: colors.neutral[400], fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  routeAddr: { fontSize: 13, color: colors.neutral[800], fontWeight: '600', marginTop: 2, lineHeight: 18 },
  distBadge: { fontSize: 10, color: colors.brand[600], fontWeight: '700', backgroundColor: colors.brand[50], paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },

  // Metrics
  metricsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  metricItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricText: { fontSize: 12, fontWeight: '600', color: colors.neutral[600] },
  metricDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.neutral[300] },
  descSnippet: { fontSize: 12, color: colors.neutral[500], flex: 1 },

  // Accept Button
  acceptCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand[600],
    borderRadius: 14,
    paddingVertical: 14,
  },
  acceptCtaText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },

  // Actions for incoming modal
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
  },
  rejectLabel: { fontSize: 14, fontWeight: '700', color: '#dc2626' },
  acceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.brand[600],
  },
  acceptLabel: { fontSize: 15, fontWeight: '700', color: '#ffffff' },

  // Stats row for incoming
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.neutral[100], paddingTop: 12, marginBottom: 14 },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 14, fontWeight: '700', color: colors.neutral[800] },
  statLabel: { fontSize: 10, color: colors.neutral[400], fontWeight: '500' },
  statDivider: { width: 1, backgroundColor: colors.neutral[100] },

  // Waiting
  waitingContainer: { marginTop: 20 },
  waitingDot: { alignItems: 'center', marginTop: 20, gap: 10 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.brand[500] },
  waitingText: { fontSize: 13, color: colors.neutral[400], fontWeight: '500' },

  // Product Inspection Card
  itemInspectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  thumbWrapper: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#cbd5e1',
  },
  itemThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbInspectBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  thumbInspectText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  itemCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  itemCardSub: {
    fontSize: 11,
    color: colors.neutral[500],
  },
  instructionsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginTop: 2,
  },
  instructionsText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#b45309',
    flex: 1,
  },

  // Inspect Modal
  inspectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inspectModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  inspectModalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inspectModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[900],
    flex: 1,
  },
  inspectModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectModalImage: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    backgroundColor: '#0f172a',
  },
  inspectModalNotice: {
    fontSize: 11,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 16,
  },
});

