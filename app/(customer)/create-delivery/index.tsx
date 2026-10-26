import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ExpoLocation from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Package,
  Bookmark,
  CheckCircle2,
  X,
  ChevronRight,
  ShieldCheck,
  Zap,
  Crosshair,
  AlertTriangle,
  Camera,
  UploadCloud,
  Trash2,
  RotateCcw,
  Image as ImageIcon,
} from 'lucide-react-native';
import { useAppSelector } from '../../../src/hooks/useAppSelector';
import { profileService, SavedAddress } from '../../../src/services/profile.service';
import { deliveryService, DeliveryFare } from '../../../src/services/delivery.service';
import { apiClient } from '../../../src/services/api.service';
import { colors } from '../../../src/theme';
import { showToast } from '../../../src/utils/toast';
import { GuestAuthPrompt } from '../../../src/components/auth/GuestAuthPrompt';

export default function CreateDeliveryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authUser = useAppSelector((s) => s.auth.user);
  const isGuest = useAppSelector((s) => s.auth.isGuest);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressPickerTarget, setAddressPickerTarget] = useState<'recipient' | 'sender' | null>(null);

  // Recipient / Product Collection details (Initial Destination - partner collects from here)
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientContactName, setRecipientContactName] = useState('');
  const [recipientContactPhone, setRecipientContactPhone] = useState('');
  const [recipientCoordinates, setRecipientCoordinates] = useState({ lat: 12.9716, lng: 79.1585 });

  // Sender / Final Delivery details (Final Destination - partner delivers to customer here)
  const [senderAddress, setSenderAddress] = useState('');
  const [senderCity, setSenderCity] = useState('Vellore');
  const [senderState, setSenderState] = useState('Tamil Nadu');
  const [senderPincode, setSenderPincode] = useState('');
  const [senderContactName, setSenderContactName] = useState(authUser?.name || '');
  const [senderContactPhone, setSenderContactPhone] = useState(authUser?.phone || '');
  const [senderCoordinates, setSenderCoordinates] = useState({ lat: 12.9785, lng: 79.1620 });

  // Package details
  const params = useLocalSearchParams<{ category?: string }>();
  const [weight, setWeight] = useState(2);
  const [packageType, setPackageType] = useState<'DOCUMENT' | 'ELECTRONICS' | 'CLOTHES' | 'FOOD' | 'OTHER'>('DOCUMENT');
  const [description, setDescription] = useState('');

  // Product & Verification details (Mandatory)
  const [itemName, setItemName] = useState('');
  const [handlingInstructions, setHandlingInstructions] = useState('');
  const [itemPhotoUri, setItemPhotoUri] = useState<string | null>(null);
  const [itemPhotoBase64, setItemPhotoBase64] = useState<string | null>(null);
  const [uploadedItemPhotoUrl, setUploadedItemPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Auto-apply category passed via navigation query
  useEffect(() => {
    if (params.category) {
      const cat = String(params.category).toUpperCase();
      if (cat.includes('DOC')) setPackageType('DOCUMENT');
      else if (cat.includes('FOOD')) setPackageType('FOOD');
      else if (cat.includes('CLOTH')) setPackageType('CLOTHES');
      else if (cat.includes('ELECT')) setPackageType('ELECTRONICS');
      else {
        setPackageType('OTHER');
        if (cat.includes('GIFT') && !description) setDescription('Gift package');
        else if (cat.includes('BOOK') && !description) setDescription('Books & documents');
        else if (cat.includes('PARCEL') && !description) setDescription('Boxed parcel');
      }
    }
  }, [params.category]);

  // Fare & submission states
  const [creating, setCreating] = useState(false);
  const [estimatedFare, setEstimatedFare] = useState<number>(49);
  const [fareBreakdown, setFareBreakdown] = useState<(DeliveryFare & { distance?: number; duration?: number }) | null>(null);
  const [fareLoading, setFareLoading] = useState(false);
  const [gpsLoadingTarget, setGpsLoadingTarget] = useState<'recipient' | 'sender' | null>(null);

  useEffect(() => {
    const loadAddresses = async () => {
      if (isGuest || !authUser) return;
      try {
        const list = await profileService.getAddresses();
        setSavedAddresses(list);
        const defaultAddr = list.find((a) => a.isDefault);
        if (defaultAddr && !senderAddress) {
          setSenderAddress(defaultAddr.address);
          if (defaultAddr.city) setSenderCity(defaultAddr.city);
          if (defaultAddr.state) setSenderState(defaultAddr.state);
          if (defaultAddr.pincode) setSenderPincode(defaultAddr.pincode);
          const lat = defaultAddr.latitude ?? defaultAddr.coordinates?.lat ?? defaultAddr.coordinates?.latitude;
          const lng = defaultAddr.longitude ?? defaultAddr.coordinates?.lng ?? defaultAddr.coordinates?.longitude;
          if (typeof lat === 'number' && typeof lng === 'number') {
            setSenderCoordinates({ lat, lng });
          }
        }
      } catch {}
    };
    loadAddresses();
  }, [isGuest, authUser]);

  // Recalculate dynamic fare whenever coordinates or weight change
  useEffect(() => {
    let active = true;
    const fetchFare = async () => {
      setFareLoading(true);
      try {
        const fare = await deliveryService.calculateFare(recipientCoordinates, senderCoordinates, weight);
        if (active && fare) {
          setEstimatedFare(fare.total);
          setFareBreakdown(fare);
        }
      } catch {
        // Fallback default
      } finally {
        if (active) setFareLoading(false);
      }
    };
    fetchFare();
    return () => {
      active = false;
    };
  }, [recipientCoordinates, senderCoordinates, weight]);

  const handleUseCurrentLocation = async (target: 'recipient' | 'sender') => {
    setGpsLoadingTarget(target);
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('error', 'Permission Denied', 'Please grant location permissions to detect your position.');
        return;
      }

      const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      if (target === 'recipient') {
        setRecipientCoordinates({ lat, lng });
      } else {
        setSenderCoordinates({ lat, lng });
      }

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          const road = [data.address?.house_number, data.address?.road, data.address?.suburb].filter(Boolean).join(', ');
          const fullAddr = road || data.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
          if (target === 'recipient') {
            setRecipientAddress(fullAddr);
          } else {
            setSenderAddress(fullAddr);
            if (data.address?.city || data.address?.town) setSenderCity(data.address.city || data.address.town);
            if (data.address?.state) setSenderState(data.address.state);
            if (data.address?.postcode) setSenderPincode(data.address.postcode);
          }
        }
      } catch {
        if (target === 'recipient' && !recipientAddress) {
          setRecipientAddress(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } else if (target === 'sender' && !senderAddress) {
          setSenderAddress(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      }
      showToast('success', 'Location Detected', 'Coordinates and location updated from GPS.');
    } catch {
      showToast('error', 'Location Error', 'Could not detect current location.');
    } finally {
      setGpsLoadingTarget(null);
    }
  };

  const selectAddress = (addr: SavedAddress) => {
    const lat = addr.latitude ?? addr.coordinates?.lat ?? addr.coordinates?.latitude;
    const lng = addr.longitude ?? addr.coordinates?.lng ?? addr.coordinates?.longitude;
    const hasCoords = typeof lat === 'number' && typeof lng === 'number';

    if (addressPickerTarget === 'recipient') {
      setRecipientAddress(addr.address);
      if (hasCoords) {
        setRecipientCoordinates({ lat, lng });
      }
    } else if (addressPickerTarget === 'sender') {
      setSenderAddress(addr.address);
      if (addr.city) setSenderCity(addr.city);
      if (addr.state) setSenderState(addr.state);
      if (addr.pincode) setSenderPincode(addr.pincode);
      if (hasCoords) {
        setSenderCoordinates({ lat, lng });
      }
    }
    setAddressPickerTarget(null);
  };

  const handlePickImage = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          showToast('error', 'Camera Permission', 'Please grant camera access to photograph your item.');
          return;
        }
        const res = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          base64: true,
        });
        if (!res.canceled && res.assets && res.assets[0]) {
          await processSelectedPhoto(res.assets[0]);
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showToast('error', 'Gallery Permission', 'Please grant photo gallery access to select item photograph.');
          return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          base64: true,
        });
        if (!res.canceled && res.assets && res.assets[0]) {
          await processSelectedPhoto(res.assets[0]);
        }
      }
    } catch {
      showToast('error', 'Photo Picker Error', 'Could not access camera or gallery.');
    }
  };

  const processSelectedPhoto = async (asset: ImagePicker.ImagePickerAsset) => {
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      showToast('error', 'File Too Large', 'Product photograph must be under 10MB.');
      return;
    }
    const dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
    setItemPhotoUri(asset.uri);
    setItemPhotoBase64(dataUri);
    setUploadedItemPhotoUrl(null);

    setUploadingPhoto(true);
    try {
      const url = await deliveryService.uploadImage(dataUri, 'item_product');
      setUploadedItemPhotoUrl(url);
      showToast('success', 'Photo Uploaded', 'Product photograph uploaded and verified.');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to upload photograph. Will retry on submission.';
      showToast('error', 'Upload Note', msg);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setItemPhotoUri(null);
    setItemPhotoBase64(null);
    setUploadedItemPhotoUrl(null);
  };

  const handleCreateDelivery = async () => {
    if (isGuest || !authUser) {
      setShowAuthModal(true);
      return;
    }
    if (!recipientAddress.trim()) {
      showToast('error', 'Missing Recipient Location', 'Please enter where the product must be collected from.');
      return;
    }
    if (!recipientContactPhone.trim()) {
      showToast('error', 'Missing Recipient Phone', 'Please provide recipient phone number for collection verification.');
      return;
    }
    if (!senderAddress.trim()) {
      showToast('error', 'Missing Delivery Destination', 'Please enter your delivery destination address.');
      return;
    }
    if (!senderContactPhone.trim()) {
      showToast('error', 'Missing Contact', 'Please provide your contact phone number for handover.');
      return;
    }
    if (!itemName.trim()) {
      showToast('error', 'Missing Product Name', 'Please enter the item name before booking.');
      return;
    }
    if (!uploadedItemPhotoUrl && !itemPhotoBase64) {
      showToast('error', 'Item Photo Required', 'A clear photograph of the product is mandatory for pickup verification.');
      return;
    }

    setCreating(true);
    try {
      let finalPhotoUrl = uploadedItemPhotoUrl;
      if (!finalPhotoUrl && itemPhotoBase64) {
        setUploadingPhoto(true);
        try {
          finalPhotoUrl = await deliveryService.uploadImage(itemPhotoBase64, 'item_product');
          setUploadedItemPhotoUrl(finalPhotoUrl);
        } catch (err: any) {
          const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to upload item photograph.';
          showToast('error', 'Upload Error', msg);
          setCreating(false);
          setUploadingPhoto(false);
          return;
        } finally {
          setUploadingPhoto(false);
        }
      }

      const fullSenderAddress = [
        senderAddress.trim(),
        senderCity.trim() ? senderCity.trim() : null,
        senderState.trim() ? senderState.trim() : null,
        senderPincode.trim() ? senderPincode.trim() : null,
      ].filter(Boolean).join(', ');

      // H2H WORKFLOW:
      // pickup = Recipient location & contact (where partner collects product first)
      // drop = Sender location & contact (where partner brings product to user)
      const payload = {
        pickup: {
          address: recipientAddress.trim(),
          contactName: recipientContactName.trim() || 'Recipient',
          contactPhone: recipientContactPhone.trim(),
          coordinates: recipientCoordinates,
        },
        drop: {
          address: fullSenderAddress,
          contactName: senderContactName.trim() || authUser?.name || 'Customer',
          contactPhone: senderContactPhone.trim() || authUser?.phone || '9876543210',
          coordinates: senderCoordinates,
        },
        packageDetails: {
          type: packageType,
          description: description.trim() || itemName.trim() || 'Package handover',
          weight,
        },
        category: packageType === 'DOCUMENT' ? 'DOCUMENTS' : packageType === 'FOOD' ? 'FOOD' : packageType === 'CLOTHES' ? 'CLOTHES' : 'PARCEL',
        weight,
        itemName: itemName.trim(),
        handlingInstructions: handlingInstructions.trim() || undefined,
        itemPhoto: finalPhotoUrl,
      };

      await apiClient.post('/deliveries', payload);
      showToast('success', 'Order Created', 'Delivery order placed! Delivery partner will collect from Recipient.');
      router.replace('/(customer)/deliveries');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err.message || 'Failed to create delivery.';
      showToast('error', 'Booking Error', msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header with explicit back navigation to /deliveries */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/(customer)/deliveries')}
          activeOpacity={0.7}
          accessibilityLabel="Back to Deliveries"
        >
          <ArrowLeft size={18} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Create Delivery Order</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 140 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: Recipient Location Card (Collection Point - Partner goes here first) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.locBadgePickup}>
              <MapPin size={15} color={colors.primary} />
              <Text style={styles.locBadgePickupText}>1. PRODUCT COLLECTION (RECIPIENT)</Text>
            </View>
            <View style={styles.headerActionsWrap}>
              <TouchableOpacity
                style={styles.gpsBtn}
                onPress={() => handleUseCurrentLocation('recipient')}
                disabled={gpsLoadingTarget === 'recipient'}
                activeOpacity={0.7}
              >
                {gpsLoadingTarget === 'recipient' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Crosshair size={13} color={colors.primary} />
                    <Text style={styles.gpsBtnText}>GPS</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.savedPickerBtn}
                onPress={() => {
                  if (isGuest || !authUser) {
                    setShowAuthModal(true);
                    return;
                  }
                  setAddressPickerTarget('recipient');
                }}
                activeOpacity={0.7}
              >
                <Bookmark size={13} color={colors.primary} />
                <Text style={styles.savedPickerBtnText}>Saved</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionSubtitle}>
            Where is the product right now? Partner visits this location FIRST to collect the product.
          </Text>

          <TextInput
            style={[styles.input, styles.textArea]}
            value={recipientAddress}
            onChangeText={setRecipientAddress}
            placeholder="Recipient collection address, house/building, street, area..."
            placeholderTextColor={colors.outline}
            multiline
            numberOfLines={2}
          />

          <View style={styles.inputStack}>
            <TextInput
              style={styles.input}
              value={recipientContactName}
              onChangeText={setRecipientContactName}
              placeholder="Recipient Name (Who holds the product) *"
              placeholderTextColor={colors.outline}
            />
            <TextInput
              style={styles.input}
              value={recipientContactPhone}
              onChangeText={setRecipientContactPhone}
              placeholder="Recipient Phone Number (For Collection OTP) *"
              placeholderTextColor={colors.outline}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Step 2: Sender Location Card (Final Destination - Partner brings to user) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.locBadgeDrop}>
              <Navigation size={15} color={colors.secondaryContainer} />
              <Text style={styles.locBadgeDropText}>2. FINAL DELIVERY DESTINATION (YOU / SENDER)</Text>
            </View>
            <View style={styles.headerActionsWrap}>
              <TouchableOpacity
                style={[styles.gpsBtn, { borderColor: '#FED7AA' }]}
                onPress={() => handleUseCurrentLocation('sender')}
                disabled={gpsLoadingTarget === 'sender'}
                activeOpacity={0.7}
              >
                {gpsLoadingTarget === 'sender' ? (
                  <ActivityIndicator size="small" color={colors.secondaryContainer} />
                ) : (
                  <>
                    <Crosshair size={13} color={colors.secondaryContainer} />
                    <Text style={[styles.gpsBtnText, { color: colors.secondaryContainer }]}>GPS</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.savedPickerBtn, { backgroundColor: '#FFF7ED' }]}
                onPress={() => {
                  if (isGuest || !authUser) {
                    setShowAuthModal(true);
                    return;
                  }
                  setAddressPickerTarget('sender');
                }}
                activeOpacity={0.7}
              >
                <Bookmark size={13} color={colors.secondaryContainer} />
                <Text style={[styles.savedPickerBtnText, { color: colors.secondaryContainer }]}>
                  Saved
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionSubtitle}>
            Where should the Delivery Partner bring your collected product?
          </Text>

          <TextInput
            style={[styles.input, styles.textArea]}
            value={senderAddress}
            onChangeText={setSenderAddress}
            placeholder="Your delivery destination address, flat no., street, area..."
            placeholderTextColor={colors.outline}
            multiline
            numberOfLines={2}
          />

          <View style={styles.inputStack}>
            <TextInput
              style={styles.input}
              value={senderContactName}
              onChangeText={setSenderContactName}
              placeholder="Your Name (Sender / Receiver) *"
              placeholderTextColor={colors.outline}
            />
            <TextInput
              style={styles.input}
              value={senderContactPhone}
              onChangeText={setSenderContactPhone}
              placeholder="Your Phone Number (For Handover OTP) *"
              placeholderTextColor={colors.outline}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              value={senderCity}
              onChangeText={setSenderCity}
              placeholder="City (e.g. Vellore)"
              placeholderTextColor={colors.outline}
            />
            <TextInput
              style={styles.input}
              value={senderState}
              onChangeText={setSenderState}
              placeholder="State (e.g. Tamil Nadu)"
              placeholderTextColor={colors.outline}
            />
            <TextInput
              style={styles.input}
              value={senderPincode}
              onChangeText={setSenderPincode}
              placeholder="Pincode (e.g. 632014)"
              placeholderTextColor={colors.outline}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Package Specifications */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PACKAGE DETAILS</Text>

          <View style={styles.chipsWrap}>
            {[
              { type: 'DOCUMENT', label: 'Documents / Keys' },
              { type: 'ELECTRONICS', label: 'Gadget / Charger' },
              { type: 'CLOTHES', label: 'Clothes / Bag' },
              { type: 'FOOD', label: 'Packed Lunch / Snacks' },
              { type: 'OTHER', label: 'Other Parcel' },
            ].map((t) => (
              <TouchableOpacity
                key={t.type}
                style={[styles.chip, packageType === t.type && styles.chipSelected]}
                onPress={() => setPackageType(t.type as any)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, packageType === t.type && styles.chipTextSelected]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Item description (e.g. Office keys, charger, tiffin)"
            placeholderTextColor={colors.outline}
          />

          {/* Prohibited items warning */}
          <View style={styles.prohibitedBox}>
            <AlertTriangle size={15} color="#D97706" style={{ marginTop: 2 }} />
            <Text style={styles.prohibitedText}>
              Flammables, chemicals, cash, contraband, and dangerous materials are strictly prohibited.
            </Text>
          </View>
        </View>

        {/* Step 3: Product Photograph & Verification (Mandatory) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.locBadgePickup}>
              <Camera size={15} color={colors.primary} />
              <Text style={styles.locBadgePickupText}>3. PRODUCT PHOTOGRAPH & DETAILS (MANDATORY)</Text>
            </View>
            {uploadedItemPhotoUrl ? (
              <View style={styles.verifiedBadge}>
                <CheckCircle2 size={12} color="#059669" />
                <Text style={styles.verifiedBadgeText}>Photo Ready</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.sectionSubtitle}>
            Take or upload a clear photo of the physical item. The delivery partner will verify this exact item before pickup OTP.
          </Text>

          <TextInput
            style={styles.input}
            value={itemName}
            onChangeText={setItemName}
            placeholder="Item Name (e.g. Sony Headphones, Blue Backpack, Keys) *"
            placeholderTextColor={colors.outline}
          />

          <TextInput
            style={styles.input}
            value={handlingInstructions}
            onChangeText={setHandlingInstructions}
            placeholder="Handling Instructions (e.g. Fragile, Keep upright, Handle with care)"
            placeholderTextColor={colors.outline}
          />

          {itemPhotoUri ? (
            <View style={styles.photoPreviewWrapper}>
              <Image source={{ uri: itemPhotoUri }} style={styles.photoPreviewImage} />
              {uploadingPhoto ? (
                <View style={styles.photoUploadingOverlay}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.photoUploadingText}>Uploading & Verifying...</Text>
                </View>
              ) : null}
              <View style={styles.photoActionRow}>
                <TouchableOpacity
                  style={styles.retakeBtn}
                  onPress={() => handlePickImage(true)}
                  disabled={uploadingPhoto}
                  activeOpacity={0.8}
                >
                  <RotateCcw size={13} color={colors.primary} />
                  <Text style={styles.retakeBtnText}>Retake Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={handleRemovePhoto}
                  disabled={uploadingPhoto}
                  activeOpacity={0.8}
                >
                  <Trash2 size={13} color="#DC2626" />
                  <Text style={styles.removePhotoBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.photoPickerButtonGroup}>
              <TouchableOpacity
                style={styles.photoPickBtnPrimary}
                onPress={() => handlePickImage(true)}
                activeOpacity={0.8}
              >
                <Camera size={16} color="#ffffff" />
                <Text style={styles.photoPickBtnPrimaryText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoPickBtnSecondary}
                onPress={() => handlePickImage(false)}
                activeOpacity={0.8}
              >
                <ImageIcon size={16} color={colors.primary} />
                <Text style={styles.photoPickBtnSecondaryText}>Choose Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Transparent Dynamic Fare Breakdown */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.speedPill}>
              <Zap size={14} color="#ffffff" />
              <Text style={styles.speedPillText}>Instant Handover Dispatch</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {fareLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.fareTotal}>₹{estimatedFare}</Text>
              )}
            </View>
          </View>

          {fareBreakdown ? (
            <View style={styles.fareBreakdownBox}>
              <View style={styles.fareLine}>
                <Text style={styles.fareLineLabel}>Base pickup fare</Text>
                <Text style={styles.fareLineValue}>₹{fareBreakdown.base}</Text>
              </View>
              {fareBreakdown.perKm > 0 ? (
                <View style={styles.fareLine}>
                  <Text style={styles.fareLineLabel}>
                    Distance charge ({fareBreakdown.distance ?? 0} km)
                  </Text>
                  <Text style={styles.fareLineValue}>₹{fareBreakdown.perKm}</Text>
                </View>
              ) : null}
              {fareBreakdown.weightCharge > 0 ? (
                <View style={styles.fareLine}>
                  <Text style={styles.fareLineLabel}>Weight fee ({weight} kg)</Text>
                  <Text style={styles.fareLineValue}>₹{fareBreakdown.weightCharge}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.summaryDesc}>
            Direct person-to-person delivery with 4-digit pickup & drop security OTPs.
          </Text>
        </View>

        {/* Book Button CTA */}
        <TouchableOpacity
          style={[styles.bookBtn, creating && styles.bookBtnDisabled]}
          onPress={handleCreateDelivery}
          disabled={creating}
          activeOpacity={0.8}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.bookBtnText}>Confirm & Book Delivery</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Saved Address Picker Modal */}
      <Modal
        visible={addressPickerTarget !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setAddressPickerTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {addressPickerTarget === 'recipient' ? 'Collection (Recipient)' : 'Delivery (Sender)'} Address
              </Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setAddressPickerTarget(null)}
                activeOpacity={0.7}
              >
                <X size={18} color={colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.addressPickerList}>
              {savedAddresses.length === 0 ? (
                <View style={styles.modalEmpty}>
                  <Text style={styles.modalEmptyText}>No saved addresses found.</Text>
                  <TouchableOpacity
                    style={styles.addAddressModalBtn}
                    onPress={() => {
                      setAddressPickerTarget(null);
                      router.push('/(customer)/profile/addresses');
                    }}
                  >
                    <Text style={styles.addAddressModalBtnText}>+ Add Address in Profile</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                savedAddresses.map((addr) => (
                  <TouchableOpacity
                    key={addr._id}
                    style={styles.pickerAddrCard}
                    onPress={() => selectAddress(addr)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.pickerAddrHeader}>
                      <Text style={styles.pickerAddrLabel}>{addr.label}</Text>
                      {addr.isDefault ? (
                        <View style={styles.defaultPill}>
                          <Text style={styles.defaultPillText}>Default</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.pickerAddrText}>{addr.address}</Text>
                    {[addr.landmark ? `Near ${addr.landmark}` : null, addr.city, addr.state, addr.pincode].filter(Boolean).length > 0 ? (
                      <Text style={styles.pickerAddrSub}>
                        {[addr.landmark ? `Near ${addr.landmark}` : null, addr.city, addr.state, addr.pincode]
                          .filter(Boolean)
                          .join(', ')}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <GuestAuthPrompt
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Create an account or sign in to book a delivery."
        description="You need an active customer account to place delivery orders and track your partner in real time."
      />
    </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  headerRightPlaceholder: {
    width: 36,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    gap: 12,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
    marginBottom: 4,
  },
  locBadgePickup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locBadgePickupText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  locBadgeDrop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locBadgeDropText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondaryContainer,
    letterSpacing: 0.5,
  },
  headerActionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  gpsBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  savedPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  savedPickerBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  inputStack: {
    gap: 8,
  },
  input: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    fontSize: 13,
    color: colors.onSurface,
  },
  textArea: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  prohibitedBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  prohibitedText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    lineHeight: 15,
  },
  summaryCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  speedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  fareTotal: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.onSurface,
  },
  fareBreakdownBox: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 10,
    padding: 8,
    gap: 4,
  },
  fareLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareLineLabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  fareLineValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurface,
  },
  summaryDesc: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
  bookBtn: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.secondaryContainer,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  bookBtnDisabled: {
    opacity: 0.6,
  },
  bookBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressPickerList: {
    padding: 14,
    gap: 10,
  },
  modalEmpty: {
    padding: 26,
    alignItems: 'center',
    gap: 10,
  },
  modalEmptyText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  addAddressModalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  addAddressModalBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  pickerAddrCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 14,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  pickerAddrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerAddrLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  defaultPill: {
    backgroundColor: '#e6f7ec',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  defaultPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.tertiary,
  },
  pickerAddrText: {
    fontSize: 12,
    color: colors.onSurface,
  },
  pickerAddrSub: {
    fontSize: 10,
    color: colors.outline,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  photoPickerButtonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  photoPickBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  photoPickBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  photoPickBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    paddingVertical: 12,
    borderRadius: 12,
  },
  photoPickBtnSecondaryText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  photoPreviewWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    marginTop: 4,
  },
  photoPreviewImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  photoUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  photoUploadingText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  photoActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 10,
    backgroundColor: colors.surfaceContainerLowest,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLow,
  },
  retakeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  removePhotoBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
});
