import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ExpoLocation from 'expo-location';
import {
  ArrowLeft,
  Plus,
  MapPin,
  Home,
  Briefcase,
  GraduationCap,
  Building,
  CheckCircle2,
  Trash2,
  Edit2,
  Star,
  AlertCircle,
  X,
  Crosshair,
} from 'lucide-react-native';
import { profileService, SavedAddress } from '../../../src/services/profile.service';
import { colors } from '../../../src/theme';
import { showToast } from '../../../src/utils/toast';
import { useAppSelector } from '../../../src/hooks/useAppSelector';
import { GuestAuthPrompt } from '../../../src/components/auth/GuestAuthPrompt';

const ADDRESS_TYPES: Array<{ type: 'Home' | 'Work' | 'College' | 'Other'; label: string; icon: any }> = [
  { type: 'Home', label: 'Home', icon: Home },
  { type: 'Work', label: 'Work', icon: Briefcase },
  { type: 'College', label: 'College', icon: GraduationCap },
  { type: 'Other', label: 'Other', icon: Building },
];

export default function SavedAddressesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authUser = useAppSelector((s) => s.auth.user);
  const isGuest = useAppSelector((s) => s.auth.isGuest);

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

  // Form states
  const [selectedType, setSelectedType] = useState<'Home' | 'Work' | 'College' | 'Other'>('Home');
  const [label, setLabel] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [city, setCity] = useState<string>('Vellore');
  const [stateName, setStateName] = useState<string>('Tamil Nadu');
  const [pincode, setPincode] = useState<string>('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [locationFeedback, setLocationFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [addressToDelete, setAddressToDelete] = useState<SavedAddress | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchAddresses = useCallback(async () => {
    if (isGuest || !authUser) {
      setLoading(false);
      return;
    }
    try {
      const list = await profileService.getAddresses();
      setAddresses(list);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const blurActiveElement = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const closeModal = () => {
    blurActiveElement();
    setModalVisible(false);
  };

  const openAddModal = () => {
    blurActiveElement();
    setEditingAddress(null);
    setSelectedType('Home');
    setLabel('Home');
    setAddress('');
    setLandmark('');
    setCity('Vellore');
    setStateName('Tamil Nadu');
    setPincode('');
    setLatitude('');
    setLongitude('');
    setLocationLoading(false);
    setLocationFeedback(null);
    setIsDefault(addresses.length === 0);
    setFormError(null);
    setModalVisible(true);
  };

  const openEditModal = (addr: SavedAddress) => {
    blurActiveElement();
    setEditingAddress(addr);
    setSelectedType(addr.type || 'Other');
    setLabel(addr.label);
    setAddress(addr.address);
    setLandmark(addr.landmark || '');
    setCity(addr.city || 'Vellore');
    setStateName(addr.state || 'Tamil Nadu');
    setPincode(addr.pincode || '');
    const lat = addr.latitude ?? addr.coordinates?.latitude ?? (addr.coordinates as any)?.lat;
    const lng = addr.longitude ?? addr.coordinates?.longitude ?? (addr.coordinates as any)?.lng;
    setLatitude(typeof lat === 'number' ? lat.toString() : '');
    setLongitude(typeof lng === 'number' ? lng.toString() : '');
    setLocationLoading(false);
    setLocationFeedback(null);
    setIsDefault(addr.isDefault);
    setFormError(null);
    setModalVisible(true);
  };

  const handleUseCurrentLocation = async () => {
    setLocationLoading(true);
    setLocationFeedback(null);
    setFormError(null);

    try {
      let lat: number | null = null;
      let lng: number | null = null;

      // 1. Try Expo Location first
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await ExpoLocation.getCurrentPositionAsync({
            accuracy: ExpoLocation.Accuracy.High,
          });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      } catch {
        // Continue to fallback
      }

      // 2. Fallback to browser navigator.geolocation if available (Web)
      if ((lat === null || lng === null) && typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const coords = await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
              (err) => reject(err),
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
            );
          });
          lat = coords.latitude;
          lng = coords.longitude;
        } catch (webErr: any) {
          if (webErr?.code === 1) {
            setLocationFeedback({
              type: 'error',
              message: 'Location permission was denied. Please allow location access in your browser or device settings, or enter coordinates manually.',
            });
            setLocationLoading(false);
            return;
          }
        }
      }

      if (lat === null || lng === null) {
        setLocationFeedback({
          type: 'error',
          message: 'Unable to detect location. Please check device GPS or enter coordinates manually.',
        });
        setLocationLoading(false);
        return;
      }

      // Populate coordinates
      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));
      setLocationFeedback({
        type: 'success',
        message: `Current location detected: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      });

      // Reverse geocoding via OpenStreetMap Nominatim
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
          { headers: { Accept: 'application/json' } }
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.address) {
            const a = data.address;
            const detectedCity = a.city || a.town || a.village || a.suburb || a.county || '';
            const detectedState = a.state || a.state_district || '';
            const detectedPincode = a.postcode || '';
            const detectedRoad = [a.house_number, a.road, a.neighbourhood, a.suburb].filter(Boolean).join(', ');

            if (detectedCity && (!city || city === 'Vellore')) setCity(detectedCity);
            if (detectedState && (!stateName || stateName === 'Tamil Nadu')) setStateName(detectedState);
            if (detectedPincode && !pincode) setPincode(detectedPincode);
            if (detectedRoad && !address) setAddress(detectedRoad);
          }
        }
      } catch {
        // Reverse geocode is best-effort
      }
    } catch {
      setLocationFeedback({
        type: 'error',
        message: 'Could not fetch current location. You can enter coordinates manually.',
      });
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    setFormError(null);
    if (!label.trim()) {
      setFormError('Please enter an address label (e.g. Home, Office).');
      return;
    }
    if (!address.trim()) {
      setFormError('Please enter full address details.');
      return;
    }

    const latTrim = latitude.trim();
    const lngTrim = longitude.trim();

    if ((latTrim && !lngTrim) || (!latTrim && lngTrim)) {
      setFormError('Both latitude and longitude must be provided together, or leave both empty.');
      return;
    }

    let latNum: number | undefined = undefined;
    let lngNum: number | undefined = undefined;

    if (latTrim && lngTrim) {
      latNum = parseFloat(latTrim);
      lngNum = parseFloat(lngTrim);

      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        setFormError('Latitude must be a valid number between -90 and 90.');
        return;
      }

      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        setFormError('Longitude must be a valid number between -180 and 180.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        type: selectedType,
        label: label.trim(),
        address: address.trim(),
        landmark: landmark.trim() || undefined,
        city: city.trim() || undefined,
        state: stateName.trim() || undefined,
        pincode: pincode.trim() || undefined,
        latitude: latNum,
        longitude: lngNum,
        coordinates: (latNum !== undefined && lngNum !== undefined)
          ? { lat: latNum, lng: lngNum, latitude: latNum, longitude: lngNum }
          : undefined,
        isDefault,
      };

      if (editingAddress) {
        await profileService.updateAddress(editingAddress._id, payload);
        showToast('success', 'Address Updated', 'Saved address was updated successfully.');
      } else {
        await profileService.addAddress(payload);
        showToast('success', 'Address Saved', 'New delivery address added successfully.');
      }
      closeModal();
      fetchAddresses();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to save address.';
      setFormError(msg);
      showToast('error', 'Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (addr: SavedAddress) => {
    try {
      await profileService.updateAddress(addr._id, { isDefault: true });
      showToast('success', 'Default Address', `${addr.label} is now your default address.`);
      fetchAddresses();
    } catch (err: any) {
      showToast('error', 'Error', 'Failed to update default address.');
    }
  };

  const handleDeleteAddress = (addr: SavedAddress) => {
    blurActiveElement();
    setAddressToDelete(addr);
  };

  const confirmDeleteAddress = async () => {
    if (!addressToDelete) return;
    setIsDeleting(true);
    try {
      await profileService.deleteAddress(addressToDelete._id);
      const deletedId = addressToDelete._id;
      const wasDefault = Boolean(addressToDelete.isDefault);

      // Immediately update local addresses state
      setAddresses((prev) => {
        const remaining = prev.filter((a) => a._id !== deletedId);
        if (wasDefault && remaining.length > 0) {
          remaining[0] = { ...remaining[0], isDefault: true };
        }
        return remaining;
      });

      showToast('success', 'Address Deleted', 'Address deleted successfully.');
      setAddressToDelete(null);
      fetchAddresses();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to delete address.';
      showToast('error', 'Delete Error', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isGuest || !authUser) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace('/(customer)')}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved Addresses</Text>
          <View style={{ width: 40 }} />
        </View>
        <GuestAuthPrompt
          title="Sign in to continue"
          description="Sign in or create an account to save and manage your delivery addresses."
          icon={<MapPin size={28} color="#00417E" />}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/(customer)/profile')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Addresses</Text>
        <TouchableOpacity
          style={styles.headerAddBtn}
          onPress={openAddModal}
          activeOpacity={0.8}
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.headerAddBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 140 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading saved addresses...</Text>
          </View>
        ) : addresses.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <MapPin size={38} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No saved addresses yet</Text>
            <Text style={styles.emptyDesc}>
              Save your home, hostel, college, or workplace addresses for instantaneous one-tap parcel sending and deliveries.
            </Text>
            <TouchableOpacity
              style={styles.addFirstBtn}
              onPress={openAddModal}
              activeOpacity={0.8}
            >
              <Plus size={18} color="#ffffff" />
              <Text style={styles.addFirstBtnText}>Add Your First Address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Address List */
          <View style={styles.addressList}>
            {addresses.map((addr) => {
              const typeConfig = ADDRESS_TYPES.find((t) => t.type === addr.type) || ADDRESS_TYPES[3];
              const IconComp = typeConfig.icon;

              return (
                <View key={addr._id} style={[styles.addressCard, addr.isDefault && styles.addressCardDefault]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View
                        style={[
                          styles.typeBadge,
                          addr.type === 'Home' && styles.typeBadgeHome,
                          addr.type === 'Work' && styles.typeBadgeWork,
                          addr.type === 'College' && styles.typeBadgeCollege,
                          addr.type === 'Other' && styles.typeBadgeOther,
                        ]}
                      >
                        <IconComp size={14} color={addr.type === 'Work' ? colors.secondary : colors.primary} />
                        <Text
                          style={[
                            styles.typeBadgeText,
                            addr.type === 'Work' && styles.typeBadgeTextWork,
                          ]}
                        >
                          {addr.type || 'Address'}
                        </Text>
                      </View>
                      <Text style={styles.cardLabel}>{addr.label}</Text>
                    </View>

                    {addr.isDefault ? (
                      <View style={styles.defaultPill}>
                        <CheckCircle2 size={12} color={colors.tertiary} />
                        <Text style={styles.defaultPillText}>Default</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.cardAddress}>{addr.address}</Text>

                  {[addr.landmark ? `Landmark: ${addr.landmark}` : null, addr.city, addr.state, addr.pincode]
                    .filter(Boolean).length > 0 ? (
                    <Text style={styles.cardMeta}>
                      {[addr.landmark ? `Landmark: ${addr.landmark}` : null, addr.city, addr.state, addr.pincode]
                        .filter(Boolean)
                        .join(', ')}
                    </Text>
                  ) : null}

                  {/* Coordinates GPS Badge */}
                  {(() => {
                    const coordLat = addr.latitude ?? addr.coordinates?.latitude ?? (addr.coordinates as any)?.lat;
                    const coordLng = addr.longitude ?? addr.coordinates?.longitude ?? (addr.coordinates as any)?.lng;
                    if (typeof coordLat === 'number' && typeof coordLng === 'number') {
                      return (
                        <View style={styles.cardCoordsRow}>
                          <View style={styles.cardCoordsBadge}>
                            <Crosshair size={11} color={colors.secondary} />
                            <Text style={styles.cardCoordsText}>
                              GPS: {coordLat.toFixed(4)}, {coordLng.toFixed(4)}
                            </Text>
                          </View>
                        </View>
                      );
                    }
                    return null;
                  })()}

                  <View style={styles.cardActions}>
                    {!addr.isDefault ? (
                      <TouchableOpacity
                        style={styles.actionBtnDefault}
                        onPress={() => handleSetDefault(addr)}
                        activeOpacity={0.7}
                      >
                        <Star size={14} color={colors.primary} />
                        <Text style={styles.actionBtnDefaultText}>Set as Default</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ flex: 1 }} />
                    )}

                    <View style={styles.actionRightRow}>
                      <TouchableOpacity
                        style={styles.iconActionBtn}
                        onPress={() => openEditModal(addr)}
                        activeOpacity={0.7}
                      >
                        <Edit2 size={16} color={colors.onSurfaceVariant} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconActionBtn}
                        onPress={() => handleDeleteAddress(addr)}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Address Modal */}
      {modalVisible ? (
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={closeModal}
          aria-modal={true}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingAddress ? 'Edit Address' : 'Add New Address'}
                </Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={closeModal}
                  activeOpacity={0.7}
                >
                  <X size={20} color={colors.onSurface} />
                </TouchableOpacity>
              </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalFormScroll}>
              {formError ? (
                <View style={styles.modalErrorBox}>
                  <AlertCircle size={16} color={colors.error} />
                  <Text style={styles.modalErrorText}>{formError}</Text>
                </View>
              ) : null}

              {/* Address Type Chips */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>ADDRESS TYPE</Text>
                <View style={styles.typeRow}>
                  {ADDRESS_TYPES.map((t) => {
                    const isSelected = selectedType === t.type;
                    const ChipIcon = t.icon;
                    return (
                      <TouchableOpacity
                        key={t.type}
                        style={[styles.typeChip, isSelected && styles.typeChipSelected]}
                        onPress={() => {
                          setSelectedType(t.type);
                          if (!label || label === selectedType) {
                            setLabel(t.label);
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <ChipIcon
                          size={14}
                          color={isSelected ? '#ffffff' : colors.onSurfaceVariant}
                        />
                        <Text
                          style={[
                            styles.typeChipText,
                            isSelected && styles.typeChipTextSelected,
                          ]}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Label */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>LABEL / NAME</Text>
                <TextInput
                  style={styles.formInput}
                  value={label}
                  onChangeText={(t) => {
                    setFormError(null);
                    setLabel(t);
                  }}
                  placeholder="e.g. Home Sweet Home, Campus Hostel"
                  placeholderTextColor={colors.outline}
                />
              </View>

              {/* Full Address */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>COMPLETE ADDRESS</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={address}
                  onChangeText={(t) => {
                    setFormError(null);
                    setAddress(t);
                  }}
                  placeholder="House/Flat/Room No., Building name, Street, Area"
                  placeholderTextColor={colors.outline}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Landmark */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>LANDMARK (OPTIONAL)</Text>
                <TextInput
                  style={styles.formInput}
                  value={landmark}
                  onChangeText={setLandmark}
                  placeholder="e.g. Near Main Gate, Opp. Central Library"
                  placeholderTextColor={colors.outline}
                />
              </View>

              {/* City & State Row */}
              <View style={styles.twoColRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>CITY</Text>
                  <TextInput
                    style={styles.formInput}
                    value={city}
                    onChangeText={setCity}
                    placeholder="City"
                    placeholderTextColor={colors.outline}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>STATE</Text>
                  <TextInput
                    style={styles.formInput}
                    value={stateName}
                    onChangeText={setStateName}
                    placeholder="e.g. Tamil Nadu"
                    placeholderTextColor={colors.outline}
                  />
                </View>
              </View>

              {/* Pincode */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>PINCODE</Text>
                <TextInput
                  style={styles.formInput}
                  value={pincode}
                  onChangeText={setPincode}
                  placeholder="e.g. 632014"
                  placeholderTextColor={colors.outline}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              {/* Coordinates (Latitude & Longitude) */}
              <View style={styles.twoColRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>LATITUDE</Text>
                  <TextInput
                    style={styles.formInput}
                    value={latitude}
                    onChangeText={(t) => {
                      setFormError(null);
                      setLatitude(t);
                    }}
                    placeholder="e.g. 12.969200"
                    placeholderTextColor={colors.outline}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>LONGITUDE</Text>
                  <TextInput
                    style={styles.formInput}
                    value={longitude}
                    onChangeText={(t) => {
                      setFormError(null);
                      setLongitude(t);
                    }}
                    placeholder="e.g. 79.155900"
                    placeholderTextColor={colors.outline}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Use Current Location Action Button */}
              <TouchableOpacity
                style={[styles.locationDetectBtn, locationLoading && styles.locationDetectBtnDisabled]}
                onPress={handleUseCurrentLocation}
                disabled={locationLoading}
                activeOpacity={0.8}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color={colors.secondaryContainer} />
                ) : (
                  <Crosshair size={16} color={colors.secondaryContainer} />
                )}
                <Text style={styles.locationDetectBtnText}>
                  {locationLoading ? 'Detecting current GPS coordinates...' : 'Use Current Location'}
                </Text>
              </TouchableOpacity>

              {/* Geolocation Feedback Banner */}
              {locationFeedback ? (
                <View
                  style={[
                    styles.locationFeedbackBox,
                    locationFeedback.type === 'success'
                      ? styles.locationFeedbackSuccess
                      : styles.locationFeedbackError,
                  ]}
                >
                  {locationFeedback.type === 'success' ? (
                    <CheckCircle2 size={15} color="#15803d" />
                  ) : (
                    <AlertCircle size={15} color={colors.error} />
                  )}
                  <Text
                    style={[
                      styles.locationFeedbackText,
                      locationFeedback.type === 'success'
                        ? styles.locationFeedbackTextSuccess
                        : styles.locationFeedbackTextError,
                    ]}
                  >
                    {locationFeedback.message}
                  </Text>
                </View>
              ) : null}

              {/* Default Toggle */}
              <View style={styles.defaultToggleRow}>
                <View style={styles.defaultToggleTexts}>
                  <Text style={styles.defaultToggleTitle}>Set as Default Address</Text>
                  <Text style={styles.defaultToggleSub}>
                    Pre-selected for fast dispatch on your next send delivery
                  </Text>
                </View>
                <Switch
                  value={isDefault}
                  onValueChange={setIsDefault}
                  trackColor={{ false: colors.surfaceContainer, true: colors.secondaryContainer }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveModalBtn, saving && styles.saveModalBtnDisabled]}
                onPress={handleSaveAddress}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveModalBtnText}>
                    {editingAddress ? 'Update Address' : 'Save Address'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      ) : null}

      {/* Delete Address Confirmation Dialog */}
      {addressToDelete ? (
        <Modal
          visible={Boolean(addressToDelete)}
          animationType="fade"
          transparent
          onRequestClose={() => {
            if (!isDeleting) setAddressToDelete(null);
          }}
          aria-modal={true}
        >
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmIconWrap}>
                <Trash2 size={24} color={colors.error} />
              </View>
              <Text style={styles.confirmTitle}>Delete this address?</Text>
              <Text style={styles.confirmDesc}>
                Are you sure you want to remove this saved address? This action cannot be undone.
              </Text>

              <View style={styles.confirmAddressPreview}>
                <Text style={styles.confirmAddressLabel} numberOfLines={1}>
                  {addressToDelete.label}
                </Text>
                <Text style={styles.confirmAddressText} numberOfLines={2}>
                  {addressToDelete.address}
                </Text>
              </View>

              <View style={styles.confirmButtonsRow}>
                <TouchableOpacity
                  style={styles.confirmCancelBtn}
                  onPress={() => setAddressToDelete(null)}
                  disabled={isDeleting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmDeleteBtn, isDeleting && styles.confirmDeleteBtnDisabled]}
                  onPress={confirmDeleteAddress}
                  disabled={isDeleting}
                  activeOpacity={0.8}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Trash2 size={15} color="#ffffff" />
                      <Text style={styles.confirmDeleteBtnText}>Delete Address</Text>
                    </>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
    color: colors.onSurface,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  headerAddBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 14,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  emptyCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    marginTop: 20,
    gap: 10,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
    color: colors.onSurface,
  },
  emptyDesc: {
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
  addFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    marginTop: 8,
    shadowColor: colors.secondaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  addFirstBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 18,
  },
  addressList: {
    gap: 12,
  },
  addressCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    gap: 7,
    shadowColor: '#111c2d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  addressCardDefault: {
    borderColor: colors.primaryFixed,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
    flex: 1,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  typeBadgeHome: {
    backgroundColor: colors.primaryFixed,
  },
  typeBadgeWork: {
    backgroundColor: colors.secondaryFixed,
  },
  typeBadgeCollege: {
    backgroundColor: '#e6f7ec',
  },
  typeBadgeOther: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  typeBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    lineHeight: 13,
    color: colors.primary,
  },
  typeBadgeTextWork: {
    color: colors.secondary,
  },
  cardLabel: {
    fontSize: 14.5,
    fontWeight: '700',
    lineHeight: 19,
    color: colors.onSurface,
  },
  defaultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#e6f7ec',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  defaultPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    lineHeight: 13,
    color: colors.tertiary,
  },
  cardAddress: {
    fontSize: 12.5,
    color: colors.onSurface,
    lineHeight: 17,
  },
  cardMeta: {
    fontSize: 11.5,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
    marginTop: 2,
  },
  actionBtnDefault: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  actionBtnDefaultText: {
    fontSize: 11.5,
    fontWeight: '600',
    lineHeight: 15,
    color: colors.primary,
  },
  actionRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 9999,
    elevation: 9999,
  },
  modalSheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
    color: colors.onSurface,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFormScroll: {
    padding: 16,
    gap: 14,
    paddingBottom: 36,
  },
  modalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.errorContainer,
    padding: 12,
    borderRadius: 12,
  },
  modalErrorText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.error,
    flex: 1,
  },
  formGroup: {
    gap: 5,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.6,
    lineHeight: 14,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  typeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },
  typeChipTextSelected: {
    color: '#ffffff',
  },
  formInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.onSurface,
  },
  formTextArea: {
    minHeight: 70,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  defaultToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    marginTop: 2,
  },
  defaultToggleTexts: {
    flex: 1,
    gap: 2,
    paddingRight: 8,
  },
  defaultToggleTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 18,
    color: colors.onSurface,
  },
  defaultToggleSub: {
    fontSize: 11.5,
    lineHeight: 15,
    color: colors.onSurfaceVariant,
  },
  saveModalBtn: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: colors.secondaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  saveModalBtnDisabled: {
    opacity: 0.6,
  },
  saveModalBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  cardCoordsRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  cardCoordsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  cardCoordsText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary,
    lineHeight: 14,
  },
  locationDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: colors.secondaryContainer,
    marginTop: 2,
  },
  locationDetectBtnDisabled: {
    opacity: 0.6,
  },
  locationDetectBtnText: {
    color: colors.secondaryContainer,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  locationFeedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  locationFeedbackSuccess: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  locationFeedbackError: {
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.error,
  },
  locationFeedbackText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  locationFeedbackTextSuccess: {
    color: '#166534',
    fontWeight: '600',
  },
  locationFeedbackTextError: {
    color: colors.error,
    fontWeight: '600',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
      } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
      },
    }),
  },
  confirmIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmDesc: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  confirmAddressPreview: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  confirmAddressLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 4,
  },
  confirmAddressText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.surfaceContainerHigh,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  confirmDeleteBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: colors.error,
  },
  confirmDeleteBtnDisabled: {
    opacity: 0.6,
  },
  confirmDeleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
