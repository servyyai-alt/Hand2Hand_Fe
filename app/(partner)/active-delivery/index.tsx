import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ExpoLocation from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Phone,
  Navigation,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Package,
  ChevronRight,
  HelpCircle,
  Check,
  Camera,
  RotateCcw,
  AlertTriangle,
  X,
  Eye,
  CheckCheck,
  Image as ImageIcon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../../src/services/api.service';
import { deliveryService, getDeliveryImageUrl } from '../../../src/services/delivery.service';
import { socketService } from '../../../src/services/socket.service';
import { useAppSelector } from '../../../src/hooks/useAppSelector';
import { colors, spacing } from '../../../src/theme';
import { showToast } from '../../../src/utils/toast';
import { Card } from '../../../src/components/ui/Card';
import { SlideUp } from '../../../src/components/animations/SlideUp';

export default function ActiveDeliveryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [otpInput, setOtpInput] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Fetch current active delivery
  const {
    data: delivery,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['partner', 'active-delivery'],
    queryFn: () => apiClient.get('/partners/deliveries/active').then(r => r.data.data),
    refetchInterval: 6000,
  });

  // Reset OTP input whenever status changes
  useEffect(() => {
    setOtpInput('');
  }, [delivery?.status]);

  const token = useAppSelector(s => s.auth.accessToken);

  // Item verification states
  const [pickupPhotoLocalUri, setPickupPhotoLocalUri] = useState<string | null>(null);
  const [pickupPhotoBase64, setPickupPhotoBase64] = useState<string | null>(null);
  const [uploadingPickupPhoto, setUploadingPickupPhoto] = useState(false);
  const [uploadedPickupPhotoUrl, setUploadedPickupPhotoUrl] = useState<string | null>(null);
  const [submittingVerification, setSubmittingVerification] = useState(false);

  // Mismatch reporting states
  const [mismatchModalVisible, setMismatchModalVisible] = useState(false);
  const [mismatchReason, setMismatchReason] = useState('WRONG_ITEM');
  const [mismatchNotes, setMismatchNotes] = useState('');
  const [mismatchEvidenceUri, setMismatchEvidenceUri] = useState<string | null>(null);
  const [mismatchEvidenceBase64, setMismatchEvidenceBase64] = useState<string | null>(null);
  const [submittingMismatch, setSubmittingMismatch] = useState(false);

  // Fullscreen photo inspection
  const [inspectImageUrl, setInspectImageUrl] = useState<string | null>(null);

  // Real-Time GPS Tracking Streamer
  useEffect(() => {
    if (
      !delivery?._id ||
      !['PARTNER_ASSIGNED', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT'].includes(delivery.status)
    ) {
      return;
    }

    let locationSub: ExpoLocation.LocationSubscription | null = null;
    let isMounted = true;
    let lastLat = 0;
    let lastLng = 0;

    const startGpsStream = async () => {
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const sendLocation = (lat: number, lng: number, heading = 0, speed = 0, accuracy = 10) => {
          // Jitter filtering: ignore updates < 4 meters apart
          const dist = Math.hypot(lat - lastLat, lng - lastLng) * 111000;
          if (dist < 4 && lastLat !== 0) return;
          lastLat = lat;
          lastLng = lng;

          // Socket broadcast
          socketService.sendLocationUpdate(delivery._id, { lat, lng, heading, speed, accuracy });
          // REST fallback
          deliveryService.updateLocation(delivery._id, { lat, lng, heading, speed, accuracy }).catch(() => {});
        };

        const initial = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.High,
        });
        if (isMounted && initial?.coords) {
          sendLocation(
            initial.coords.latitude,
            initial.coords.longitude,
            initial.coords.heading ?? 0,
            initial.coords.speed ?? 0,
            initial.coords.accuracy ?? 10
          );
        }

        locationSub = await ExpoLocation.watchPositionAsync(
          {
            accuracy: ExpoLocation.Accuracy.High,
            timeInterval: 4000,
            distanceInterval: 5,
          },
          (loc) => {
            if (!isMounted || !loc?.coords) return;
            sendLocation(
              loc.coords.latitude,
              loc.coords.longitude,
              loc.coords.heading ?? 0,
              loc.coords.speed ?? 0,
              loc.coords.accuracy ?? 10
            );
          }
        );
      } catch {
        // Continue silently without crashing
      }
    };

    startGpsStream();

    return () => {
      isMounted = false;
      if (locationSub) {
        locationSub.remove();
      }
    };
  }, [delivery?._id, delivery?.status]);

  const handleCall = (phoneNumber?: string) => {
    if (!phoneNumber) {
      showToast('error', 'Phone number unavailable', 'No contact phone provided.');
      return;
    }
    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      showToast('error', 'Cannot make call', 'Call feature is not supported on this device.');
    });
  };

  const handleOpenMaps = (address: string, lat?: number, lng?: number) => {
    const encoded = encodeURIComponent(address);
    const url =
      lat && lng
        ? Platform.select({
            ios: `maps:0,0?q=${lat},${lng}(${encoded})`,
            android: `geo:0,0?q=${lat},${lng}(${encoded})`,
            default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
          })
        : `https://www.google.com/maps/search/?api=1&query=${encoded}`;

    if (url) Linking.openURL(url).catch(() => {});
  };

  const handlePickPickupPhoto = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          showToast('error', 'Camera Permission', 'Please allow camera access to photograph the physical item.');
          return;
        }
        const res = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          base64: true,
        });
        if (!res.canceled && res.assets && res.assets[0]) {
          await processPickupPhoto(res.assets[0]);
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showToast('error', 'Gallery Permission', 'Please allow gallery access to select photo.');
          return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          base64: true,
        });
        if (!res.canceled && res.assets && res.assets[0]) {
          await processPickupPhoto(res.assets[0]);
        }
      }
    } catch {
      showToast('error', 'Photo Error', 'Could not open camera or gallery.');
    }
  };

  const processPickupPhoto = async (asset: ImagePicker.ImagePickerAsset) => {
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      showToast('error', 'File Too Large', 'Photograph must be under 10MB.');
      return;
    }
    const dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
    setPickupPhotoLocalUri(asset.uri);
    setPickupPhotoBase64(dataUri);
    setUploadedPickupPhotoUrl(null);

    setUploadingPickupPhoto(true);
    try {
      const url = await deliveryService.uploadImage(dataUri, 'pickup_verify');
      setUploadedPickupPhotoUrl(url);
      showToast('success', 'Photo Uploaded', 'Pickup item photo saved. Confirm match below.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to upload photo. You can still confirm match to retry.';
      showToast('error', 'Upload Note', msg);
    } finally {
      setUploadingPickupPhoto(false);
    }
  };

  const handleConfirmMatch = async () => {
    if (!delivery?._id) return;
    const photoToSubmit = uploadedPickupPhotoUrl || pickupPhotoBase64;
    if (!photoToSubmit) {
      showToast('error', 'Photo Required', 'Please photograph the physical item before confirming match.');
      return;
    }

    setSubmittingVerification(true);
    try {
      await deliveryService.verifyItem(delivery._id, photoToSubmit);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('success', 'Item Verified!', 'Physical item match confirmed. Now ask Recipient for collection OTP.');
      await queryClient.invalidateQueries({ queryKey: ['partner'] });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Verification failed. Please retry.';
      showToast('error', 'Verification Failed', msg);
    } finally {
      setSubmittingVerification(false);
    }
  };

  const handlePickEvidence = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showToast('error', 'Permission', 'Please allow camera access.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        const dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setMismatchEvidenceUri(asset.uri);
        setMismatchEvidenceBase64(dataUri);
      }
    } catch {
      showToast('error', 'Camera Error', 'Could not open camera.');
    }
  };

  const handleSubmitMismatch = async () => {
    if (!delivery?._id) return;
    setSubmittingMismatch(true);
    try {
      let evidenceUrl = undefined;
      if (mismatchEvidenceBase64) {
        try {
          evidenceUrl = await deliveryService.uploadImage(mismatchEvidenceBase64, 'mismatch_evidence');
        } catch {}
      }

      await deliveryService.reportMismatch(
        delivery._id,
        mismatchReason,
        mismatchNotes.trim() || undefined,
        evidenceUrl
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setMismatchModalVisible(false);
      showToast('info', 'Mismatch Reported', 'Order paused and customer/support notified.');
      await queryClient.invalidateQueries({ queryKey: ['partner'] });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to report mismatch.';
      showToast('error', 'Report Failed', msg);
    } finally {
      setSubmittingMismatch(false);
    }
  };

  // 1. Mark Arrived at Pickup
  const handleArriveAtPickup = async () => {
    if (!delivery?._id) return;
    setSubmittingAction(true);
    try {
      await apiClient.post(`/partners/deliveries/${delivery._id}/arrived-pickup`);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('success', 'Arrived at Recipient', 'Please collect package and request the 4-digit Recipient OTP.');
      await queryClient.invalidateQueries({ queryKey: ['partner'] });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Could not update status. Try again.';
      showToast('error', 'Action failed', msg);
    } finally {
      setSubmittingAction(false);
    }
  };

  // 2. Verify Pickup OTP (Recipient OTP)
  const handleVerifyPickupOTP = async () => {
    if (!delivery?._id) return;
    if (otpInput.trim().length !== 4) {
      showToast('error', 'Invalid OTP', 'Please enter the 4-digit code provided by the recipient.');
      return;
    }
    setSubmittingAction(true);
    try {
      await apiClient.post(`/partners/deliveries/${delivery._id}/verify-pickup-otp`, {
        otp: otpInput.trim(),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('success', 'Product Collected', 'Recipient verified successfully! Navigation switched to Sender.');
      setOtpInput('');
      await queryClient.invalidateQueries({ queryKey: ['partner'] });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid Recipient OTP. Please check with recipient.';
      showToast('error', 'Verification Failed', msg);
    } finally {
      setSubmittingAction(false);
    }
  };

  // 3. Start Transit to Sender
  const handleStartTransit = async () => {
    if (!delivery?._id) return;
    setSubmittingAction(true);
    try {
      await apiClient.post(`/partners/deliveries/${delivery._id}/in-transit`);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('success', 'In Transit to Sender', 'Proceed safely to the Sender delivery address.');
      await queryClient.invalidateQueries({ queryKey: ['partner'] });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Could not start transit. Try again.';
      showToast('error', 'Action failed', msg);
    } finally {
      setSubmittingAction(false);
    }
  };

  // 4. Verify Delivery OTP (Sender OTP)
  const handleVerifyDeliveryOTP = async () => {
    if (!delivery?._id) return;
    if (otpInput.trim().length !== 4) {
      showToast('error', 'Invalid OTP', 'Please enter the 4-digit code provided by the sender.');
      return;
    }
    setSubmittingAction(true);
    try {
      await apiClient.post(`/partners/deliveries/${delivery._id}/verify-delivery-otp`, {
        otp: otpInput.trim(),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('success', 'Delivery Completed!', `₹${delivery.fare?.total ?? 0} credited to your wallet.`);
      setOtpInput('');
      await queryClient.invalidateQueries({ queryKey: ['partner'] });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid Delivery OTP. Please ask the sender.';
      showToast('error', 'Verification Failed', msg);
    } finally {
      setSubmittingAction(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={colors.brand[600]} />
        <Text style={styles.loadingText}>Checking active delivery status...</Text>
      </View>
    );
  }

  // No active delivery
  if (!delivery) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.neutral[800]} />
          </TouchableOpacity>
          <Text style={styles.barTitle}>Active Delivery</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.emptyBody}>
          <View style={styles.emptyIconCircle}>
            <Package size={48} color={colors.brand[600]} />
          </View>
          <Text style={styles.emptyTitle}>No Active Delivery</Text>
          <Text style={styles.emptySub}>
            You do not have any delivery assigned or in progress right now.
          </Text>

          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.push('/(partner)/requests')}
            activeOpacity={0.8}
          >
            <Text style={styles.browseBtnText}>Browse Available Requests</Text>
            <ChevronRight size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const status = delivery.status;
  const isAssigned = status === 'PARTNER_ASSIGNED';
  const isAtPickup = status === 'ARRIVED_AT_PICKUP';
  const isMismatch = status === 'ITEM_MISMATCH' || delivery.itemVerification?.status === 'MISMATCH';
  const isVerified = delivery.itemVerification?.status === 'VERIFIED' || delivery.itemVerification?.status === 'OVERRIDDEN';
  const isPickedUp = status === 'PICKED_UP';
  const isInTransit = status === 'IN_TRANSIT';
  const isDelivered = status === 'DELIVERED';

  // Step tracker
  const steps = [
    { label: 'Accepted', done: true },
    { label: 'Arrived', done: isAtPickup || isMismatch || isVerified || isPickedUp || isInTransit || isDelivered },
    { label: 'Verified', done: isVerified || isPickedUp || isInTransit || isDelivered },
    { label: 'Picked Up', done: isPickedUp || isInTransit || isDelivered },
    { label: 'In Transit', done: isInTransit || isDelivered },
    { label: 'Delivered', done: isDelivered },
  ];

  return (
    <View style={styles.screen}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.neutral[800]} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.barTitle}>Active Delivery</Text>
          <Text style={styles.barSub}>#{delivery.trackingId}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(partner)/profile')}
          style={styles.helpBtn}
        >
          <HelpCircle size={20} color={colors.neutral[600]} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand[600]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Tracker */}
        <View style={styles.trackerWrap}>
          <View style={styles.trackerRow}>
            {steps.map((st, i) => (
              <React.Fragment key={st.label}>
                <View style={styles.stepCol}>
                  <View style={[styles.stepCircle, st.done && styles.stepCircleDone]}>
                    {st.done ? (
                      <Check size={12} color="#ffffff" strokeWidth={3} />
                    ) : (
                      <View style={styles.stepCircleInner} />
                    )}
                  </View>
                  <Text style={[styles.stepLabel, st.done && styles.stepLabelDone]}>
                    {st.label}
                  </Text>
                </View>
                {i < steps.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      steps[i + 1].done && styles.stepLineDone,
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Current Stage Instruction Banner */}
        <SlideUp delay={50}>
          <View style={[styles.stageBanner, isMismatch && styles.stageBannerMismatch]}>
            <View style={[styles.stageIconWrap, isMismatch && styles.stageIconWrapMismatch]}>
              {isDelivered ? (
                <CheckCircle2 size={24} color="#16a34a" />
              ) : isMismatch ? (
                <AlertTriangle size={24} color="#dc2626" />
              ) : (
                <Navigation size={24} color={colors.brand[600]} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stageBannerTitle, isMismatch && styles.stageBannerTitleMismatch]}>
                {isAssigned && 'Heading to Recipient Location'}
                {isAtPickup && !isVerified && 'Arrived at Recipient — Item Photo Verification Required'}
                {isAtPickup && isVerified && 'Item Match Verified — Collect Recipient OTP'}
                {isMismatch && 'Order On Hold — Item Mismatch Reported'}
                {isPickedUp && 'Product Collected — Heading to Sender'}
                {isInTransit && 'Heading to Sender — Final Handover'}
                {isDelivered && 'Order Successfully Delivered!'}
              </Text>
              <Text style={[styles.stageBannerSub, isMismatch && styles.stageBannerSubMismatch]}>
                {isAssigned && 'Navigate to the Recipient to collect the product. Tap Arrived when there.'}
                {isAtPickup && !isVerified && 'Inspect customer reference photo and capture the physical item photo below.'}
                {isAtPickup && isVerified && 'Item confirmed match! Ask the Recipient for the 4-digit collection OTP.'}
                {isMismatch && 'Pickup paused pending customer and support resolution. Pickup OTP cannot be entered.'}
                {isPickedUp && 'Product collected! Destination automatically switched to Sender location.'}
                {isInTransit && 'Ask the Sender for the 4-digit Delivery OTP upon arrival.'}
                {isDelivered && 'Fare has been credited to your wallet balance.'}
              </Text>
            </View>
          </View>
        </SlideUp>

        {/* Live Navigation Destination Display */}
        {!isDelivered && (
          <SlideUp delay={70}>
            <View style={styles.mapTargetCard}>
              <View style={styles.mapTargetIconCircle}>
                <Navigation size={18} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mapTargetHeader}>
                  ACTIVE NAVIGATION DESTINATION: {!isPickedUp && !isInTransit ? 'RECIPIENT' : 'SENDER'}
                </Text>
                <Text style={styles.mapTargetAddress} numberOfLines={2}>
                  {!isPickedUp && !isInTransit ? delivery.pickup?.address : delivery.drop?.address}
                </Text>
                <Text style={styles.mapTargetContact}>
                  {!isPickedUp && !isInTransit
                    ? `Collect from: ${delivery.pickup?.contactName || 'Recipient'} (${delivery.pickup?.contactPhone})`
                    : `Deliver to: ${delivery.drop?.contactName || 'Sender'} (${delivery.drop?.contactPhone})`}
                </Text>
              </View>
            </View>
          </SlideUp>
        )}

        {/* COMPLETED SUCCESS STATE */}
        {isDelivered ? (
          <SlideUp delay={100}>
            <Card style={styles.completedCard}>
              <View style={styles.completedBadge}>
                <CheckCircle2 size={44} color="#16a34a" />
              </View>
              <Text style={styles.completedTitle}>Delivery Complete!</Text>
              <Text style={styles.completedSub}>
                Great job! You have safely collected from the Recipient and delivered to the Sender.
              </Text>

              <View style={styles.earningHighlight}>
                <Text style={styles.earningHighlightLabel}>EARNED ON THIS ORDER</Text>
                <Text style={styles.earningHighlightVal}>+₹{delivery.fare?.total ?? 0}</Text>
              </View>

              <TouchableOpacity
                style={styles.finishBtn}
                onPress={() => router.replace('/(partner)')}
                activeOpacity={0.8}
              >
                <Text style={styles.finishBtnText}>Back to Dashboard</Text>
              </TouchableOpacity>
            </Card>
          </SlideUp>
        ) : null}

        {/* STAGE 1 & 2: RECIPIENT CARD (Active during PARTNER_ASSIGNED and ARRIVED_AT_PICKUP) */}
        {!isPickedUp && !isInTransit && !isDelivered && (
          <SlideUp delay={100}>
            <Card style={styles.partyCard}>
              <View style={styles.partyHeader}>
                <View style={styles.badgeRow}>
                  <View style={[styles.dot, { backgroundColor: colors.brand[600] }]} />
                  <Text style={styles.partyRole}>1. COLLECT FROM (RECIPIENT)</Text>
                </View>
                <TouchableOpacity
                  style={styles.mapAction}
                  onPress={() =>
                    handleOpenMaps(
                      delivery.pickup?.address,
                      delivery.pickup?.coordinates?.lat,
                      delivery.pickup?.coordinates?.lng
                    )
                  }
                >
                  <Navigation size={14} color={colors.brand[600]} />
                  <Text style={styles.mapActionText}>Map</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.partyName}>{delivery.pickup?.contactName || 'Recipient'}</Text>
              <Text style={styles.partyAddress}>{delivery.pickup?.address}</Text>

              {delivery.pickup?.landmark ? (
                <Text style={styles.partyLandmark}>
                  Landmark: {delivery.pickup.landmark}
                </Text>
              ) : null}

              <View style={styles.partyActions}>
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => handleCall(delivery.pickup?.contactPhone)}
                  activeOpacity={0.8}
                >
                  <Phone size={16} color="#ffffff" />
                  <Text style={styles.callButtonText}>Call Recipient</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() =>
                    handleOpenMaps(
                      delivery.pickup?.address,
                      delivery.pickup?.coordinates?.lat,
                      delivery.pickup?.coordinates?.lng
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Navigation size={16} color={colors.brand[700]} />
                  <Text style={styles.navButtonText}>Directions to Recipient</Text>
                </TouchableOpacity>
              </View>

              {/* ACTION FOR STAGE 1: ARRIVED BUTTON */}
              {isAssigned && (
                <View style={styles.stageActionBox}>
                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    onPress={handleArriveAtPickup}
                    disabled={submittingAction}
                    activeOpacity={0.8}
                  >
                    {submittingAction ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <CheckCircle2 size={18} color="#ffffff" />
                        <Text style={styles.primaryActionText}>I Have Arrived at Recipient</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* ACTION FOR STAGE 2: ITEM VERIFICATION & 4-DIGIT RECIPIENT OTP */}
              {(isAtPickup || isMismatch) && (
                <View style={styles.verificationSection}>
                  <View style={styles.sectionDivider} />
                  <View style={styles.verificationHeader}>
                    <Camera size={18} color={colors.brand[600]} />
                    <Text style={styles.verificationTitle}>Physical Item Verification</Text>
                  </View>
                  <Text style={styles.verificationHelper}>
                    Verify that the physical package matches the customer's booked photograph before entering the Recipient OTP.
                  </Text>

                  {/* Item Description & Handling Badges */}
                  {(delivery.itemName || delivery.handlingInstructions) ? (
                    <View style={styles.itemMetaBadgeRow}>
                      {delivery.itemName ? (
                        <View style={styles.metaBadge}>
                          <Package size={12} color={colors.brand[700]} />
                          <Text style={styles.metaBadgeText}>{delivery.itemName}</Text>
                        </View>
                      ) : null}
                      {delivery.handlingInstructions ? (
                        <View style={styles.handlingBadge}>
                          <AlertTriangle size={12} color="#D97706" />
                          <Text style={styles.handlingBadgeText}>{delivery.handlingInstructions}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* CASE A: ITEM MISMATCH ON HOLD */}
                  {isMismatch ? (
                    <View style={styles.mismatchAlertBox}>
                      <View style={styles.mismatchAlertHeader}>
                        <AlertTriangle size={20} color="#DC2626" />
                        <Text style={styles.mismatchAlertTitle}>Order On Hold — Mismatch Reported</Text>
                      </View>
                      <Text style={styles.mismatchAlertBody}>
                        Reason: {delivery.itemVerification?.mismatchReason || 'Item does not match reference photo'}.
                      </Text>
                      {delivery.itemVerification?.mismatchNotes ? (
                        <Text style={styles.mismatchAlertNotes}>
                          Notes: "{delivery.itemVerification.mismatchNotes}"
                        </Text>
                      ) : null}
                      <Text style={styles.mismatchAlertLockText}>
                        🔒 Recipient collection is blocked until resolved by customer or support.
                      </Text>
                    </View>
                  ) : isVerified ? (
                    /* CASE B: VERIFIED SUCCESSFUL MATCH */
                    <View style={styles.verifiedSuccessBox}>
                      <View style={styles.verifiedSuccessHeader}>
                        <CheckCheck size={18} color="#059669" />
                        <Text style={styles.verifiedSuccessTitle}>Item Match Verified</Text>
                      </View>
                      <Text style={styles.verifiedSuccessSub}>
                        Physical item confirmed identical to customer reference photo.
                      </Text>

                      {/* Comparison Thumbnails */}
                      <View style={styles.sideBySideRow}>
                        {delivery.itemPhoto || delivery.itemVerification?.originalImage?.url ? (
                          <TouchableOpacity
                            style={styles.comparisonCol}
                            onPress={() => setInspectImageUrl(getDeliveryImageUrl(delivery.itemPhoto || delivery.itemVerification?.originalImage?.url, token))}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.comparisonLabel}>Customer Reference</Text>
                            <Image
                              source={{ uri: getDeliveryImageUrl(delivery.itemPhoto || delivery.itemVerification?.originalImage?.url, token) }}
                              style={styles.comparisonThumb}
                            />
                          </TouchableOpacity>
                        ) : null}
                        {delivery.itemVerification?.pickupImage?.url ? (
                          <TouchableOpacity
                            style={styles.comparisonCol}
                            onPress={() => setInspectImageUrl(getDeliveryImageUrl(delivery.itemVerification?.pickupImage?.url, token))}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.comparisonLabel}>Pickup Photo</Text>
                            <Image
                              source={{ uri: getDeliveryImageUrl(delivery.itemVerification?.pickupImage?.url, token) }}
                              style={styles.comparisonThumb}
                            />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  ) : (
                    /* CASE C: VERIFICATION IN PROGRESS (CAPTURE & CONFIRM/REPORT) */
                    <View style={styles.verificationActiveBox}>
                      <View style={styles.sideBySideRow}>
                        {/* Reference Photo Column */}
                        <TouchableOpacity
                          style={styles.comparisonCol}
                          onPress={() => {
                            const url = delivery.itemPhoto || delivery.itemVerification?.originalImage?.url;
                            if (url) setInspectImageUrl(getDeliveryImageUrl(url, token));
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.comparisonLabel}>1. Customer Reference</Text>
                          {delivery.itemPhoto || delivery.itemVerification?.originalImage?.url ? (
                            <Image
                              source={{ uri: getDeliveryImageUrl(delivery.itemPhoto || delivery.itemVerification?.originalImage?.url, token) }}
                              style={styles.comparisonThumb}
                            />
                          ) : (
                            <View style={styles.emptyThumb}>
                              <Text style={styles.emptyThumbText}>No photo provided</Text>
                            </View>
                          )}
                          <View style={styles.tapToInspectPill}>
                            <Eye size={10} color="#ffffff" />
                            <Text style={styles.tapToInspectText}>Tap to Inspect</Text>
                          </View>
                        </TouchableOpacity>

                        {/* Actual Pickup Photo Column */}
                        <View style={styles.comparisonCol}>
                          <Text style={styles.comparisonLabel}>2. Actual Item Photo</Text>
                          {pickupPhotoLocalUri ? (
                            <TouchableOpacity
                              onPress={() => setInspectImageUrl(pickupPhotoLocalUri)}
                              style={{ width: '100%', height: 110 }}
                              activeOpacity={0.8}
                            >
                              <Image source={{ uri: pickupPhotoLocalUri }} style={styles.comparisonThumb} />
                              {uploadingPickupPhoto ? (
                                <View style={styles.thumbUploadingOverlay}>
                                  <ActivityIndicator size="small" color="#ffffff" />
                                </View>
                              ) : null}
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.emptyThumbPlaceholder}>
                              <Camera size={24} color="#94a3b8" />
                              <Text style={styles.placeholderThumbText}>Capture photo at pickup</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Photo Capture & Retake Buttons */}
                      <View style={styles.captureBtnRow}>
                        <TouchableOpacity
                          style={styles.captureBtn}
                          onPress={() => handlePickPickupPhoto(true)}
                          disabled={submittingVerification}
                          activeOpacity={0.8}
                        >
                          <Camera size={15} color="#ffffff" />
                          <Text style={styles.captureBtnText}>
                            {pickupPhotoLocalUri ? 'Retake Photo' : 'Capture Item Photo'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.galleryBtn}
                          onPress={() => handlePickPickupPhoto(false)}
                          disabled={submittingVerification}
                          activeOpacity={0.8}
                        >
                          <ImageIcon size={15} color={colors.brand[700]} />
                          <Text style={styles.galleryBtnText}>Gallery</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Decision Actions */}
                      <View style={styles.decisionActionRow}>
                        <TouchableOpacity
                          style={[
                            styles.confirmMatchBtn,
                            (!pickupPhotoLocalUri || submittingVerification) && styles.btnDisabled,
                          ]}
                          onPress={handleConfirmMatch}
                          disabled={!pickupPhotoLocalUri || submittingVerification}
                          activeOpacity={0.8}
                        >
                          {submittingVerification ? (
                            <ActivityIndicator color="#ffffff" size="small" />
                          ) : (
                            <>
                              <CheckCheck size={16} color="#ffffff" />
                              <Text style={styles.confirmMatchBtnText}>Confirm Match</Text>
                            </>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.reportMismatchBtn}
                          onPress={() => setMismatchModalVisible(true)}
                          disabled={submittingVerification}
                          activeOpacity={0.8}
                        >
                          <AlertTriangle size={15} color="#DC2626" />
                          <Text style={styles.reportMismatchBtnText}>Report Mismatch</Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.lockedNotice}>
                        🔒 Recipient collection OTP is locked until item match is confirmed.
                      </Text>
                    </View>
                  )}

                  {/* RECIPIENT OTP: ONLY VISIBLE WHEN VERIFIED AND NOT MISMATCH */}
                  {isVerified && !isMismatch && (
                    <View style={styles.otpSection}>
                      <View style={styles.otpHeader}>
                        <ShieldCheck size={18} color={colors.brand[600]} />
                        <Text style={styles.otpTitle}>Enter 4-Digit Recipient OTP</Text>
                      </View>
                      <Text style={styles.otpHelper}>
                        Ask the recipient (who holds the product) for the 4-digit code to authorize collection.
                      </Text>

                      {delivery.devRecipientOtp ? (
                        <View style={styles.devTestPill}>
                          <Text style={styles.devTestPillText}>Dev Test Code: {delivery.devRecipientOtp}</Text>
                        </View>
                      ) : null}

                      <TextInput
                        style={styles.otpInput}
                        value={otpInput}
                        onChangeText={setOtpInput}
                        placeholder="• • • •"
                        placeholderTextColor="#9ca3af"
                        keyboardType="number-pad"
                        maxLength={4}
                        textAlign="center"
                        autoFocus
                      />

                      <TouchableOpacity
                        style={[
                          styles.primaryActionBtn,
                          otpInput.trim().length !== 4 && styles.btnDisabled,
                        ]}
                        onPress={handleVerifyPickupOTP}
                        disabled={submittingAction || otpInput.trim().length !== 4}
                        activeOpacity={0.8}
                      >
                        {submittingAction ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <>
                            <ShieldCheck size={18} color="#ffffff" />
                            <Text style={styles.primaryActionText}>Verify Recipient OTP & Collect</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </Card>
          </SlideUp>
        )}

        {/* STAGE 3: PICKED UP SUMMARY & START TRANSIT TO SENDER */}
        {isPickedUp && (
          <SlideUp delay={100}>
            <Card style={styles.transitCard}>
              <View style={styles.badgeRow}>
                <CheckCircle2 size={18} color="#16a34a" />
                <Text style={styles.transitTitle}>Product Collected From Recipient</Text>
              </View>
              <Text style={styles.transitSub}>
                You have verified the Recipient OTP. Destination is now changed to the Sender location ({delivery.drop?.contactName}).
              </Text>

              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={handleStartTransit}
                disabled={submittingAction}
                activeOpacity={0.8}
              >
                {submittingAction ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Navigation size={18} color="#ffffff" />
                    <Text style={styles.primaryActionText}>Start Transit to Sender</Text>
                  </>
                )}
              </TouchableOpacity>
            </Card>
          </SlideUp>
        )}

        {/* STAGE 4: SENDER CARD & SENDER DELIVERY OTP VERIFICATION */}
        {(isPickedUp || isInTransit) && (
          <SlideUp delay={120}>
            <Card style={styles.partyCard}>
              <View style={styles.partyHeader}>
                <View style={styles.badgeRow}>
                  <View style={[styles.dot, { backgroundColor: '#dc2626' }]} />
                  <Text style={styles.partyRole}>2. DELIVER TO (SENDER)</Text>
                </View>
                <TouchableOpacity
                  style={styles.mapAction}
                  onPress={() =>
                    handleOpenMaps(
                      delivery.drop?.address,
                      delivery.drop?.coordinates?.lat,
                      delivery.drop?.coordinates?.lng
                    )
                  }
                >
                  <Navigation size={14} color={colors.brand[600]} />
                  <Text style={styles.mapActionText}>Map</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.partyName}>{delivery.drop?.contactName || 'Sender'}</Text>
              <Text style={styles.partyAddress}>{delivery.drop?.address}</Text>

              {delivery.drop?.landmark ? (
                <Text style={styles.partyLandmark}>
                  Landmark: {delivery.drop.landmark}
                </Text>
              ) : null}

              {delivery.recipientNotes ? (
                <View style={styles.notesBox}>
                  <AlertCircle size={14} color="#d97706" />
                  <Text style={styles.notesText}>{delivery.recipientNotes}</Text>
                </View>
              ) : null}

              <View style={styles.partyActions}>
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => handleCall(delivery.drop?.contactPhone)}
                  activeOpacity={0.8}
                >
                  <Phone size={16} color="#ffffff" />
                  <Text style={styles.callButtonText}>Call Sender</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() =>
                    handleOpenMaps(
                      delivery.drop?.address,
                      delivery.drop?.coordinates?.lat,
                      delivery.drop?.coordinates?.lng
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Navigation size={16} color={colors.brand[700]} />
                  <Text style={styles.navButtonText}>Directions to Sender</Text>
                </TouchableOpacity>
              </View>

              {/* ACTION FOR STAGE 4: 4-DIGIT SENDER DELIVERY OTP INPUT */}
              {isInTransit && (
                <View style={styles.otpSection}>
                  <View style={styles.otpHeader}>
                    <ShieldCheck size={18} color="#16a34a" />
                    <Text style={styles.otpTitle}>Enter 4-Digit Sender Delivery OTP</Text>
                  </View>
                  <Text style={styles.otpHelper}>
                    Ask the sender (receiving the product) for the 4-digit code displayed on their app.
                  </Text>

                  <TextInput
                    style={styles.otpInput}
                    value={otpInput}
                    onChangeText={setOtpInput}
                    placeholder="• • • •"
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                    maxLength={4}
                    textAlign="center"
                  />

                  <TouchableOpacity
                    style={[
                      styles.successActionBtn,
                      otpInput.trim().length !== 4 && styles.btnDisabled,
                    ]}
                    onPress={handleVerifyDeliveryOTP}
                    disabled={submittingAction || otpInput.trim().length !== 4}
                    activeOpacity={0.8}
                  >
                    {submittingAction ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <CheckCircle2 size={18} color="#ffffff" />
                        <Text style={styles.primaryActionText}>Verify Sender OTP & Complete Delivery</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          </SlideUp>
        )}

        {/* PACKAGE DETAILS ACCORDION */}
        <SlideUp delay={140}>
          <Card style={styles.packageCard}>
            <Text style={styles.sectionHeaderTitle}>Package & Fare Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{delivery.category}</Text>
            </View>

            {delivery.description ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{delivery.description}</Text>
              </View>
            ) : null}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Estimated Distance</Text>
              <Text style={styles.detailValue}>{delivery.distance || 3.5} km</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Est. Trip Time</Text>
              <Text style={styles.detailValue}>{delivery.duration || 15} mins</Text>
            </View>

            <View style={[styles.detailRow, { borderBottomWidth: 0, paddingTop: 12 }]}>
              <Text style={[styles.detailLabel, { fontWeight: '700', color: colors.neutral[900] }]}>
                Partner Earnings
              </Text>
              <Text style={[styles.detailValue, { fontWeight: '800', color: '#16a34a', fontSize: 16 }]}>
                ₹{delivery.fare?.total ?? 0}
              </Text>
            </View>
          </Card>
        </SlideUp>
      </ScrollView>

      {/* Mismatch Reporting Modal */}
      <Modal
        visible={mismatchModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setMismatchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20} color="#DC2626" />
                <Text style={styles.modalTitle}>Report Item Mismatch</Text>
              </View>
              <TouchableOpacity
                onPress={() => setMismatchModalVisible(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <X size={18} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.mismatchFormScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.mismatchSubtitle}>
                Reporting a mismatch will pause this order and notify customer support. Select the primary reason below:
              </Text>

              {/* Reason Selector Chips */}
              <View style={styles.reasonChipsWrap}>
                {[
                  { id: 'WRONG_ITEM', label: 'Different item completely' },
                  { id: 'DAMAGED_ITEM', label: 'Item is damaged or broken' },
                  { id: 'DIFFERENT_SIZE_WEIGHT', label: 'Size or weight differs' },
                  { id: 'SUSPICIOUS_PACKAGE', label: 'Prohibited / Suspicious package' },
                  { id: 'OTHER', label: 'Other discrepancy' },
                ].map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.reasonChip,
                      mismatchReason === r.id && styles.reasonChipSelected,
                    ]}
                    onPress={() => setMismatchReason(r.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.reasonChipText,
                        mismatchReason === r.id && styles.reasonChipTextSelected,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notes Input */}
              <Text style={styles.inputLabel}>Additional Notes / Explanation</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={mismatchNotes}
                onChangeText={setMismatchNotes}
                placeholder="Describe what is different or wrong about the item..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
              />

              {/* Evidence Photo */}
              <Text style={styles.inputLabel}>Supporting Evidence Photograph (Optional)</Text>
              {mismatchEvidenceUri ? (
                <View style={styles.evidencePreviewBox}>
                  <Image source={{ uri: mismatchEvidenceUri }} style={styles.evidenceImage} />
                  <TouchableOpacity
                    style={styles.removeEvidenceBtn}
                    onPress={() => {
                      setMismatchEvidenceUri(null);
                      setMismatchEvidenceBase64(null);
                    }}
                  >
                    <X size={14} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pickEvidenceBtn}
                  onPress={handlePickEvidence}
                  activeOpacity={0.8}
                >
                  <Camera size={16} color={colors.brand[700]} />
                  <Text style={styles.pickEvidenceText}>Take Evidence Photo</Text>
                </TouchableOpacity>
              )}

              {/* Action Buttons */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => setMismatchModalVisible(false)}
                  disabled={submittingMismatch}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitMismatchBtn, submittingMismatch && styles.btnDisabled]}
                  onPress={handleSubmitMismatch}
                  disabled={submittingMismatch}
                  activeOpacity={0.8}
                >
                  {submittingMismatch ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <AlertTriangle size={16} color="#ffffff" />
                      <Text style={styles.submitMismatchText}>Submit Report</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Image Inspection Modal */}
      <Modal
        visible={Boolean(inspectImageUrl)}
        animationType="fade"
        transparent
        onRequestClose={() => setInspectImageUrl(null)}
      >
        <View style={styles.inspectOverlay}>
          <View style={styles.inspectContent}>
            <View style={styles.inspectTopBar}>
              <Text style={styles.inspectTopBarTitle}>Inspect Item Photograph</Text>
              <TouchableOpacity
                onPress={() => setInspectImageUrl(null)}
                style={styles.inspectCloseBtn}
                activeOpacity={0.7}
              >
                <X size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
            {inspectImageUrl ? (
              <Image
                source={{ uri: inspectImageUrl }}
                style={styles.inspectFullImage}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', gap: 12 },
  loadingText: { fontSize: 14, color: colors.neutral[600], fontWeight: '600' },

  topBar: {
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
  helpBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  barTitle: { fontSize: 16, fontWeight: '800', color: colors.neutral[900] },
  barSub: { fontSize: 11, fontFamily: 'monospace', color: colors.neutral[400] },

  scrollContent: { padding: 16, paddingBottom: 60, gap: 14 },

  // Progress Tracker
  trackerWrap: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  trackerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepCol: { alignItems: 'center', gap: 4, minWidth: 44 },
  stepCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  stepCircleDone: { backgroundColor: colors.brand[600] },
  stepCircleInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#94a3b8' },
  stepLabel: { fontSize: 9, fontWeight: '600', color: '#94a3b8', textAlign: 'center' },
  stepLabelDone: { color: colors.brand[700], fontWeight: '700' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e2e8f0', marginBottom: 16, marginHorizontal: 2 },
  stepLineDone: { backgroundColor: colors.brand[600] },

  // Stage Banner
  stageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  stageIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageBannerTitle: { fontSize: 14, fontWeight: '800', color: '#1e40af' },
  stageBannerSub: { fontSize: 12, color: '#3b82f6', marginTop: 2, lineHeight: 16 },

  // Live Navigation Target
  mapTargetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
  },
  mapTargetIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTargetHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.8,
  },
  mapTargetAddress: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
    lineHeight: 18,
  },
  mapTargetContact: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  devTestPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  devTestPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
  },

  // Parties
  partyCard: { padding: 16, borderRadius: 18, gap: 8 },
  partyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  partyRole: { fontSize: 11, fontWeight: '800', color: colors.neutral[500], letterSpacing: 0.6 },
  mapAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.brand[50],
  },
  mapActionText: { fontSize: 11, fontWeight: '700', color: colors.brand[700] },
  partyName: { fontSize: 17, fontWeight: '800', color: colors.neutral[900] },
  partyAddress: { fontSize: 13, color: colors.neutral[600], lineHeight: 18 },
  partyLandmark: { fontSize: 12, color: colors.neutral[400], fontStyle: 'italic' },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  notesText: { fontSize: 12, color: '#b45309', flex: 1 },

  partyActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand[600],
    paddingVertical: 10,
    borderRadius: 12,
  },
  callButtonText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 12,
  },
  navButtonText: { fontSize: 13, fontWeight: '700', color: colors.neutral[800] },

  // Stage Action & OTP
  stageActionBox: { marginTop: 8 },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand[600],
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: colors.brand[500],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  successActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  btnDisabled: { opacity: 0.5 },
  primaryActionText: { fontSize: 15, fontWeight: '800', color: '#ffffff' },

  otpSection: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 10,
  },
  otpHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  otpTitle: { fontSize: 14, fontWeight: '800', color: colors.neutral[900] },
  otpHelper: { fontSize: 12, color: colors.neutral[500], lineHeight: 16 },
  otpInput: {
    height: 52,
    borderWidth: 2,
    borderColor: colors.brand[200],
    borderRadius: 14,
    fontSize: 24,
    fontWeight: '800',
    color: colors.neutral[900],
    letterSpacing: 12,
    backgroundColor: '#ffffff',
  },

  // Transit
  transitCard: { padding: 18, borderRadius: 18, gap: 10, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1.5 },
  transitTitle: { fontSize: 15, fontWeight: '800', color: '#15803d' },
  transitSub: { fontSize: 13, color: '#166534', lineHeight: 18 },

  // Completed State
  completedCard: { padding: 24, alignItems: 'center', borderRadius: 20, backgroundColor: '#ffffff', gap: 12 },
  completedBadge: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  completedTitle: { fontSize: 22, fontWeight: '800', color: colors.neutral[900] },
  completedSub: { fontSize: 13, color: colors.neutral[500], textAlign: 'center' },
  earningHighlight: {
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    marginVertical: 4,
  },
  earningHighlightLabel: { fontSize: 11, fontWeight: '700', color: '#15803d', letterSpacing: 0.6 },
  earningHighlightVal: { fontSize: 28, fontWeight: '800', color: '#15803d', marginTop: 2 },
  finishBtn: {
    backgroundColor: colors.brand[600],
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  finishBtnText: { fontSize: 15, fontWeight: '800', color: '#ffffff' },

  // Package Card
  packageCard: { padding: 16, borderRadius: 18, gap: 10 },
  sectionHeaderTitle: { fontSize: 15, fontWeight: '800', color: colors.neutral[900], marginBottom: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  detailLabel: { fontSize: 13, color: colors.neutral[500] },
  detailValue: { fontSize: 13, fontWeight: '600', color: colors.neutral[800] },

  // Empty
  emptyContainer: { flex: 1, backgroundColor: '#f8fafc' },
  emptyBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyIconCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.neutral[900] },
  emptySub: { fontSize: 13, color: colors.neutral[500], textAlign: 'center', lineHeight: 18 },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brand[600],
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 12,
  },
  browseBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },

  // Stage Banner Mismatch
  stageBannerMismatch: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  stageIconWrapMismatch: {
    backgroundColor: '#fee2e2',
  },
  stageBannerTitleMismatch: {
    color: '#991b1b',
  },
  stageBannerSubMismatch: {
    color: '#b91c1c',
  },

  // Verification Section
  verificationSection: {
    gap: 10,
    marginTop: 6,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.neutral[900],
  },
  verificationHelper: {
    fontSize: 12,
    color: colors.neutral[500],
    lineHeight: 16,
  },
  itemMetaBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 2,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brand[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand[700],
  },
  handlingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  handlingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },

  // Mismatch Alert Box
  mismatchAlertBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    gap: 6,
  },
  mismatchAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mismatchAlertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991b1b',
  },
  mismatchAlertBody: {
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '600',
  },
  mismatchAlertNotes: {
    fontSize: 12,
    color: '#7f1d1d',
    fontStyle: 'italic',
  },
  mismatchAlertLockText: {
    fontSize: 11,
    color: '#991b1b',
    fontWeight: '700',
    marginTop: 4,
  },

  // Verified Box
  verifiedSuccessBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#86efac',
    gap: 8,
  },
  verifiedSuccessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedSuccessTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803d',
  },
  verifiedSuccessSub: {
    fontSize: 11,
    color: '#166534',
  },

  // Verification Active
  verificationActiveBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 10,
  },
  sideBySideRow: {
    flexDirection: 'row',
    gap: 10,
  },
  comparisonCol: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    gap: 4,
  },
  comparisonLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.neutral[600],
    textAlign: 'center',
  },
  comparisonThumb: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  emptyThumb: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  emptyThumbText: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
  },
  emptyThumbPlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  placeholderThumbText: {
    fontSize: 9,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '600',
  },
  tapToInspectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.brand[600],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 2,
  },
  tapToInspectText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: '700',
  },
  thumbUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Buttons in verification
  captureBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  captureBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brand[600],
    paddingVertical: 10,
    borderRadius: 10,
  },
  captureBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  galleryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brand[50],
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brand[200],
  },
  galleryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand[700],
  },
  decisionActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  confirmMatchBtn: {
    flex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 11,
    borderRadius: 10,
  },
  confirmMatchBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  reportMismatchBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  reportMismatchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  lockedNotice: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 18,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral[900],
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mismatchFormScroll: {
    gap: 10,
    paddingBottom: 20,
  },
  mismatchSubtitle: {
    fontSize: 12,
    color: colors.neutral[600],
    lineHeight: 16,
  },
  reasonChipsWrap: {
    gap: 6,
    marginVertical: 4,
  },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reasonChipSelected: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  reasonChipText: {
    fontSize: 12,
    color: colors.neutral[700],
    fontWeight: '600',
  },
  reasonChipTextSelected: {
    color: '#dc2626',
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral[700],
    marginTop: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.neutral[800],
    backgroundColor: '#f8fafc',
  },
  modalTextArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  evidencePreviewBox: {
    position: 'relative',
    width: '100%',
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeEvidenceBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickEvidenceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.brand[200],
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: colors.brand[50],
  },
  pickEvidenceText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand[700],
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  cancelModalText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[600],
  },
  submitMismatchBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#dc2626',
  },
  submitMismatchText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Inspect Overlay
  inspectOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  inspectContent: {
    width: '100%',
    height: '80%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inspectTopBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  inspectTopBarTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  inspectCloseBtn: {
    padding: 6,
  },
  inspectFullImage: {
    width: '100%',
    flex: 1,
  },
});

