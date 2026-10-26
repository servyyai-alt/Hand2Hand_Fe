import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
  Dimensions,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Bike,
  Clock,
  CheckCircle2,
  Phone,
  ShieldCheck,
  Star,
  RefreshCw,
  Package,
  AlertCircle,
  Radio,
  ChevronRight,
  Camera,
  CheckCheck,
  AlertTriangle,
} from 'lucide-react-native';
import {
  deliveryService,
  TrackingData,
  DeliveryStatus,
  getDeliveryImageUrl,
} from '../../../src/services/delivery.service';
import { socketService } from '../../../src/services/socket.service';
import { useAppSelector } from '../../../src/hooks/useAppSelector';
import { colors } from '../../../src/theme';
import { showToast } from '../../../src/utils/toast';

let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    Polyline = Maps.Polyline;
  } catch {}
}

const { width: screenWidth } = Dimensions.get('window');

export default function LiveTrackingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const deliveryIdParam = params.id as string | undefined;

  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastPingTime, setLastPingTime] = useState<string>('Just now');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const token = useAppSelector(s => s.auth.accessToken);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number>(Date.now());
  const [secondsSinceLastUpdate, setSecondsSinceLastUpdate] = useState(0);

  const pollTimerRef = useRef<any>(null);

  const fetchTracking = useCallback(async (isPoll = false) => {
    if (!isPoll) setLoading(true);
    try {
      let targetId = deliveryIdParam;

      // If no ID passed in query params, find the first active delivery
      if (!targetId) {
        const myActive = await deliveryService.getMyDeliveries({ status: 'ACTIVE', limit: 1 });
        if (myActive.data && myActive.data.length > 0) {
          targetId = myActive.data[0]._id;
        }
      }

      if (!targetId) {
        setTracking(null);
        setLoading(false);
        return;
      }

      const data = await deliveryService.getDeliveryTracking(targetId);
      setTracking(data);
      setLastUpdateTimestamp(Date.now());
      setLastPingTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      if (!isPoll) {
        showToast('error', 'Tracking Error', err?.response?.data?.message || err.message);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [deliveryIdParam]);

  // Measure seconds elapsed since last GPS ping
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastUpdateTimestamp) / 1000);
      setSecondsSinceLastUpdate(elapsed);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdateTimestamp]);

  const isLiveGpsFresh = secondsSinceLastUpdate < 45 && Boolean(tracking?.partnerLocation);

  // Polling fallback
  useEffect(() => {
    fetchTracking();

    pollTimerRef.current = setInterval(() => {
      fetchTracking(true);
    }, 7000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchTracking]);

  // Live Socket connection and real-time room streaming
  useEffect(() => {
    const activeDeliveryId = tracking?._id || deliveryIdParam;
    if (!activeDeliveryId) return;

    socketService.connect();
    socketService.joinDeliveryRoom(activeDeliveryId);

    const onLocationUpdated = (payload: any) => {
      if (!payload) return;
      const coords = payload.coords || payload.location;
      if (!coords?.lat || !coords?.lng) return;

      setLastUpdateTimestamp(Date.now());
      setLastPingTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      setTracking((prev) => {
        if (!prev) return prev;
        const newDist = payload.distanceKm ?? prev.distanceKm;
        const newEta = payload.estimatedMinutes ?? prev.estimatedMinutes;
        return {
          ...prev,
          partnerLocation: {
            lat: coords.lat,
            lng: coords.lng,
            heading: coords.heading,
            speed: coords.speed,
            accuracy: coords.accuracy,
            updatedAt: coords.updatedAt || new Date().toISOString(),
          },
          distanceKm: newDist,
          estimatedMinutes: newEta,
          status: payload.status || prev.status,
        };
      });
    };

    const onItemVerified = () => {
      showToast('success', 'Item Verified', 'Delivery partner verified physical item match with booking photo.');
      fetchTracking(true);
    };

    const onItemMismatch = () => {
      showToast('error', 'Item Mismatch', 'Delivery partner reported physical item mismatch. Order placed on hold.');
      fetchTracking(true);
    };

    const onTrackingEnded = () => {
      showToast('success', 'Order Delivered', 'Package handover completed successfully.');
      fetchTracking(true);
    };

    socketService.on('partner:locationUpdated', onLocationUpdated);
    socketService.on('delivery:locationUpdated', onLocationUpdated);
    socketService.on('delivery:itemVerified', onItemVerified);
    socketService.on('delivery:itemMismatch', onItemMismatch);
    socketService.on('delivery:trackingEnded', onTrackingEnded);

    return () => {
      socketService.leaveDeliveryRoom(activeDeliveryId);
      socketService.off('partner:locationUpdated', onLocationUpdated);
      socketService.off('delivery:locationUpdated', onLocationUpdated);
      socketService.off('delivery:itemVerified', onItemVerified);
      socketService.off('delivery:itemMismatch', onItemMismatch);
      socketService.off('delivery:trackingEnded', onTrackingEnded);
    };
  }, [tracking?._id, deliveryIdParam, fetchTracking]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchTracking(false);
  };

  const openCall = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => showToast('info', 'Phone', phone));
  };

  const isTerminal = tracking?.status === 'DELIVERED' || tracking?.status === 'CANCELLED';

  const getStageIndex = (status?: DeliveryStatus) => {
    switch (status) {
      case 'CREATED':
        return 0;
      case 'PARTNER_ASSIGNED':
        return 1;
      case 'ARRIVED_AT_PICKUP':
      case 'ITEM_MISMATCH':
        return 2;
      case 'PICKED_UP':
        return 3;
      case 'IN_TRANSIT':
        return 4;
      case 'DELIVERED':
        return 5;
      default:
        return 0;
    }
  };

  const pickupCoords = tracking?.pickup?.coordinates;
  const dropCoords = tracking?.drop?.coordinates;
  const partnerCoords = tracking?.partnerLocation;

  const routeCoordinates = [
    partnerCoords ? { latitude: partnerCoords.lat, longitude: partnerCoords.lng } : null,
    pickupCoords ? { latitude: pickupCoords.lat, longitude: pickupCoords.lng } : null,
    dropCoords ? { latitude: dropCoords.lat, longitude: dropCoords.lng } : null,
  ].filter(Boolean) as Array<{ latitude: number; longitude: number }>;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/(customer)/deliveries')}
          activeOpacity={0.7}
          accessibilityLabel="Back to Deliveries"
        >
          <ArrowLeft size={18} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            Live Delivery Tracking
          </Text>
          {tracking ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {tracking.trackingId}
            </Text>
          ) : (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Real-time partner dispatch
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleManualRefresh}
          disabled={isRefreshing}
          activeOpacity={0.7}
          accessibilityLabel="Refresh Tracking Location"
        >
          <RefreshCw
            size={16}
            color={colors.primary}
            style={isRefreshing ? { transform: [{ rotate: '45deg' }] } : undefined}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Connecting to partner location stream...</Text>
        </View>
      ) : !tracking ? (
        <View style={styles.noActiveBox}>
          <Package size={52} color={colors.outline} />
          <Text style={styles.noActiveTitle}>No Active Delivery</Text>
          <Text style={styles.noActiveDesc}>
            You do not currently have an active delivery order to track in real-time.
          </Text>
          <TouchableOpacity
            style={styles.startDeliveryBtn}
            onPress={() => router.push('/(customer)/create-delivery')}
            activeOpacity={0.8}
          >
            <Text style={styles.startDeliveryBtnText}>Send a Package</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 140 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Interactive Live Map Section */}
          <View style={styles.mapContainer}>
            {MapView && Marker && Platform.OS !== 'web' ? (
              <MapView
                style={styles.nativeMap}
                initialRegion={{
                  latitude: partnerCoords?.lat ?? pickupCoords?.lat ?? 12.9716,
                  longitude: partnerCoords?.lng ?? pickupCoords?.lng ?? 79.1585,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
              >
                {pickupCoords ? (
                  <Marker
                    coordinate={{
                      latitude: pickupCoords.lat,
                      longitude: pickupCoords.lng,
                    }}
                    title="1. Recipient Collection"
                    description={tracking.pickup?.address}
                    pinColor="#10B981"
                  />
                ) : null}
                {dropCoords ? (
                  <Marker
                    coordinate={{
                      latitude: dropCoords.lat,
                      longitude: dropCoords.lng,
                    }}
                    title="2. Sender Delivery"
                    description={tracking.drop?.address}
                    pinColor="#2563EB"
                  />
                ) : null}
                {partnerCoords ? (
                  <Marker
                    coordinate={{
                      latitude: partnerCoords.lat,
                      longitude: partnerCoords.lng,
                    }}
                    title={tracking.partner?.name || 'Delivery Partner'}
                    description="Live Location"
                  >
                    <View style={styles.partnerMarkerCircle}>
                      <Bike size={16} color="#ffffff" />
                    </View>
                  </Marker>
                ) : null}
                {Polyline && routeCoordinates.length >= 2 ? (
                  <Polyline
                    coordinates={routeCoordinates}
                    strokeColor={colors.primary}
                    strokeWidth={4}
                  />
                ) : null}
              </MapView>
            ) : (
              /* High-Fidelity Interactive Coordinate Canvas (Web and Fallback) */
              <View style={styles.mapCanvas}>
                <View style={styles.mapGridLineH1} />
                <View style={styles.mapGridLineH2} />
                <View style={styles.mapGridLineV1} />
                <View style={styles.mapGridLineV2} />
                <View style={styles.mapRoutePath} />

                {/* Recipient Collection Marker */}
                <View style={styles.pickupMarkerWrap}>
                  <View style={styles.pickupMarkerDot}>
                    <MapPin size={12} color="#ffffff" />
                  </View>
                  <Text style={styles.markerLabel}>1. Recipient (Collect)</Text>
                </View>

                {/* Moving Partner Bike Marker */}
                {tracking.partnerLocation ? (
                  <View style={styles.partnerMarkerWrap}>
                    <View style={styles.partnerRadarWave} />
                    <View
                      style={[
                        styles.partnerMarkerCircle,
                        tracking.partnerLocation.heading
                          ? { transform: [{ rotate: `${tracking.partnerLocation.heading}deg` }] }
                          : undefined,
                      ]}
                    >
                      <Bike size={16} color="#ffffff" />
                    </View>
                    <View style={styles.partnerLiveBadge}>
                      <Radio size={9} color="#ffffff" />
                      <Text style={styles.partnerLiveBadgeText}>LIVE GPS</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.partnerMarkerWrap}>
                    <View style={[styles.partnerMarkerCircle, { backgroundColor: colors.secondaryContainer }]}>
                      <Bike size={16} color="#ffffff" />
                    </View>
                    <View style={[styles.partnerLiveBadge, { backgroundColor: colors.secondaryContainer }]}>
                      <Text style={styles.partnerLiveBadgeText}>EN ROUTE</Text>
                    </View>
                  </View>
                )}

                {/* Sender Destination Marker */}
                <View style={styles.dropMarkerWrap}>
                  <View style={styles.dropMarkerDot}>
                    <MapPin size={12} color="#ffffff" />
                  </View>
                  <Text style={styles.markerLabel}>2. You (Delivery)</Text>
                </View>
              </View>
            )}

            {/* Live GPS Telemetry Status Bar */}
            <View style={styles.mapTelemetryPill}>
              <View
                style={[
                  styles.statusLightDot,
                  { backgroundColor: isLiveGpsFresh ? '#16A34A' : '#D97706' },
                ]}
              />
              <Text style={styles.mapTelemetryText}>
                {isLiveGpsFresh
                  ? `Live GPS Connected • Updated ${secondsSinceLastUpdate}s ago`
                  : `Signal Delayed (${secondsSinceLastUpdate}s ago) • Last seen ${lastPingTime}`}
              </Text>
            </View>
          </View>

          {/* Real-Time ETA & Stage Banner */}
          <View style={styles.etaHeroCard}>
            <View style={styles.etaHeaderRow}>
              <View>
                <Text style={styles.etaLabel}>ESTIMATED ARRIVAL</Text>
                <Text style={styles.etaTime}>
                  {isTerminal ? 'Delivered' : `~${tracking.estimatedMinutes} mins`}
                </Text>
              </View>
              <View style={styles.distanceBadge}>
                <Navigation size={13} color={colors.primary} />
                <Text style={styles.distanceBadgeText}>{tracking.distanceKm || 3.2} km trip</Text>
              </View>
            </View>

            {/* Stage Message */}
            <View style={styles.stageMessageBox}>
              <Clock size={16} color={colors.primary} />
              <Text style={styles.stageMessageText}>{tracking.stageMessage}</Text>
            </View>

            {/* Multi-step progress line */}
            <View style={styles.stepProgressBar}>
              {[0, 1, 2, 3, 4, 5].map((stg) => {
                const isPassed = stg <= getStageIndex(tracking.status);
                const isCurr = stg === getStageIndex(tracking.status);
                return (
                  <View
                    key={stg}
                    style={[
                      styles.stepSegment,
                      isPassed && styles.stepSegmentPassed,
                      isCurr && styles.stepSegmentCurrent,
                    ]}
                  />
                );
              })}
            </View>
            <View style={styles.stepLabelsRow}>
              <Text style={styles.stepLabelSmall}>Placed</Text>
              <Text style={styles.stepLabelSmall}>To Recipient</Text>
              <Text style={styles.stepLabelSmall}>Collected</Text>
              <Text style={styles.stepLabelSmall}>To You</Text>
              <Text style={styles.stepLabelSmall}>Delivered</Text>
            </View>
          </View>

          {/* Item Verification Status Card */}
          {tracking.itemVerification ? (
            <View
              style={[
                styles.itemVerifCard,
                tracking.itemVerification.status === 'VERIFIED' && styles.itemVerifCardVerified,
                tracking.itemVerification.status === 'MISMATCH' && styles.itemVerifCardMismatch,
              ]}
            >
              <View style={styles.itemVerifHeaderRow}>
                {tracking.itemVerification.status === 'VERIFIED' ? (
                  <>
                    <CheckCheck size={18} color="#059669" />
                    <Text style={styles.itemVerifTitleVerified}>Physical Item Verified at Pickup</Text>
                  </>
                ) : tracking.itemVerification.status === 'MISMATCH' ? (
                  <>
                    <AlertTriangle size={18} color="#DC2626" />
                    <Text style={styles.itemVerifTitleMismatch}>Item Mismatch Reported — Order On Hold</Text>
                  </>
                ) : (
                  <>
                    <Camera size={18} color={colors.primary} />
                    <Text style={styles.itemVerifTitlePending}>Item Verification Pending Pickup</Text>
                  </>
                )}
              </View>

              <Text style={styles.itemVerifSub}>
                {tracking.itemVerification.status === 'VERIFIED'
                  ? 'Delivery partner photographed and confirmed the physical item matches your booking photograph.'
                  : tracking.itemVerification.status === 'MISMATCH'
                  ? `Discrepancy reported: ${tracking.itemVerification.mismatchReason || 'Item does not match reference photo'}. Admin review in progress.`
                  : 'Delivery partner will photograph the physical item upon reaching pickup and compare it with your uploaded photo.'}
              </Text>

              {/* Photos Comparison */}
              {(tracking.itemPhoto || tracking.itemVerification.originalImage || (tracking.itemVerification as any).originalImageUrl) ? (
                <View style={styles.verifPhotosRow}>
                  <View style={styles.verifPhotoCol}>
                    <Text style={styles.verifPhotoLabel}>Your Booking Photo</Text>
                    <Image
                      source={{
                        uri: getDeliveryImageUrl(
                          tracking.itemVerification.originalImage || (tracking.itemVerification as any).originalImageUrl || tracking.itemPhoto,
                          token
                        ),
                      }}
                      style={styles.verifThumb}
                    />
                  </View>
                  {(tracking.itemVerification.pickupImage || (tracking.itemVerification as any).pickupImageUrl) ? (
                    <View style={styles.verifPhotoCol}>
                      <Text style={styles.verifPhotoLabel}>Partner Pickup Photo</Text>
                      <Image
                        source={{
                          uri: getDeliveryImageUrl(
                            (tracking.itemVerification.pickupImage || (tracking.itemVerification as any).pickupImageUrl),
                            token
                          ),
                        }}
                        style={styles.verifThumb}
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Sender Delivery OTP Card — Shown to Customer for final handover */}
          {tracking.status !== 'DELIVERED' && tracking.status !== 'CANCELLED' && (
            <View style={styles.otpDisplayCard}>
              <View style={styles.otpDisplayHeader}>
                <ShieldCheck size={22} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.otpDisplayTitle}>Your Delivery Handover OTP</Text>
                  <Text style={styles.otpDisplaySubtitle}>
                    Share this 4-digit code with the Delivery Partner only when they arrive and hand over your product.
                  </Text>
                </View>
              </View>
              <View style={styles.otpCodeContainer}>
                {(tracking.senderOTP || tracking.deliveryOTP || '••••')
                  .split('')
                  .map((ch, idx) => (
                    <View key={idx} style={styles.otpCharBox}>
                      <Text style={styles.otpCharText}>{ch}</Text>
                    </View>
                  ))}
              </View>
            </View>
          )}

          {/* Delivery Hero Card */}
          {tracking.partner ? (
            <View style={styles.partnerCard}>
              <View style={styles.partnerCardHeader}>
                <View style={styles.partnerAvatarBig}>
                  <Bike size={24} color={colors.primary} />
                </View>
                <View style={styles.partnerDetailsWrap}>
                  <View style={styles.partnerNameRow}>
                    <Text style={styles.partnerName}>{tracking.partner.name}</Text>
                    <View style={styles.verifiedHeroBadge}>
                      <ShieldCheck size={11} color={colors.tertiaryContainer} />
                      <Text style={styles.verifiedHeroBadgeText}>Verified</Text>
                    </View>
                  </View>
                  <Text style={styles.partnerSub}>
                    {tracking.partner.vehicle?.make || 'Hero Vehicle'} • {tracking.partner.vehicle?.model || '2-Wheeler'}
                  </Text>
                  {tracking.partner.rating ? (
                    <View style={styles.partnerRatingRow}>
                      <Star size={13} color="#F59E0B" fill="#F59E0B" />
                      <Text style={styles.partnerRatingText}>
                        {tracking.partner.rating.toFixed(1)} rating
                      </Text>
                    </View>
                  ) : null}
                </View>

                {tracking.partner.phone ? (
                  <TouchableOpacity
                    style={styles.callHeroBtn}
                    onPress={() => openCall(tracking.partner!.phone)}
                    activeOpacity={0.8}
                  >
                    <Phone size={18} color="#ffffff" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.liveTelemetryBar}>
                <Radio size={12} color="#16A34A" />
                <Text style={styles.liveTelemetryText}>
                  Partner location streaming • Updated at {lastPingTime}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.searchingPartnerCard}>
              <ActivityIndicator size="small" color={colors.secondaryContainer} />
              <View style={{ flex: 1 }}>
                <Text style={styles.searchingPartnerTitle}>Assigning Delivery Partner</Text>
                <Text style={styles.searchingPartnerDesc}>
                  Connecting your order with a nearby verified partner to collect from Recipient.
                </Text>
              </View>
            </View>
          )}

          {/* Route Details: Recipient Collection & Sender Handover */}
          <View style={styles.routeCard}>
            <Text style={styles.routeCardTitle}>ROUTE DETAILS</Text>

            <View style={styles.pointRow}>
              <View style={styles.pointDotGreen} />
              <View style={styles.pointInfo}>
                <Text style={styles.pointLabel}>1. PRODUCT COLLECTION (RECIPIENT)</Text>
                <Text style={styles.pointAddress}>{tracking.pickup.address}</Text>
                <Text style={styles.pointContact}>
                  From: {tracking.pickup.contactName} • {tracking.pickup.contactPhone}
                </Text>
              </View>
            </View>

            <View style={styles.routeDashedDivider} />

            <View style={styles.pointRow}>
              <View style={styles.pointDotOrange} />
              <View style={styles.pointInfo}>
                <Text style={styles.pointLabel}>2. FINAL DELIVERY DESTINATION (YOU / SENDER)</Text>
                <Text style={styles.pointAddress}>{tracking.drop.address}</Text>
                <Text style={styles.pointContact}>
                  To: {tracking.drop.contactName} • {tracking.drop.contactPhone}
                </Text>
              </View>
            </View>
          </View>

          {/* View Full Order Details Button */}
          <TouchableOpacity
            style={styles.viewFullOrderBtn}
            onPress={() =>
              router.push(`/(customer)/deliveries/${tracking.deliveryId}` as any)
            }
            activeOpacity={0.8}
          >
            <Text style={styles.viewFullOrderBtnText}>View Full Order Breakdown</Text>
            <ChevronRight size={16} color={colors.primary} />
          </TouchableOpacity>
        </ScrollView>
      )}
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
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitleWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    lineHeight: 20,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  loadingBox: {
    padding: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  noActiveBox: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  noActiveTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
  },
  noActiveDesc: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
  startDeliveryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  startDeliveryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    gap: 14,
  },
  mapCanvas: {
    height: 220,
    backgroundColor: '#E2E8F0',
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    ...Platform.select({
      web: { boxShadow: '0 6px 16px rgba(0,0,0,0.06)' } as any,
      default: { elevation: 3 },
    }),
  },
  mapGridLineH1: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  mapGridLineH2: {
    position: 'absolute',
    top: 150,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  mapGridLineV1: {
    position: 'absolute',
    left: 100,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  mapGridLineV2: {
    position: 'absolute',
    left: 230,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  mapRoutePath: {
    position: 'absolute',
    top: 55,
    left: 45,
    right: 45,
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
    opacity: 0.8,
  },
  pickupMarkerWrap: {
    position: 'absolute',
    top: 40,
    left: 30,
    alignItems: 'center',
  },
  pickupMarkerDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  markerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.onSurface,
    marginTop: 2,
  },
  partnerMarkerWrap: {
    position: 'absolute',
    top: 36,
    left: '46%',
    alignItems: 'center',
  },
  partnerRadarWave: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 65, 126, 0.2)',
    top: -4,
  },
  partnerMarkerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  partnerLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  partnerLiveBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
  },
  dropMarkerWrap: {
    position: 'absolute',
    top: 40,
    right: 30,
    alignItems: 'center',
  },
  dropMarkerDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  mapTelemetryPill: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  mapTelemetryText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurface,
    flex: 1,
  },
  etaHeroCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    gap: 12,
  },
  etaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  etaLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.outline,
    letterSpacing: 0.5,
  },
  etaTime: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  distanceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  stageMessageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
  },
  stageMessageText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
    lineHeight: 16,
  },
  stepProgressBar: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  stepSegment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceContainer,
  },
  stepSegmentPassed: {
    backgroundColor: colors.tertiaryContainer,
  },
  stepSegmentCurrent: {
    backgroundColor: colors.primary,
  },
  stepLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  stepLabelSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.outline,
  },
  otpDisplayCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#93c5fd',
    gap: 12,
  },
  otpDisplayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  otpDisplayTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e40af',
  },
  otpDisplaySubtitle: {
    fontSize: 12,
    color: '#3b82f6',
    lineHeight: 16,
    marginTop: 2,
  },
  otpCodeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  otpCharBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  otpCharText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e3a8a',
  },
  partnerCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    gap: 10,
  },
  partnerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  partnerAvatarBig: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerDetailsWrap: {
    flex: 1,
    gap: 2,
  },
  partnerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partnerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  verifiedHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  verifiedHeroBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.tertiaryContainer,
  },
  partnerSub: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  partnerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  partnerRatingText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurface,
  },
  callHeroBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveTelemetryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    padding: 8,
    borderRadius: 10,
  },
  liveTelemetryText: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  searchingPartnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF7ED',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  searchingPartnerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondaryContainer,
  },
  searchingPartnerDesc: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    lineHeight: 15,
  },
  routeCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    gap: 12,
  },
  routeCardTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.outline,
    letterSpacing: 0.5,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  pointDotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16A34A',
    marginTop: 4,
  },
  pointDotOrange: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.secondaryContainer,
    marginTop: 4,
  },
  pointInfo: {
    flex: 1,
  },
  pointLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.outline,
  },
  pointAddress: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
    marginTop: 2,
    lineHeight: 16,
  },
  pointContact: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  routeDashedDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainer,
  },
  viewFullOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLowest,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  viewFullOrderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  mapContainer: {
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  nativeMap: {
    width: '100%',
    height: 240,
  },
  statusLightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemVerifCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    gap: 8,
  },
  itemVerifCardVerified: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  itemVerifCardMismatch: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  itemVerifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemVerifTitleVerified: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  itemVerifTitleMismatch: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  itemVerifTitlePending: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  itemVerifSub: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
  verifPhotosRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  verifPhotoCol: {
    flex: 1,
    gap: 4,
  },
  verifPhotoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  verifThumb: {
    width: '100%',
    height: 110,
    borderRadius: 10,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
});
