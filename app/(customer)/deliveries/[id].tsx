import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  Navigation,
  Star,
  FileText,
  AlertCircle,
  Phone,
  HelpCircle,
  ShieldCheck,
  Bike,
  CreditCard,
  Check,
  ChevronRight,
  X,
  Share2,
  Camera,
  CheckCheck,
  AlertTriangle,
  Eye,
} from 'lucide-react-native';
import {
  deliveryService,
  Delivery,
  DeliveryStatus,
  getDeliveryImageUrl,
} from '../../../src/services/delivery.service';
import { profileService } from '../../../src/services/profile.service';
import { useAppSelector } from '../../../src/hooks/useAppSelector';
import { colors } from '../../../src/theme';
import { showToast } from '../../../src/utils/toast';

const TIMELINE_STAGES: Array<{ status: DeliveryStatus; label: string; desc: string }> = [
  { status: 'CREATED', label: 'Request Placed', desc: 'Order submitted and waiting for an eligible delivery partner' },
  { status: 'PARTNER_ASSIGNED', label: 'Partner Assigned', desc: 'Partner matched and navigating to Recipient to collect product' },
  { status: 'ARRIVED_AT_PICKUP', label: 'Partner at Recipient', desc: 'Partner reached Recipient location for product collection' },
  { status: 'PICKED_UP', label: 'Product Collected', desc: 'Product collected from Recipient and Recipient OTP verified' },
  { status: 'IN_TRANSIT', label: 'In Transit', desc: 'Product is being transported to your delivery address' },
  { status: 'DELIVERED', label: 'Delivered', desc: 'Product delivered to you and verified with Sender handover OTP' },
];

export default function DeliveryDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const deliveryId = params.id as string;

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);

  // Rate Modal
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // Cancel Modal
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Ticket Modal
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [ticketCategory, setTicketCategory] = useState('DELIVERY_DELAY');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [raisingTicket, setRaisingTicket] = useState(false);

  // Receipt Modal
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);

  // Photo Inspection Modal
  const token = useAppSelector((state) => state.auth.accessToken);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title: string } | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!deliveryId) return;
    setLoading(true);
    try {
      const data = await deliveryService.getDeliveryById(deliveryId);
      setDelivery(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to load delivery details';
      showToast('error', 'Error', msg);
    } finally {
      setLoading(false);
    }
  }, [deliveryId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleCancel = async () => {
    if (!delivery) return;
    setCancelling(true);
    try {
      await deliveryService.cancelDelivery(delivery._id, cancelReason.trim() || 'Cancelled by user');
      showToast('success', 'Order Cancelled', 'Delivery has been cancelled.');
      setCancelModalVisible(false);
      fetchDetails();
    } catch (err: any) {
      showToast('error', 'Cancellation Failed', err?.response?.data?.message || err.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!delivery) return;
    setSubmittingRating(true);
    try {
      await deliveryService.submitRating(delivery._id, ratingScore, ratingFeedback);
      showToast('success', 'Rating Submitted', 'Thank you for rating your partner!');
      setDelivery((prev) =>
        prev
          ? {
              ...prev,
              rating: {
                rating: ratingScore,
                feedback: ratingFeedback,
                createdAt: new Date().toISOString(),
              },
            }
          : null
      );
      setRateModalVisible(false);
    } catch (err: any) {
      showToast('error', 'Rating Error', err?.response?.data?.message || err.message);
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleRaiseTicket = async () => {
    if (!delivery) return;
    if (!ticketSubject.trim() || !ticketDescription.trim()) {
      showToast('error', 'Incomplete Form', 'Please provide a subject and issue description.');
      return;
    }
    setRaisingTicket(true);
    try {
      await profileService.createTicket({
        category: ticketCategory,
        subject: `[Order ${delivery.trackingId}] ${ticketSubject.trim()}`,
        description: ticketDescription.trim(),
        priority: 'HIGH',
        relatedDeliveryId: delivery._id,
      });
      showToast('success', 'Ticket Raised', 'Support ticket submitted.');
      setTicketModalVisible(false);
    } catch (err: any) {
      showToast('error', 'Ticket Error', err?.response?.data?.message || err.message);
    } finally {
      setRaisingTicket(false);
    }
  };

  const openCall = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => showToast('info', 'Phone', phone));
  };

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const getStatusIndex = (current: DeliveryStatus) => {
    switch (current) {
      case 'CREATED':
        return 0;
      case 'PARTNER_ASSIGNED':
        return 1;
      case 'ARRIVED_AT_PICKUP':
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

  const partner = delivery?.partnerDetails || delivery?.partner;
  const isCancelled = delivery?.status === 'CANCELLED';
  const isDelivered = delivery?.status === 'DELIVERED';
  const isActive = [
    'CREATED',
    'PARTNER_ASSIGNED',
    'ARRIVED_AT_PICKUP',
    'PICKED_UP',
    'IN_TRANSIT',
  ].includes(delivery?.status || '');
  const isCancellable = ['CREATED', 'PARTNER_ASSIGNED', 'ARRIVED_AT_PICKUP'].includes(
    delivery?.status || ''
  );

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
            Delivery Request Details
          </Text>
          {delivery ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {delivery.trackingId}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.headerReceiptBtn}
          onPress={() => setReceiptModalVisible(true)}
          activeOpacity={0.7}
          disabled={!delivery}
          accessibilityLabel="View Invoice Receipt"
        >
          <FileText size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading delivery information...</Text>
        </View>
      ) : !delivery ? (
        <View style={styles.notFoundBox}>
          <Package size={48} color={colors.outline} />
          <Text style={styles.notFoundTitle}>Order Not Found</Text>
          <Text style={styles.notFoundDesc}>
            This delivery could not be found or you do not have permission to view it.
          </Text>
          <TouchableOpacity
            style={styles.backToOrdersBtn}
            onPress={() => router.replace('/(customer)/deliveries')}
          >
            <Text style={styles.backToOrdersBtnText}>Return to Orders</Text>
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
          {/* Status Hero Card */}
          <View
            style={[
              styles.statusHeroCard,
              isDelivered && styles.statusHeroCardDelivered,
              isCancelled && styles.statusHeroCardCancelled,
            ]}
          >
            <View style={styles.statusHeroTop}>
              <View>
                <Text style={styles.statusHeroLabel}>CURRENT STATUS</Text>
                <Text
                  style={[
                    styles.statusHeroTitle,
                    isDelivered && { color: colors.tertiaryContainer },
                    isCancelled && { color: colors.error },
                  ]}
                >
                  {delivery.status.replace(/_/g, ' ')}
                </Text>
              </View>
              {isActive ? (
                <TouchableOpacity
                  style={styles.liveTrackPill}
                  onPress={() => router.push(`/(customer)/tracking?id=${delivery._id}` as any)}
                  activeOpacity={0.8}
                >
                  <Navigation size={14} color="#ffffff" />
                  <Text style={styles.liveTrackPillText}>Live Tracking</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={styles.statusHeroDate}>Booked on {formatDate(delivery.createdAt)}</Text>
          </View>

          {/* SENDER DELIVERY HANDOVER OTP CARD */}
          {!isDelivered && !isCancelled && (delivery.senderOTP || delivery.deliveryOTP) ? (
            <View style={styles.senderOtpCard}>
              <View style={styles.senderOtpHeader}>
                <ShieldCheck size={22} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.senderOtpTitle}>Your Delivery Handover OTP</Text>
                  <Text style={styles.senderOtpSub}>
                    Share this 4-digit code with the Delivery Partner only when they arrive to handover your product.
                  </Text>
                </View>
              </View>
              <View style={styles.senderOtpRow}>
                {String(delivery.senderOTP || delivery.deliveryOTP)
                  .split('')
                  .map((digit, i) => (
                    <View key={i} style={styles.senderOtpBox}>
                      <Text style={styles.senderOtpText}>{digit}</Text>
                    </View>
                  ))}
              </View>
            </View>
          ) : null}

          {/* SECTION 2: Progress Timeline */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>DELIVERY PROGRESS TIMELINE</Text>

            {isCancelled ? (
              <View style={styles.cancelledTimelineBox}>
                <XCircle size={28} color={colors.error} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cancelledTimelineTitle}>Delivery Cancelled</Text>
                  <Text style={styles.cancelledTimelineReason}>
                    {delivery.cancellationReason || 'Order was cancelled before transit completion.'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.timelineList}>
                {TIMELINE_STAGES.map((stg, idx) => {
                  const currentIdx = getStatusIndex(delivery.status);
                  const isDone = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;
                  const isLast = idx === TIMELINE_STAGES.length - 1;

                  // Find timestamp from history if available
                  const historyMatch = delivery.statusHistory?.find(
                    (h) => h.status === stg.status
                  );

                  return (
                    <View key={stg.status} style={styles.timelineRow}>
                      <View style={styles.timelineLeftCol}>
                        <View
                          style={[
                            styles.timelineNode,
                            isDone && styles.timelineNodeDone,
                            isCurrent && styles.timelineNodeCurrent,
                          ]}
                        >
                          {isDone ? (
                            <Check size={11} color="#ffffff" strokeWidth={3} />
                          ) : (
                            <View style={styles.timelineNodePending} />
                          )}
                        </View>
                        {!isLast ? (
                          <View
                            style={[
                              styles.timelineConnector,
                              idx < currentIdx && styles.timelineConnectorDone,
                            ]}
                          />
                        ) : null}
                      </View>

                      <View style={styles.timelineContentCol}>
                        <View style={styles.timelineHeaderRow}>
                          <Text
                            style={[
                              styles.timelineStepTitle,
                              isDone && styles.timelineStepTitleDone,
                              isCurrent && styles.timelineStepTitleCurrent,
                            ]}
                          >
                            {stg.label}
                          </Text>
                          {historyMatch ? (
                            <Text style={styles.timelineTimeText}>
                              {new Date(historyMatch.timestamp).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={styles.timelineStepDesc}>{stg.desc}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* SECTION 1: Package & Item Information */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>ITEM & PACKAGE DETAILS</Text>

            {delivery.itemName ? (
              <View style={styles.itemNameRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemNameTitle}>{delivery.itemName}</Text>
                  <Text style={styles.itemCategorySubText}>{delivery.category || 'General Parcel'}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.packageDetailsGrid}>
              <View style={styles.detailBox}>
                <Text style={styles.detailBoxLabel}>Category</Text>
                <Text style={styles.detailBoxValue}>{delivery.category || 'Parcel'}</Text>
              </View>
              <View style={styles.detailBox}>
                <Text style={styles.detailBoxLabel}>Weight</Text>
                <Text style={styles.detailBoxValue}>{delivery.weight || 2} kg</Text>
              </View>
              <View style={styles.detailBox}>
                <Text style={styles.detailBoxLabel}>Est. Distance</Text>
                <Text style={styles.detailBoxValue}>{delivery.distance || 3.2} km</Text>
              </View>
              <View style={styles.detailBox}>
                <Text style={styles.detailBoxLabel}>Transit Time</Text>
                <Text style={styles.detailBoxValue}>~{delivery.duration || 15} mins</Text>
              </View>
            </View>

            <View style={styles.descriptionSection}>
              <Text style={styles.descSectionLabel}>Package Description / Note</Text>
              <Text style={styles.descSectionText}>
                {delivery.description || 'Personal items / standard parcel handover.'}
              </Text>
            </View>

            {delivery.handlingInstructions ? (
              <View style={styles.handlingBox}>
                <Text style={styles.handlingLabel}>Special Handling Instructions:</Text>
                <Text style={styles.handlingText}>{delivery.handlingInstructions}</Text>
              </View>
            ) : null}

            {/* Product Image Verification Display */}
            <View style={styles.verificationSection}>
              <View style={styles.verificationSectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={16} color={colors.primary} />
                  <Text style={styles.verificationSectionTitle}>Product Image Verification</Text>
                </View>
                {delivery.itemVerification?.status === 'VERIFIED' ? (
                  <View style={[styles.veriBadge, { backgroundColor: '#DCFCE7' }]}>
                    <CheckCheck size={12} color="#15803D" />
                    <Text style={[styles.veriBadgeText, { color: '#15803D' }]}>VERIFIED</Text>
                  </View>
                ) : delivery.itemVerification?.status === 'OVERRIDDEN' ? (
                  <View style={[styles.veriBadge, { backgroundColor: '#EFF6FF' }]}>
                    <ShieldCheck size={12} color="#1D4ED8" />
                    <Text style={[styles.veriBadgeText, { color: '#1D4ED8' }]}>ADMIN OVERRIDE</Text>
                  </View>
                ) : delivery.itemVerification?.status === 'MISMATCH' ? (
                  <View style={[styles.veriBadge, { backgroundColor: '#FEE2E2' }]}>
                    <AlertTriangle size={12} color="#B91C1C" />
                    <Text style={[styles.veriBadgeText, { color: '#B91C1C' }]}>MISMATCH</Text>
                  </View>
                ) : (
                  <View style={[styles.veriBadge, { backgroundColor: '#F3F4F6' }]}>
                    <Clock size={12} color="#6B7280" />
                    <Text style={[styles.veriBadgeText, { color: '#6B7280' }]}>PENDING PICKUP</Text>
                  </View>
                )}
              </View>

              {/* Photos Comparison Grid */}
              <View style={styles.photoComparisonRow}>
                {/* Reference Photo */}
                <View style={styles.photoBox}>
                  <Text style={styles.photoLabel}>Customer Booking Photo</Text>
                  {(delivery.itemPhoto || delivery.itemVerification?.originalImage || delivery.itemVerification?.originalImageUrl) ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() =>
                        setSelectedPhoto({
                          url: (delivery.itemPhoto || delivery.itemVerification?.originalImage || delivery.itemVerification?.originalImageUrl)!,
                          title: 'Customer Booking Reference Photo',
                        })
                      }
                      style={styles.photoWrapper}
                    >
                      <Image
                        source={{
                          uri: getDeliveryImageUrl(
                            delivery.itemPhoto || delivery.itemVerification?.originalImage || delivery.itemVerification?.originalImageUrl,
                            token || undefined
                          ),
                        }}
                        style={styles.photoThumbnail}
                        resizeMode="cover"
                      />
                      <View style={styles.zoomOverlay}>
                        <Eye size={13} color="#ffffff" />
                        <Text style={styles.zoomText}>View</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Package size={24} color={colors.outline} />
                      <Text style={styles.photoPlaceholderText}>No image</Text>
                    </View>
                  )}
                </View>

                {/* Pickup Photo */}
                <View style={styles.photoBox}>
                  <Text style={styles.photoLabel}>Partner Pickup Photo</Text>
                  {(delivery.itemVerification?.pickupImage || delivery.itemVerification?.pickupImageUrl) ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() =>
                        setSelectedPhoto({
                          url: (delivery.itemVerification?.pickupImage || delivery.itemVerification?.pickupImageUrl)!,
                          title: 'Partner Pickup Verification Photo',
                        })
                      }
                      style={styles.photoWrapper}
                    >
                      <Image
                        source={{
                          uri: getDeliveryImageUrl(
                            delivery.itemVerification?.pickupImage || delivery.itemVerification?.pickupImageUrl,
                            token || undefined
                          ),
                        }}
                        style={styles.photoThumbnail}
                        resizeMode="cover"
                      />
                      <View style={styles.zoomOverlay}>
                        <Eye size={13} color="#ffffff" />
                        <Text style={styles.zoomText}>View</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Camera size={24} color={colors.outline} />
                      <Text style={styles.photoPlaceholderText}>
                        {delivery.status === 'CREATED' || delivery.status === 'PARTNER_ASSIGNED'
                          ? 'Awaiting pickup'
                          : 'Not captured'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Status Banner details */}
              {delivery.itemVerification?.status === 'MISMATCH' && (
                <View style={styles.mismatchBanner}>
                  <AlertTriangle size={18} color="#B91C1C" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mismatchBannerTitle}>Physical Item Mismatch</Text>
                    <Text style={styles.mismatchBannerDesc}>
                      Reason: {delivery.itemVerification?.mismatchReason || 'Item does not match reference photo.'}
                    </Text>
                    {delivery.itemVerification?.mismatchNotes ? (
                      <Text style={styles.mismatchBannerNotes}>
                        "{delivery.itemVerification.mismatchNotes}"
                      </Text>
                    ) : null}
                    {(delivery.itemVerification?.mismatchEvidenceImage || delivery.itemVerification?.mismatchEvidenceUrl) ? (
                      <TouchableOpacity
                        onPress={() =>
                          setSelectedPhoto({
                            url: (delivery.itemVerification?.mismatchEvidenceImage || delivery.itemVerification?.mismatchEvidenceUrl)!,
                            title: 'Partner Mismatch Evidence',
                          })
                        }
                        style={{ marginTop: 6 }}
                      >
                        <Text style={styles.evidenceLink}>View Supporting Evidence Photo →</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              )}

              {delivery.itemVerification?.status === 'VERIFIED' && (
                <View style={styles.verifiedBanner}>
                  <CheckCheck size={16} color="#15803D" />
                  <Text style={styles.verifiedBannerText}>
                    Physical item matched and verified by delivery partner
                    {delivery.itemVerification?.verifiedAt
                      ? ` on ${new Date(delivery.itemVerification.verifiedAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : ''}.
                  </Text>
                </View>
              )}

              {delivery.itemVerification?.status === 'OVERRIDDEN' && (
                <View style={[styles.verifiedBanner, { backgroundColor: '#EFF6FF' }]}>
                  <ShieldCheck size={16} color="#1D4ED8" />
                  <Text style={[styles.verifiedBannerText, { color: '#1E40AF' }]}>
                    Item mismatch resolved by support team
                    {(delivery.itemVerification?.adminDecision || delivery.itemVerification?.resolutionNotes)
                      ? `: "${delivery.itemVerification.adminDecision || delivery.itemVerification.resolutionNotes}"`
                      : ''}.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Pickup & Drop Addresses */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>ROUTE & CONTACTS</Text>

            <View style={styles.locationBlock}>
              <View style={styles.locationHeaderRow}>
                <View style={styles.pickupBadge}>
                  <MapPin size={12} color="#16A34A" />
                  <Text style={styles.pickupBadgeText}>1. PRODUCT COLLECTION (RECIPIENT)</Text>
                </View>
                <TouchableOpacity
                  style={styles.callIconBtn}
                  onPress={() => openCall(delivery.pickup.contactPhone)}
                >
                  <Phone size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.addressText}>{delivery.pickup.address}</Text>
              <Text style={styles.contactSubText}>
                From: {delivery.pickup.contactName} • {delivery.pickup.contactPhone}
              </Text>
            </View>

            <View style={styles.addressDivider} />

            <View style={styles.locationBlock}>
              <View style={styles.locationHeaderRow}>
                <View style={styles.dropBadge}>
                  <MapPin size={12} color={colors.secondaryContainer} />
                  <Text style={styles.dropBadgeText}>2. FINAL DELIVERY DESTINATION (YOU / SENDER)</Text>
                </View>
                <TouchableOpacity
                  style={styles.callIconBtn}
                  onPress={() => openCall(delivery.drop.contactPhone)}
                >
                  <Phone size={14} color={colors.secondaryContainer} />
                </TouchableOpacity>
              </View>
              <Text style={styles.addressText}>{delivery.drop.address}</Text>
              <Text style={styles.contactSubText}>
                To: {delivery.drop.contactName} • {delivery.drop.contactPhone}
              </Text>
            </View>
          </View>

          {/* SECTION 3: Delivery Partner Information */}
          {partner ? (
            <View style={styles.card}>
              <Text style={styles.cardHeading}>ASSIGNED DELIVERY PARTNER</Text>
              <View style={styles.partnerProfileRow}>
                <View style={styles.partnerHeroAvatar}>
                  <Bike size={24} color={colors.primary} />
                </View>
                <View style={styles.partnerHeroInfo}>
                  <View style={styles.partnerHeroNameRow}>
                    <Text style={styles.partnerHeroName}>{partner.name}</Text>
                    <View style={styles.verifiedBadge}>
                      <ShieldCheck size={12} color={colors.tertiaryContainer} />
                      <Text style={styles.verifiedBadgeText}>Verified Partner</Text>
                    </View>
                  </View>
                  <Text style={styles.partnerHeroVehicle}>
                    {partner.vehicle?.make || 'Two Wheeler'} {partner.vehicle?.model || ''}
                    {partner.vehicle?.registrationNumber ? ` • ${partner.vehicle.registrationNumber}` : ''}
                  </Text>
                  {partner.rating ? (
                    <View style={styles.partnerHeroRatingRow}>
                      <Star size={13} color="#F59E0B" fill="#F59E0B" />
                      <Text style={styles.partnerHeroRatingText}>
                        {partner.rating.toFixed(1)} ({partner.totalRatings || 1} deliveries)
                      </Text>
                    </View>
                  ) : null}
                </View>

                {partner.phone ? (
                  <TouchableOpacity
                    style={styles.partnerDirectCallBtn}
                    onPress={() => openCall(partner.phone)}
                    activeOpacity={0.8}
                  >
                    <Phone size={18} color="#ffffff" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={styles.unassignedCard}>
              <Bike size={24} color={colors.outline} />
              <View style={{ flex: 1 }}>
                <Text style={styles.unassignedTitle}>Partner Matching</Text>
                <Text style={styles.unassignedDesc}>
                  We are broadcasting your pickup request to delivery partners in your immediate radius.
                </Text>
              </View>
            </View>
          )}

          {/* SECTION 4: Payment Summary */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>FARE & PAYMENT BREAKDOWN</Text>
            <View style={styles.fareLine}>
              <Text style={styles.fareLineLabel}>Base Delivery Fare</Text>
              <Text style={styles.fareLineVal}>₹{delivery.fare?.base || 40}</Text>
            </View>
            {delivery.fare?.perKm ? (
              <View style={styles.fareLine}>
                <Text style={styles.fareLineLabel}>Distance Charge</Text>
                <Text style={styles.fareLineVal}>₹{delivery.fare.perKm}</Text>
              </View>
            ) : null}
            {delivery.fare?.weightCharge ? (
              <View style={styles.fareLine}>
                <Text style={styles.fareLineLabel}>Weight Surcharge</Text>
                <Text style={styles.fareLineVal}>₹{delivery.fare.weightCharge}</Text>
              </View>
            ) : null}
            {delivery.fare?.discount ? (
              <View style={styles.fareLine}>
                <Text style={styles.fareLineLabel}>Promotional Discount</Text>
                <Text style={[styles.fareLineVal, { color: colors.tertiaryContainer }]}>
                  -₹{delivery.fare.discount}
                </Text>
              </View>
            ) : null}

            <View style={styles.fareTotalLine}>
              <Text style={styles.fareTotalLabel}>Total Amount</Text>
              <Text style={styles.fareTotalVal}>₹{delivery.fare?.total || 49}</Text>
            </View>

            <View style={styles.paymentStatusPill}>
              <CreditCard size={15} color={colors.primary} />
              <Text style={styles.paymentStatusPillText}>
                {delivery.payment?.method || 'UPI'} • {delivery.payment?.status || 'PAID'} (Txn:{' '}
                {delivery.payment?.transactionId || 'SUCCESS'})
              </Text>
            </View>
          </View>

          {/* SECTION 5: Proof of Delivery (Delivered only) */}
          {isDelivered ? (
            <View style={styles.card}>
              <Text style={styles.cardHeading}>PROOF OF DELIVERY</Text>
              <View style={styles.podBox}>
                <CheckCircle2 size={24} color={colors.tertiaryContainer} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.podTitle}>Handover Verified</Text>
                  <Text style={styles.podDesc}>
                    Item received and verified at recipient address via digital delivery confirmation.
                  </Text>
                  <Text style={styles.podTime}>Timestamp: {formatDate(delivery.updatedAt)}</Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* SECTION 6: Customer Actions Bar */}
          <View style={styles.actionsContainer}>
            {isActive ? (
              <TouchableOpacity
                style={styles.mainActionBtn}
                onPress={() => router.push(`/(customer)/tracking?id=${delivery._id}` as any)}
                activeOpacity={0.8}
              >
                <Navigation size={16} color="#ffffff" />
                <Text style={styles.mainActionBtnText}>Track Delivery on Map</Text>
              </TouchableOpacity>
            ) : null}

            {isDelivered && !delivery.rating?.rating ? (
              <TouchableOpacity
                style={styles.ratePartnerActionBtn}
                onPress={() => {
                  setRatingScore(5);
                  setRatingFeedback('');
                  setRateModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Star size={16} color="#ffffff" fill="#ffffff" />
                <Text style={styles.ratePartnerActionBtnText}>Rate Delivery Partner</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.secondaryActionsRow}>
              <TouchableOpacity
                style={styles.supportTicketBtn}
                onPress={() => {
                  setTicketSubject('');
                  setTicketDescription('');
                  setTicketCategory('DELIVERY_DELAY');
                  setTicketModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <HelpCircle size={15} color={colors.onSurface} />
                <Text style={styles.supportTicketBtnText}>Need Help / Raise Ticket</Text>
              </TouchableOpacity>

              {isCancellable ? (
                <TouchableOpacity
                  style={styles.cancelOrderBtn}
                  onPress={() => setCancelModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelOrderBtnText}>Cancel Booking</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </ScrollView>
      )}

      {/* MODAL: Cancel Delivery */}
      {cancelModalVisible ? (
        <Modal
          visible={cancelModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCancelModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalIconWrapRed}>
                <XCircle size={28} color={colors.error} />
              </View>
              <Text style={styles.modalTitle}>Cancel Delivery?</Text>
              <Text style={styles.modalSubtitle}>
                Are you sure you want to cancel this booking? If fare was debited, a complete refund will be credited.
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Reason for cancellation..."
                placeholderTextColor={colors.outline}
                value={cancelReason}
                onChangeText={setCancelReason}
              />
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalBackBtn}
                  onPress={() => setCancelModalVisible(false)}
                >
                  <Text style={styles.modalBackBtnText}>Keep Delivery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmCancelBtn, cancelling && styles.btnDisabled]}
                  onPress={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalConfirmCancelBtnText}>Yes, Cancel</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* MODAL: Rate Partner */}
      {rateModalVisible ? (
        <Modal
          visible={rateModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setRateModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalIconWrapYellow}>
                <Star size={28} color="#F59E0B" fill="#F59E0B" />
              </View>
              <Text style={styles.modalTitle}>Rate Partner</Text>
              <Text style={styles.modalSubtitle}>
                Rate your delivery experience with {partner?.name || 'our partner'}
              </Text>

              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setRatingScore(s)}
                    style={{ padding: 4 }}
                  >
                    <Star
                      size={32}
                      color={s <= ratingScore ? '#F59E0B' : '#D1D5DB'}
                      fill={s <= ratingScore ? '#F59E0B' : 'transparent'}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.modalInput, { height: 75, textAlignVertical: 'top' }]}
                placeholder="Leave feedback on handover or speed..."
                placeholderTextColor={colors.outline}
                multiline
                value={ratingFeedback}
                onChangeText={setRatingFeedback}
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalBackBtn}
                  onPress={() => setRateModalVisible(false)}
                >
                  <Text style={styles.modalBackBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSubmitBtn, submittingRating && styles.btnDisabled]}
                  onPress={handleSubmitRating}
                  disabled={submittingRating}
                >
                  {submittingRating ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* MODAL: Digital Receipt */}
      {receiptModalVisible && delivery ? (
        <Modal
          visible={receiptModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setReceiptModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.receiptCard}>
              <View style={styles.receiptHeader}>
                <View>
                  <Text style={styles.receiptBrand}>H2H Delivery Invoice</Text>
                  <Text style={styles.receiptSub}>Tracking ID: {delivery.trackingId}</Text>
                </View>
                <TouchableOpacity onPress={() => setReceiptModalVisible(false)}>
                  <X size={20} color={colors.onSurface} />
                </TouchableOpacity>
              </View>

              <View style={styles.receiptDivider} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Date</Text>
                <Text style={styles.receiptRowVal}>{formatDate(delivery.createdAt)}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Service</Text>
                <Text style={styles.receiptRowVal}>Hand2Hand Hand-to-Hand Delivery</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Distance</Text>
                <Text style={styles.receiptRowVal}>{delivery.distance || 3.2} km</Text>
              </View>
              <View style={styles.receiptDivider} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Base Charge</Text>
                <Text style={styles.receiptRowVal}>₹{delivery.fare?.base || 40}</Text>
              </View>
              {delivery.fare?.perKm ? (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptRowLabel}>Distance Surcharge</Text>
                  <Text style={styles.receiptRowVal}>₹{delivery.fare.perKm}</Text>
                </View>
              ) : null}
              {delivery.fare?.weightCharge ? (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptRowLabel}>Weight Surcharge</Text>
                  <Text style={styles.receiptRowVal}>₹{delivery.fare.weightCharge}</Text>
                </View>
              ) : null}

              <View style={styles.receiptTotalRow}>
                <Text style={styles.receiptTotalLabel}>Total Paid</Text>
                <Text style={styles.receiptTotalVal}>₹{delivery.fare?.total || 49}</Text>
              </View>

              <View style={styles.receiptSuccessBox}>
                <CheckCircle2 size={16} color={colors.tertiaryContainer} />
                <Text style={styles.receiptSuccessText}>
                  Verified • {delivery.payment?.method || 'UPI'} • {delivery.payment?.status || 'PAID'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.receiptDoneBtn}
                onPress={() => setReceiptModalVisible(false)}
              >
                <Text style={styles.receiptDoneBtnText}>Close Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* MODAL: Raise Ticket */}
      {ticketModalVisible && delivery ? (
        <Modal
          visible={ticketModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setTicketModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.ticketHeaderRow}>
                <View>
                  <Text style={styles.modalTitle}>Raise Support Ticket</Text>
                  <Text style={styles.modalSubtitle}>Order {delivery.trackingId}</Text>
                </View>
                <TouchableOpacity onPress={() => setTicketModalVisible(false)}>
                  <X size={20} color={colors.onSurface} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder="Issue subject (e.g. Delivery query)..."
                placeholderTextColor={colors.outline}
                value={ticketSubject}
                onChangeText={setTicketSubject}
              />
              <TextInput
                style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Describe what happened..."
                placeholderTextColor={colors.outline}
                multiline
                value={ticketDescription}
                onChangeText={setTicketDescription}
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalBackBtn}
                  onPress={() => setTicketModalVisible(false)}
                >
                  <Text style={styles.modalBackBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSubmitBtn, raisingTicket && styles.btnDisabled]}
                  onPress={handleRaiseTicket}
                  disabled={raisingTicket}
                >
                  {raisingTicket ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Submit Ticket</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Photo Inspection Modal */}
      {selectedPhoto ? (
        <Modal
          visible={!!selectedPhoto}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPhoto(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.photoModalCard}>
              <View style={styles.photoModalHeader}>
                <Text style={styles.photoModalTitle} numberOfLines={1}>
                  {selectedPhoto.title}
                </Text>
                <TouchableOpacity onPress={() => setSelectedPhoto(null)} style={styles.photoCloseBtn}>
                  <X size={20} color={colors.onSurface} />
                </TouchableOpacity>
              </View>
              <Image
                source={{ uri: getDeliveryImageUrl(selectedPhoto.url, token || undefined) }}
                style={styles.fullPhotoPreview}
                resizeMode="contain"
              />
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
  headerReceiptBtn: {
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
  notFoundBox: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  notFoundTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
  },
  notFoundDesc: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  backToOrdersBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  backToOrdersBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    gap: 14,
  },
  statusHeroCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 6,
  },
  statusHeroCardDelivered: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  statusHeroCardCancelled: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  senderOtpCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#93c5fd',
    gap: 12,
  },
  senderOtpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  senderOtpTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e40af',
  },
  senderOtpSub: {
    fontSize: 12,
    color: '#3b82f6',
    lineHeight: 16,
    marginTop: 2,
  },
  senderOtpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  senderOtpBox: {
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
  senderOtpText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e3a8a',
  },
  statusHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusHeroLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.outline,
    letterSpacing: 0.5,
  },
  statusHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  liveTrackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  liveTrackPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  statusHeroDate: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    gap: 12,
  },
  cardHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.outline,
    letterSpacing: 0.5,
  },
  cancelledTimelineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
  },
  cancelledTimelineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
  },
  cancelledTimelineReason: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 48,
  },
  timelineLeftCol: {
    alignItems: 'center',
    width: 24,
  },
  timelineNode: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineNodeDone: {
    backgroundColor: colors.tertiaryContainer,
  },
  timelineNodeCurrent: {
    backgroundColor: colors.primary,
    transform: [{ scale: 1.15 }],
  },
  timelineNodePending: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.outline,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    marginVertical: 2,
  },
  timelineConnectorDone: {
    backgroundColor: colors.tertiaryContainer,
  },
  timelineContentCol: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 14,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineStepTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.outline,
  },
  timelineStepTitleDone: {
    color: colors.onSurface,
  },
  timelineStepTitleCurrent: {
    fontWeight: '800',
    color: colors.primary,
  },
  timelineTimeText: {
    fontSize: 10,
    color: colors.outline,
  },
  timelineStepDesc: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  packageDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceContainerLow,
    padding: 10,
    borderRadius: 12,
  },
  detailBoxLabel: {
    fontSize: 10,
    color: colors.outline,
    fontWeight: '600',
  },
  detailBoxValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 2,
  },
  descriptionSection: {
    backgroundColor: colors.surfaceContainerLow,
    padding: 10,
    borderRadius: 12,
  },
  descSectionLabel: {
    fontSize: 10,
    color: colors.outline,
    fontWeight: '600',
  },
  descSectionText: {
    fontSize: 12,
    color: colors.onSurface,
    marginTop: 2,
    lineHeight: 16,
  },
  locationBlock: {
    gap: 4,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pickupBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  dropBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dropBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondaryContainer,
  },
  callIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
    lineHeight: 18,
  },
  contactSubText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  addressDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainer,
    marginVertical: 4,
  },
  partnerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  partnerHeroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerHeroInfo: {
    flex: 1,
    gap: 2,
  },
  partnerHeroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partnerHeroName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.tertiaryContainer,
  },
  partnerHeroVehicle: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  partnerHeroRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  partnerHeroRatingText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurface,
  },
  partnerDirectCallBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unassignedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceContainerLow,
    padding: 14,
    borderRadius: 16,
  },
  unassignedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  unassignedDesc: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    lineHeight: 15,
  },
  fareLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareLineLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  fareLineVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  fareTotalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
  },
  fareTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.onSurface,
  },
  fareTotalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  paymentStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    padding: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  paymentStatusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  podBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
  },
  podTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  podDesc: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 15,
    marginTop: 2,
  },
  podTime: {
    fontSize: 10,
    color: '#15803d',
    marginTop: 4,
  },
  actionsContainer: {
    gap: 10,
    marginTop: 4,
  },
  mainActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
  },
  mainActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  ratePartnerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 14,
  },
  ratePartnerActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  supportTicketBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  supportTicketBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
  },
  cancelOrderBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
  },
  cancelOrderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
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
  },
  modalIconWrapRed: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  modalIconWrapYellow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.onSurface,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 16,
  },
  modalInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.onSurface,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalBackBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  modalBackBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  modalConfirmCancelBtn: {
    flex: 1.2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.error,
  },
  modalConfirmCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalSubmitBtn: {
    flex: 1.2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
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
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  receiptSub: {
    fontSize: 11,
    color: colors.outline,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainer,
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
  receiptSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: 8,
  },
  receiptSuccessText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
    flex: 1,
  },
  receiptDoneBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  receiptDoneBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  ticketHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemNameRow: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  itemNameTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  itemCategorySubText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  handlingBox: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#D97706',
  },
  handlingLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  handlingText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 16,
  },
  verificationSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
  },
  verificationSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  verificationSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  veriBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  veriBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  photoComparisonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoBox: {
    flex: 1,
  },
  photoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    marginBottom: 6,
  },
  photoWrapper: {
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  zoomOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  zoomText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  photoPlaceholder: {
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.surfaceContainerHighest,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoPlaceholderText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  mismatchBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  mismatchBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },
  mismatchBannerDesc: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
  },
  mismatchBannerNotes: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#7F1D1D',
    marginTop: 4,
  },
  evidenceLink: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B91C1C',
    textDecorationLine: 'underline',
  },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  verifiedBannerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
    flex: 1,
  },
  photoModalCard: {
    width: '92%',
    maxHeight: '80%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  photoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  photoModalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
    flex: 1,
    marginRight: 8,
  },
  photoCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPhotoPreview: {
    width: '100%',
    height: 340,
    borderRadius: 10,
    backgroundColor: '#000000',
  },
});
