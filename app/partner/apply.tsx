import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ArrowRight,
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  UploadCloud,
  FileCheck,
  Bike,
  Zap,
  Check,
  AlertCircle,
  Clock,
  Camera,
  FileText,
  CreditCard,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Trash2,
  RefreshCw,
  File,
  Copy,
  LogIn,
  KeyRound,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../src/services/api.service';
import { showToast, getApiError } from '../../src/utils/toast';

const VEHICLE_TYPES = [
  { id: 'BIKE', label: 'Bike', emoji: '🏍️', desc: 'Petrol Motorcycle' },
  { id: 'SCOOTER', label: 'Scooter', emoji: '🛵', desc: 'Activa / Access / Jupiter' },
  { id: 'EV_SCOOTER', label: 'EV Scooter', emoji: '⚡', desc: 'Electric 2-Wheeler' },
  { id: 'BICYCLE', label: 'Bicycle', emoji: '🚲', desc: 'Cycle' },
  { id: 'AUTO', label: 'Auto', emoji: '🛺', desc: '3-Wheeler' },
];

export default function DeliveryPartnerApplyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // Form State
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [profileFileName, setProfileFileName] = useState<string>('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [vehicleType, setVehicleType] = useState('BIKE');
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState('');

  const [drivingLicenceNumber, setDrivingLicenceNumber] = useState('');
  const [drivingLicencePhoto, setDrivingLicencePhoto] = useState<string>('');
  const [drivingLicenceFileName, setDrivingLicenceFileName] = useState<string>('');

  const [panNumber, setPanNumber] = useState('');
  const [panPhoto, setPanPhoto] = useState<string>('');
  const [panFileName, setPanFileName] = useState<string>('');

  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarPhoto, setAadhaarPhoto] = useState<string>('');
  const [aadhaarFileName, setAadhaarFileName] = useState<string>('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [agreeConsent, setAgreeConsent] = useState(false);

  // Status & Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showSubmittedPassword, setShowSubmittedPassword] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    applicationRef: string;
    partnerId?: string | null;
    phone: string;
    email?: string;
    password?: string;
  } | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      window.scrollTo(0, 0);
    }
  }, []);

  // Profile Photo Picker (Image Only)
  const handlePickProfilePhoto = async () => {
    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/webp';
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (!file) return;

          const allowedImageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
          const ext = (file.name || '').split('.').pop()?.toLowerCase();
          const isAllowed = allowedImageMimes.includes(file.type.toLowerCase()) || ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');

          if (!isAllowed) {
            showToast('error', 'Image Only', 'Profile photo must be an image (JPG, PNG, or WEBP).');
            return;
          }

          if (file.size > 15 * 1024 * 1024) {
            showToast('error', 'File Too Large', 'Maximum file size allowed is 15MB.');
            return;
          }

          const reader = new FileReader();
          reader.onload = () => {
            const dataUri = reader.result as string;
            setProfilePhoto(dataUri);
            setProfileFileName(file.name);
            showToast('success', 'Profile Photo Selected', `✓ ${file.name}`);
          };
          reader.readAsDataURL(file);
        };
        input.click();
      } catch {
        showToast('error', 'Upload Error', 'Could not open file selector.');
      }
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('error', 'Permission Required', 'Please allow gallery access to select a profile photo.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        const dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setProfilePhoto(dataUri);
        setProfileFileName(asset.fileName || 'profile_photo.jpg');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('success', 'Profile Photo Selected', 'Photo attached.');
      }
    } catch {
      showToast('error', 'Selection Failed', 'Could not open photo library.');
    }
  };

  // KYC Document Picker (Supports BOTH Images AND PDF files)
  const handlePickDocument = async (field: 'dl' | 'pan' | 'aadhaar') => {
    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/webp,application/pdf';
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (!file) return;

          const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
          const ext = (file.name || '').split('.').pop()?.toLowerCase();
          const isAllowed = allowedMimes.includes(file.type.toLowerCase()) || ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext || '');

          if (!isAllowed) {
            showToast('error', 'Unsupported File', 'Please upload a JPG, PNG, or PDF file.');
            return;
          }

          const MAX_SIZE = 15 * 1024 * 1024; // 15MB
          if (file.size > MAX_SIZE) {
            showToast('error', 'File Too Large', 'Maximum file size allowed is 15MB.');
            return;
          }

          const reader = new FileReader();
          reader.onload = () => {
            const dataUri = reader.result as string;
            if (field === 'dl') {
              setDrivingLicencePhoto(dataUri);
              setDrivingLicenceFileName(file.name);
            } else if (field === 'pan') {
              setPanPhoto(dataUri);
              setPanFileName(file.name);
            } else if (field === 'aadhaar') {
              setAadhaarPhoto(dataUri);
              setAadhaarFileName(file.name);
            }
            showToast('success', 'Document Attached', `✓ ${file.name}`);
          };
          reader.readAsDataURL(file);
        };
        input.click();
      } catch {
        showToast('error', 'Upload Error', 'Could not open file selector.');
      }
      return;
    }

    // Native fallback using DocumentPicker
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        const ext = (asset.name || '').split('.').pop()?.toLowerCase();
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
        const isAllowed = (asset.mimeType && allowedMimes.includes(asset.mimeType)) || ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext || '');

        if (!isAllowed) {
          showToast('error', 'Unsupported File', 'Please upload a JPG, PNG, or PDF file.');
          return;
        }

        if (asset.size && asset.size > 15 * 1024 * 1024) {
          showToast('error', 'File Too Large', 'Maximum file size allowed is 15MB.');
          return;
        }

        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          if (field === 'dl') {
            setDrivingLicencePhoto(base64Data);
            setDrivingLicenceFileName(asset.name || 'driving_licence.pdf');
          } else if (field === 'pan') {
            setPanPhoto(base64Data);
            setPanFileName(asset.name || 'pan_card.pdf');
          } else if (field === 'aadhaar') {
            setAadhaarPhoto(base64Data);
            setAadhaarFileName(asset.name || 'aadhaar_card.pdf');
          }
          showToast('success', 'Document Attached', `✓ ${asset.name}`);
        };
        reader.readAsDataURL(blob);
      }
    } catch {
      showToast('error', 'Selection Failed', 'Could not select document.');
    }
  };

  // Remove document handler
  const handleRemoveDocument = (field: 'profile' | 'dl' | 'pan' | 'aadhaar') => {
    if (field === 'profile') {
      setProfilePhoto('');
      setProfileFileName('');
    } else if (field === 'dl') {
      setDrivingLicencePhoto('');
      setDrivingLicenceFileName('');
    } else if (field === 'pan') {
      setPanPhoto('');
      setPanFileName('');
    } else if (field === 'aadhaar') {
      setAadhaarPhoto('');
      setAadhaarFileName('');
    }
    showToast('info', 'File Removed', 'You can upload a new file.');
  };

  const handleCopyText = async (text: string, label: string = 'Copied') => {
    try {
      if (Platform.OS === 'web') {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        }
      } else {
        await Clipboard.setStringAsync(text);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('success', label, text);
    } catch {
      showToast('info', label, text);
    }
  };

  // Submit Handler
  const handleSubmit = async () => {
    setFormError(null);

    const cleanName = name.trim();
    const cleanPhone = phone.trim().replace(/^\+91/, '').replace(/\D/g, '');
    const cleanEmail = email.trim().toLowerCase();
    const cleanVehicleNumber = vehicleNumber.trim().toUpperCase();
    const cleanDlNumber = drivingLicenceNumber.trim().toUpperCase();
    const cleanPanNumber = panNumber.trim().toUpperCase();
    const cleanAadhaarNumber = aadhaarNumber.trim().replace(/\D/g, '');

    // Validation
    if (!profilePhoto) {
      setFormError('Please upload a clear passport-size profile photo.');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    const nameRegex = /^[a-zA-Z\s.]{2,50}$/;
    const alphaCount = cleanName.replace(/[^a-zA-Z]/g, '').length;
    if (!cleanName || cleanName.length < 2 || !nameRegex.test(cleanName) || alphaCount < 2) {
      setFormError('Please enter your full legal name (minimum 2 letters, alphabets and spaces only).');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!cleanPhone || cleanPhone.length !== 10 || !phoneRegex.test(cleanPhone)) {
      setFormError('Please provide a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (cleanEmail && !emailRegex.test(cleanEmail)) {
      setFormError('Please enter a valid email address (e.g. partner@example.com) or leave it empty.');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    if (vehicleType !== 'BICYCLE') {
      if (!cleanVehicleNumber) {
        setFormError('Please enter your vehicle registration number.');
        return;
      }
      const strippedVehicle = cleanVehicleNumber.replace(/[\s-]/g, '');
      const vehicleRegex = /^([A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$/i;
      if (strippedVehicle.length < 6 || strippedVehicle.length > 13 || !vehicleRegex.test(strippedVehicle)) {
        setFormError('Please enter a valid Indian vehicle registration number (e.g. TN 09 AB 1234 or 22 BH 1234 AA).');
        return;
      }
    }

    if (vehicleType !== 'BICYCLE') {
      if (!cleanDlNumber) {
        setFormError('Driving Licence number is required for motorized vehicles.');
        return;
      }
      const strippedDl = cleanDlNumber.replace(/[\s-]/g, '');
      const dlRegex = /^[A-Z]{2}[0-9A-Z]{8,14}$/i;
      if (strippedDl.length < 10 || strippedDl.length > 16 || !dlRegex.test(strippedDl)) {
        setFormError('Please enter a valid Indian Driving Licence number (10 to 16 characters, e.g. DL-1420110012345).');
        return;
      }
      if (!drivingLicencePhoto) {
        setFormError('Please upload your Driving Licence document (Image or PDF).');
        return;
      }
    }

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!cleanPanNumber || cleanPanNumber.length !== 10 || !panRegex.test(cleanPanNumber)) {
      setFormError('Please enter a valid 10-character PAN number (5 letters, 4 digits, 1 letter, e.g. ABCDE1234F).');
      return;
    }
    if (!panPhoto) {
      setFormError('Please upload your PAN card document (Image or PDF).');
      return;
    }

    const aadhaarRegex = /^[2-9][0-9]{11}$/;
    const isRepeatedDigits = /^(\d)\1{11}$/.test(cleanAadhaarNumber);
    if (!cleanAadhaarNumber || cleanAadhaarNumber.length !== 12 || !aadhaarRegex.test(cleanAadhaarNumber) || isRepeatedDigits) {
      setFormError('Please enter a valid 12-digit Aadhaar number (cannot start with 0 or 1, no repeating numbers).');
      return;
    }
    if (!aadhaarPhoto) {
      setFormError('Please upload your Aadhaar card document (Image or PDF).');
      return;
    }

    if (!password || password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify both password fields.');
      return;
    }
    if (!agreeConsent) {
      setFormError('Please check the consent box to confirm details and terms.');
      return;
    }

    try {
      setIsSubmitting(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const payload = {
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail || undefined,
        password,
        role: 'DELIVERY_PARTNER',
        vehicleType,
        vehicleNumber: cleanVehicleNumber,
        drivingLicenceNumber: cleanDlNumber,
        drivingLicencePhoto: drivingLicencePhoto || undefined,
        panNumber: cleanPanNumber,
        panPhoto: panPhoto || undefined,
        aadhaarNumber: cleanAadhaarNumber,
        aadhaarPhoto: aadhaarPhoto || undefined,
        profilePhoto: profilePhoto || undefined,
      };

      const res = await apiClient.post('/delivery-partners/apply', payload);
      const data = res.data.data;
      const appRef = data?.applicationRef || `#H2H-${(data?.userId || 'APPLY').toString().slice(-8).toUpperCase()}`;
      const pId = data?.partnerId || null;

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setSubmittedData({
        applicationRef: appRef,
        partnerId: pId,
        phone: cleanPhone,
        email: cleanEmail || data?.email || '',
        password: password,
      });

      if (Platform.OS === 'web') {
        window.scrollTo(0, 0);
      }
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } catch (err: any) {
      const msg = getApiError(err);
      setFormError(msg);
      showToast('error', 'Submission Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN VIEW
  if (submittedData) {
    const displayId = submittedData.partnerId || submittedData.applicationRef;

    return (
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ScrollView
          contentContainerStyle={styles.successScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Logo */}
          <View style={styles.topLogoRow}>
            <Image
              source={require('../../assets/images/h2h-header-logo.png')}
              style={styles.h2hLogo}
              resizeMode="contain"
            />
          </View>

          {/* Success Card */}
          <View style={styles.successCard}>
            <View style={styles.successIconOuter}>
              <CheckCircle2 size={32} color="#16a34a" />
            </View>

            <Text style={styles.successTitle}>Application Submitted!</Text>

            <Text style={styles.successDescription}>
              Sign in with your registered credentials below to track your live application verification status.
            </Text>

            {/* Consolidated Credentials & Application Box */}
            <View style={styles.appMetaBox}>
              {/* Partner ID & Pending Status Top Row */}
              <View style={styles.partnerTopRow}>
                <View>
                  <Text style={styles.partnerTopLabel}>Delivery Partner ID</Text>
                  <Text style={styles.partnerTopValue}>{displayId}</Text>
                </View>
                <View style={styles.pendingBadge}>
                  <Clock size={11} color="#b45309" />
                  <Text style={styles.pendingBadgeText}>Pending Review</Text>
                </View>
              </View>

              {/* Mail ID Row */}
              <View style={styles.credRow}>
                <View style={styles.credRowLeft}>
                  <Mail size={16} color="#ea580c" />
                  <View style={styles.credRowTexts}>
                    <Text style={styles.credLabel}>Mail ID</Text>
                    <Text style={styles.credValue} numberOfLines={1}>
                      {submittedData.email || '—'}
                    </Text>
                  </View>
                </View>
                {submittedData.email ? (
                  <TouchableOpacity
                    style={styles.tinyCopyBtn}
                    onPress={() => handleCopyText(submittedData.email!, 'Mail ID Copied')}
                    activeOpacity={0.7}
                  >
                    <Copy size={12} color="#ea580c" />
                    <Text style={styles.tinyCopyBtnText}>Copy</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Password Row */}
              <View style={styles.credRow}>
                <View style={styles.credRowLeft}>
                  <Lock size={16} color="#ea580c" />
                  <View style={styles.credRowTexts}>
                    <Text style={styles.credLabel}>Password</Text>
                    <Text
                      style={[
                        styles.credValue,
                        { letterSpacing: showSubmittedPassword ? 0.2 : 2 },
                      ]}
                      numberOfLines={1}
                    >
                      {showSubmittedPassword ? submittedData.password : '••••••••••••'}
                    </Text>
                  </View>
                </View>
                <View style={styles.credActions}>
                  <TouchableOpacity
                    style={styles.tinyIconBtn}
                    onPress={() => setShowSubmittedPassword(v => !v)}
                    activeOpacity={0.7}
                  >
                    {showSubmittedPassword ? (
                      <EyeOff size={13} color="#64748b" />
                    ) : (
                      <Eye size={13} color="#64748b" />
                    )}
                  </TouchableOpacity>
                  {submittedData.password ? (
                    <TouchableOpacity
                      style={styles.tinyCopyBtn}
                      onPress={() => handleCopyText(submittedData.password!, 'Password Copied')}
                      activeOpacity={0.7}
                    >
                      <Copy size={12} color="#ea580c" />
                      <Text style={styles.tinyCopyBtnText}>Copy</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {/* Registered Phone Row */}
              <View style={styles.credRow}>
                <View style={styles.credRowLeft}>
                  <Phone size={16} color="#ea580c" />
                  <View style={styles.credRowTexts}>
                    <Text style={styles.credLabel}>Registered Mobile</Text>
                    <Text style={styles.credValue}>+91 {submittedData.phone}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.tinyCopyBtn}
                  onPress={() => handleCopyText(submittedData.phone, 'Mobile Copied')}
                  activeOpacity={0.7}
                >
                  <Copy size={12} color="#ea580c" />
                  <Text style={styles.tinyCopyBtnText}>Copy</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary Sign In CTA */}
            <TouchableOpacity
              style={styles.statusActionBtn}
              onPress={() => {
                router.push({
                  pathname: '/(auth)/partner-login',
                  params: { phone: submittedData.phone, email: submittedData.email },
                } as any);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.statusActionBtnText}>Sign In to Check Status</Text>
              <ArrowRight size={18} color="#ffffff" />
            </TouchableOpacity>

            {/* Return to Home */}
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.replace('/(customer)')}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryBtnText}>Return to Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ONBOARDING FORM VIEW
  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navBackBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(customer)/profile/support');
            }
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Image
          source={require('../../assets/images/h2h-header-logo.png')}
          style={styles.h2hLogoSmall}
          resizeMode="contain"
        />
        <View style={styles.fleetBadge}>
          <Text style={styles.fleetBadgeText}>FLEET</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Delivery Partner Onboarding</Text>
          <Text style={styles.heroSub}>
            Submit your application and KYC details for review and approval.
          </Text>
        </View>

        {/* Error Notice */}
        {formError && (
          <View style={styles.errorBanner}>
            <AlertCircle size={18} color="#b91c1c" />
            <Text style={styles.errorBannerText}>{formError}</Text>
          </View>
        )}

        {/* STEP 1: Personal Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <View style={styles.cardHeaderCol}>
              <Text style={styles.cardTitle}>Personal Details</Text>
              <Text style={styles.cardSub}>Your basic contact and identification details</Text>
            </View>
          </View>

          {/* Profile Photo Upload */}
          <View style={styles.profileSection}>
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={handlePickProfilePhoto}
              activeOpacity={0.8}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={34} color="#94a3b8" />
                </View>
              )}
              <View style={styles.avatarCameraBadge}>
                <Camera size={13} color="#ffffff" />
              </View>
            </TouchableOpacity>

            <View style={styles.profileMeta}>
              <Text style={styles.profileTitle}>Profile Photo</Text>
              <Text style={styles.profileHint}>
                {profileFileName ? `✓ ${profileFileName}` : 'Clear passport-size front view photo (PNG, JPG)'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TouchableOpacity
                  style={styles.uploadBtnMini}
                  onPress={handlePickProfilePhoto}
                  activeOpacity={0.7}
                >
                  <Text style={styles.uploadBtnMiniText}>
                    {profilePhoto ? 'Change Photo' : '+ Upload Photo'}
                  </Text>
                </TouchableOpacity>
                {profilePhoto ? (
                  <TouchableOpacity
                    style={[styles.uploadBtnMini, { backgroundColor: '#fee2e2' }]}
                    onPress={() => handleRemoveDocument('profile')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.uploadBtnMiniText, { color: '#dc2626' }]}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>
                Full Legal Name <Text style={styles.reqStar}>*</Text>
              </Text>
              {name.length > 0 && <Text style={styles.charCounter}>{name.length}/50</Text>}
            </View>
            <View
              style={[
                styles.inputContainer,
                name.trim().length >= 2 && /^[a-zA-Z\s.]{2,50}$/.test(name.trim()) && name.replace(/[^a-zA-Z]/g, '').length >= 2
                  ? styles.inputContainerSuccess
                  : name.length > 0
                  ? styles.inputContainerWarning
                  : null,
              ]}
            >
              <View style={styles.iconBox}>
                <User size={18} color="#64748b" />
              </View>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={v => {
                  const sanitized = v.replace(/[^a-zA-Z\s.]/g, '').slice(0, 50);
                  setName(sanitized);
                  if (formError) setFormError(null);
                }}
                placeholder="As per Government ID (e.g. Rahul Sharma)"
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
                maxLength={50}
              />
              {name.trim().length >= 2 && /^[a-zA-Z\s.]{2,50}$/.test(name.trim()) && name.replace(/[^a-zA-Z]/g, '').length >= 2 && (
                <View style={styles.inputEndIcon}>
                  <Check size={16} color="#16a34a" />
                </View>
              )}
            </View>
            <Text style={styles.fieldHint}>Only alphabets and spaces allowed (2–50 characters)</Text>
          </View>

          {/* Mobile Number */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>
                Mobile Number <Text style={styles.reqStar}>*</Text>
              </Text>
              <Text style={styles.charCounter}>{phone.length}/10</Text>
            </View>
            <View
              style={[
                styles.inputContainer,
                phone.length === 10 && /^[6-9]\d{9}$/.test(phone) ? styles.inputContainerSuccess : null,
              ]}
            >
              <View style={styles.phonePrefixBox}>
                <Text style={styles.prefixFlag}>🇮🇳</Text>
                <Text style={styles.prefixCode}>+91</Text>
              </View>
              <View style={styles.inputDivider} />
              <TextInput
                style={[styles.textInput, { paddingLeft: 10 }]}
                value={phone}
                onChangeText={v => {
                  let clean = v.replace(/\D/g, '');
                  if (clean.length > 10 && clean.startsWith('91')) {
                    clean = clean.slice(2);
                  }
                  clean = clean.slice(0, 10);
                  setPhone(clean);
                  if (formError) setFormError(null);
                }}
                placeholder="10-digit mobile number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                maxLength={10}
              />
              {phone.length === 10 && /^[6-9]\d{9}$/.test(phone) && (
                <View style={styles.inputEndIcon}>
                  <Check size={16} color="#16a34a" />
                </View>
              )}
            </View>
            <Text style={styles.fieldHint}>10 digits starting with 6, 7, 8, or 9</Text>
          </View>

          {/* Email Address */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Email Address (Optional)</Text>
              {email.length > 0 && <Text style={styles.charCounter}>{email.length}/80</Text>}
            </View>
            <View
              style={[
                styles.inputContainer,
                email.length > 0 && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)
                  ? styles.inputContainerSuccess
                  : null,
              ]}
            >
              <View style={styles.iconBox}>
                <Mail size={18} color="#64748b" />
              </View>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={v => {
                  const clean = v.toLowerCase().replace(/\s/g, '').slice(0, 80);
                  setEmail(clean);
                  if (formError) setFormError(null);
                }}
                placeholder="e.g. partner@example.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={80}
              />
              {email.length > 0 && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email) && (
                <View style={styles.inputEndIcon}>
                  <Check size={16} color="#16a34a" />
                </View>
              )}
            </View>
            <Text style={styles.fieldHint}>Optional • Used for communication and account recovery</Text>
          </View>
        </View>

        {/* STEP 2: Vehicle Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <View style={styles.cardHeaderCol}>
              <Text style={styles.cardTitle}>Vehicle Details</Text>
              <Text style={styles.cardSub}>Select the vehicle you will use for delivery</Text>
            </View>
          </View>

          {/* Vehicle Type Dropdown */}
          <Text style={styles.label}>
            Vehicle Type <Text style={styles.reqStar}>*</Text>
          </Text>
          <View style={styles.dropdownWrapper}>
            <TouchableOpacity
              style={[styles.dropdownTrigger, vehicleDropdownOpen && styles.dropdownTriggerActive]}
              onPress={() => setVehicleDropdownOpen(prev => !prev)}
              activeOpacity={0.8}
            >
              <View style={styles.dropdownLeft}>
                <Text style={styles.dropdownEmoji}>
                  {VEHICLE_TYPES.find(v => v.id === vehicleType)?.emoji || '🏍️'}
                </Text>
                <View>
                  <Text style={styles.dropdownSelectedLabel}>
                    {VEHICLE_TYPES.find(v => v.id === vehicleType)?.label || 'Bike'}
                  </Text>
                  <Text style={styles.dropdownSelectedDesc}>
                    {VEHICLE_TYPES.find(v => v.id === vehicleType)?.desc || ''}
                  </Text>
                </View>
              </View>
              {vehicleDropdownOpen ? (
                <ChevronUp size={20} color="#ea580c" />
              ) : (
                <ChevronDown size={20} color="#64748b" />
              )}
            </TouchableOpacity>

            {vehicleDropdownOpen && (
              <View style={styles.dropdownMenu}>
                {VEHICLE_TYPES.map(v => {
                  const isSelected = vehicleType === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.dropdownOption, isSelected && styles.dropdownOptionActive]}
                      onPress={() => {
                        setVehicleType(v.id);
                        setVehicleDropdownOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dropdownEmoji}>{v.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.dropdownOptionLabel, isSelected && styles.dropdownOptionLabelActive]}>
                          {v.label}
                        </Text>
                        <Text style={styles.dropdownOptionDesc}>{v.desc}</Text>
                      </View>
                      {isSelected && (
                        <View style={styles.dropdownCheckCircle}>
                          <Check size={12} color="#ffffff" strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Vehicle Registration Number */}
          <View style={[styles.inputGroup, { marginTop: 14 }]}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>
                Vehicle Registration Number{' '}
                {vehicleType !== 'BICYCLE' ? <Text style={styles.reqStar}>*</Text> : '(Optional for Bicycle)'}
              </Text>
              {vehicleNumber.length > 0 && <Text style={styles.charCounter}>{vehicleNumber.length}/13</Text>}
            </View>
            <View
              style={[
                styles.inputContainer,
                vehicleNumber.trim().length >= 6 &&
                /^([A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$/i.test(
                  vehicleNumber.replace(/[\s-]/g, '')
                )
                  ? styles.inputContainerSuccess
                  : null,
              ]}
            >
              <View style={styles.iconBox}>
                <Bike size={18} color="#64748b" />
              </View>
              <TextInput
                style={[styles.textInput, { letterSpacing: 0.8 }]}
                value={vehicleNumber}
                onChangeText={v => {
                  const sanitized = v
                    .toUpperCase()
                    .replace(/[^A-Z0-9 -]/g, '')
                    .slice(0, 13);
                  setVehicleNumber(sanitized);
                  if (formError) setFormError(null);
                }}
                placeholder="e.g. TN 09 AB 1234 or 22 BH 1234 AA"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                maxLength={13}
              />
              {vehicleNumber.trim().length >= 6 &&
                /^([A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$/i.test(
                  vehicleNumber.replace(/[\s-]/g, '')
                ) && (
                  <View style={styles.inputEndIcon}>
                    <Check size={16} color="#16a34a" />
                  </View>
                )}
            </View>
            <Text style={styles.fieldHint}>
              Standard Indian format: 2-letter state code + RTO + series + 4 digits
            </Text>
          </View>
        </View>

        {/* STEP 3: KYC Documents */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>3</Text>
            </View>
            <View style={styles.cardHeaderCol}>
              <Text style={styles.cardTitle}>KYC Documents</Text>
              <Text style={styles.cardSub}>Government-verified documents for verification</Text>
            </View>
          </View>

          {/* 1. Driving Licence */}
          <View style={styles.docItem}>
            <View style={styles.docLabelRow}>
              <CreditCard size={16} color="#475569" />
              <Text style={styles.label}>
                Driving Licence Number{' '}
                {vehicleType !== 'BICYCLE' ? <Text style={styles.reqStar}>*</Text> : '(Optional for Bicycle)'}
              </Text>
              {drivingLicenceNumber.length > 0 && (
                <Text style={[styles.charCounter, { marginLeft: 'auto' }]}>
                  {drivingLicenceNumber.length}/16
                </Text>
              )}
            </View>
            <View
              style={[
                styles.inputContainer,
                drivingLicenceNumber.replace(/[\s-]/g, '').length >= 10 &&
                /^[A-Z]{2}[0-9A-Z]{8,14}$/i.test(drivingLicenceNumber.replace(/[\s-]/g, ''))
                  ? styles.inputContainerSuccess
                  : null,
              ]}
            >
              <TextInput
                style={[styles.textInput, { paddingLeft: 14, letterSpacing: 0.5 }]}
                value={drivingLicenceNumber}
                onChangeText={v => {
                  const sanitized = v
                    .toUpperCase()
                    .replace(/[^A-Z0-9 -]/g, '')
                    .slice(0, 16);
                  setDrivingLicenceNumber(sanitized);
                  if (formError) setFormError(null);
                }}
                placeholder="e.g. DL-1420110012345"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                maxLength={16}
              />
              {drivingLicenceNumber.replace(/[\s-]/g, '').length >= 10 &&
                /^[A-Z]{2}[0-9A-Z]{8,14}$/i.test(drivingLicenceNumber.replace(/[\s-]/g, '')) && (
                  <View style={styles.inputEndIcon}>
                    <Check size={16} color="#16a34a" />
                  </View>
                )}
            </View>
            <Text style={styles.fieldHint}>
              10–16 alphanumeric characters starting with 2-letter state code
            </Text>
            <TouchableOpacity
              style={[styles.docUploadBox, drivingLicencePhoto ? styles.docUploadBoxSuccess : null]}
              onPress={() => !drivingLicencePhoto && handlePickDocument('dl')}
              activeOpacity={0.8}
            >
              {drivingLicencePhoto ? (
                <View style={styles.docSuccessRow}>
                  {drivingLicencePhoto.startsWith('data:application/pdf') || drivingLicenceFileName.toLowerCase().endsWith('.pdf') ? (
                    <View style={styles.pdfBadge}>
                      <FileText size={18} color="#dc2626" />
                      <Text style={styles.pdfBadgeText}>PDF</Text>
                    </View>
                  ) : (
                    <Image source={{ uri: drivingLicencePhoto }} style={styles.docThumb} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docSuccessTitle} numberOfLines={1}>
                      ✓ {drivingLicenceFileName || 'Driving Licence Attached'}
                    </Text>
                    <Text style={styles.docSuccessHint}>
                      {drivingLicencePhoto.startsWith('data:application/pdf') || drivingLicenceFileName.toLowerCase().endsWith('.pdf')
                        ? 'PDF document attached'
                        : 'Image attached'}
                    </Text>
                  </View>
                  <View style={styles.docActionButtons}>
                    <TouchableOpacity
                      onPress={() => handlePickDocument('dl')}
                      style={styles.docBtnChange}
                    >
                      <RefreshCw size={12} color="#2563eb" />
                      <Text style={styles.docBtnChangeText}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemoveDocument('dl')}
                      style={styles.docBtnRemove}
                    >
                      <Trash2 size={12} color="#dc2626" />
                      <Text style={styles.docBtnRemoveText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.docPromptRow}>
                  <View style={styles.uploadIconCircle}>
                    <UploadCloud size={16} color="#ea580c" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docPromptTitle}>Upload Driving Licence (Image or PDF)</Text>
                    <Text style={styles.docPromptSub}>Front-side image or PDF / PNG, JPG or PDF (Max 15MB)</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.docSeparator} />

          {/* 2. PAN Card */}
          <View style={styles.docItem}>
            <View style={styles.docLabelRow}>
              <FileText size={16} color="#475569" />
              <Text style={styles.label}>
                PAN Card Number <Text style={styles.reqStar}>*</Text>
              </Text>
              <Text style={[styles.charCounter, { marginLeft: 'auto' }]}>
                {panNumber.length}/10
              </Text>
            </View>
            <View
              style={[
                styles.inputContainer,
                panNumber.length === 10 && /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber)
                  ? styles.inputContainerSuccess
                  : null,
              ]}
            >
              <TextInput
                style={[styles.textInput, { paddingLeft: 14, letterSpacing: 1.2 }]}
                value={panNumber}
                onChangeText={v => {
                  const sanitized = v
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '')
                    .slice(0, 10);
                  setPanNumber(sanitized);
                  if (formError) setFormError(null);
                }}
                placeholder="e.g. ABCDE1234F"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                maxLength={10}
              />
              {panNumber.length === 10 && /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber) && (
                <View style={styles.inputEndIcon}>
                  <Check size={16} color="#16a34a" />
                </View>
              )}
            </View>
            <Text style={styles.fieldHint}>
              10 characters: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)
            </Text>
            <TouchableOpacity
              style={[styles.docUploadBox, panPhoto ? styles.docUploadBoxSuccess : null]}
              onPress={() => !panPhoto && handlePickDocument('pan')}
              activeOpacity={0.8}
            >
              {panPhoto ? (
                <View style={styles.docSuccessRow}>
                  {panPhoto.startsWith('data:application/pdf') || panFileName.toLowerCase().endsWith('.pdf') ? (
                    <View style={styles.pdfBadge}>
                      <FileText size={18} color="#dc2626" />
                      <Text style={styles.pdfBadgeText}>PDF</Text>
                    </View>
                  ) : (
                    <Image source={{ uri: panPhoto }} style={styles.docThumb} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docSuccessTitle} numberOfLines={1}>
                      ✓ {panFileName || 'PAN Card Attached'}
                    </Text>
                    <Text style={styles.docSuccessHint}>
                      {panPhoto.startsWith('data:application/pdf') || panFileName.toLowerCase().endsWith('.pdf')
                        ? 'PDF document attached'
                        : 'Image attached'}
                    </Text>
                  </View>
                  <View style={styles.docActionButtons}>
                    <TouchableOpacity
                      onPress={() => handlePickDocument('pan')}
                      style={styles.docBtnChange}
                    >
                      <RefreshCw size={12} color="#2563eb" />
                      <Text style={styles.docBtnChangeText}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemoveDocument('pan')}
                      style={styles.docBtnRemove}
                    >
                      <Trash2 size={12} color="#dc2626" />
                      <Text style={styles.docBtnRemoveText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.docPromptRow}>
                  <View style={styles.uploadIconCircle}>
                    <UploadCloud size={16} color="#ea580c" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docPromptTitle}>Upload PAN Card (Image or PDF)</Text>
                    <Text style={styles.docPromptSub}>Front-side image or PDF / PNG, JPG or PDF (Max 15MB)</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.docSeparator} />

          {/* 3. Aadhaar Card */}
          <View style={styles.docItem}>
            <View style={styles.docLabelRow}>
              <ShieldCheck size={16} color="#475569" />
              <Text style={styles.label}>
                Aadhaar Number <Text style={styles.reqStar}>*</Text>
              </Text>
              <Text style={[styles.charCounter, { marginLeft: 'auto' }]}>
                {aadhaarNumber.length}/12
              </Text>
            </View>
            <View
              style={[
                styles.inputContainer,
                aadhaarNumber.length === 12 &&
                /^[2-9][0-9]{11}$/.test(aadhaarNumber) &&
                !/^(\d)\1{11}$/.test(aadhaarNumber)
                  ? styles.inputContainerSuccess
                  : null,
              ]}
            >
              <TextInput
                style={[styles.textInput, { paddingLeft: 14, letterSpacing: 1.5 }]}
                value={aadhaarNumber}
                onChangeText={v => {
                  const sanitized = v.replace(/\D/g, '').slice(0, 12);
                  setAadhaarNumber(sanitized);
                  if (formError) setFormError(null);
                }}
                placeholder="12-digit Aadhaar Number"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                maxLength={12}
              />
              {aadhaarNumber.length === 12 &&
                /^[2-9][0-9]{11}$/.test(aadhaarNumber) &&
                !/^(\d)\1{11}$/.test(aadhaarNumber) && (
                  <View style={styles.inputEndIcon}>
                    <Check size={16} color="#16a34a" />
                  </View>
                )}
            </View>
            <Text style={styles.fieldHint}>
              12 digits, cannot start with 0 or 1
            </Text>
            <TouchableOpacity
              style={[styles.docUploadBox, aadhaarPhoto ? styles.docUploadBoxSuccess : null]}
              onPress={() => !aadhaarPhoto && handlePickDocument('aadhaar')}
              activeOpacity={0.8}
            >
              {aadhaarPhoto ? (
                <View style={styles.docSuccessRow}>
                  {aadhaarPhoto.startsWith('data:application/pdf') || aadhaarFileName.toLowerCase().endsWith('.pdf') ? (
                    <View style={styles.pdfBadge}>
                      <FileText size={18} color="#dc2626" />
                      <Text style={styles.pdfBadgeText}>PDF</Text>
                    </View>
                  ) : (
                    <Image source={{ uri: aadhaarPhoto }} style={styles.docThumb} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docSuccessTitle} numberOfLines={1}>
                      ✓ {aadhaarFileName || 'Aadhaar Card Attached'}
                    </Text>
                    <Text style={styles.docSuccessHint}>
                      {aadhaarPhoto.startsWith('data:application/pdf') || aadhaarFileName.toLowerCase().endsWith('.pdf')
                        ? 'PDF document attached'
                        : 'Image attached'}
                    </Text>
                  </View>
                  <View style={styles.docActionButtons}>
                    <TouchableOpacity
                      onPress={() => handlePickDocument('aadhaar')}
                      style={styles.docBtnChange}
                    >
                      <RefreshCw size={12} color="#2563eb" />
                      <Text style={styles.docBtnChangeText}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemoveDocument('aadhaar')}
                      style={styles.docBtnRemove}
                    >
                      <Trash2 size={12} color="#dc2626" />
                      <Text style={styles.docBtnRemoveText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.docPromptRow}>
                  <View style={styles.uploadIconCircle}>
                    <UploadCloud size={16} color="#ea580c" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docPromptTitle}>Upload Aadhaar (Image or PDF)</Text>
                    <Text style={styles.docPromptSub}>Front-side image or PDF / PNG, JPG or PDF (Max 15MB)</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* STEP 4: Account Security */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>4</Text>
            </View>
            <View style={styles.cardHeaderCol}>
              <Text style={styles.cardTitle}>Account Security</Text>
              <Text style={styles.cardSub}>Create a secure password to sign into your portal</Text>
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>
                Password <Text style={styles.reqStar}>*</Text>
              </Text>
              {password.length > 0 && (
                <Text style={[styles.charCounter, password.length >= 6 ? { color: '#16a34a' } : null]}>
                  {password.length >= 6 ? '✓ Strong' : `${password.length}/6 min`}
                </Text>
              )}
            </View>
            <View
              style={[
                styles.inputContainer,
                password.length >= 6 ? styles.inputContainerSuccess : null,
              ]}
            >
              <View style={styles.iconBox}>
                <Lock size={18} color="#64748b" />
              </View>
              <TextInput
                style={[styles.textInput, { paddingRight: 40 }]}
                value={password}
                onChangeText={v => {
                  setPassword(v.slice(0, 64));
                  if (formError) setFormError(null);
                }}
                placeholder="At least 6 characters"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                maxLength={64}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(prev => !prev)}
              >
                {showPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldHint}>Must be at least 6 characters long</Text>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>
                Confirm Password <Text style={styles.reqStar}>*</Text>
              </Text>
              {confirmPassword.length > 0 && password.length >= 6 && confirmPassword === password && (
                <Text style={[styles.charCounter, { color: '#16a34a', fontWeight: '700' }]}>
                  ✓ Passwords match
                </Text>
              )}
            </View>
            <View
              style={[
                styles.inputContainer,
                confirmPassword.length >= 6 && confirmPassword === password
                  ? styles.inputContainerSuccess
                  : confirmPassword.length > 0 && confirmPassword !== password
                  ? styles.inputContainerWarning
                  : null,
              ]}
            >
              <View style={styles.iconBox}>
                <Lock size={18} color="#64748b" />
              </View>
              <TextInput
                style={[styles.textInput, { paddingRight: 40 }]}
                value={confirmPassword}
                onChangeText={v => {
                  setConfirmPassword(v.slice(0, 64));
                  if (formError) setFormError(null);
                }}
                placeholder="Re-type password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showConfirmPassword}
                maxLength={64}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirmPassword(prev => !prev)}
              >
                {showConfirmPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
              </TouchableOpacity>
            </View>
            {confirmPassword.length > 0 && confirmPassword !== password ? (
              <Text style={[styles.fieldHint, { color: '#ef4444' }]}>
                Passwords do not match
              </Text>
            ) : (
              <Text style={styles.fieldHint}>Re-enter password for confirmation</Text>
            )}
          </View>
        </View>

        {/* STEP 5: Consent */}
        <TouchableOpacity
          style={styles.consentCard}
          onPress={() => setAgreeConsent(prev => !prev)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, agreeConsent && styles.checkboxActive]}>
            {agreeConsent && <Check size={14} color="#ffffff" strokeWidth={3} />}
          </View>
          <Text style={styles.consentText}>
            I agree to the <Text style={styles.consentBold}>Terms & Conditions</Text> and confirm
            that all submitted documents and information are accurate.
          </Text>
        </TouchableOpacity>

        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>Submit Application</Text>
              <ArrowRight size={18} color="#ffffff" strokeWidth={2.5} />
            </>
          )}
        </TouchableOpacity>

        <View style={styles.secureFooter}>
          <ShieldCheck size={14} color="#94a3b8" />
          <Text style={styles.secureFooterText}>Encrypted & Secure Onboarding Pipeline</Text>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  navBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  h2hLogoSmall: {
    width: 120,
    height: 34,
  },
  h2hLogo: {
    width: 160,
    height: 46,
  },
  fleetBadge: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  fleetBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroSection: {
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 29,
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12.5,
    color: '#b91c1c',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#edf2f7',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  cardHeaderCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
  },
  avatarWrap: {
    position: 'relative',
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  avatarPlaceholder: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarImg: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: '#ea580c',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: '#ea580c',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileMeta: {
    flex: 1,
  },
  profileTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  profileHint: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  uploadBtnMini: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  uploadBtnMiniText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ea580c',
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  charCounter: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  fieldHint: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    marginLeft: 2,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  reqStar: {
    color: '#ef4444',
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    height: 48,
  },
  inputContainerSuccess: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  inputContainerWarning: {
    borderColor: '#fca5a5',
  },
  inputEndIcon: {
    paddingRight: 12,
    justifyContent: 'center',
  },
  iconBox: {
    paddingLeft: 12,
    paddingRight: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0f172a',
    height: '100%',
    paddingRight: 12,
  },
  phonePrefixBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 6,
    gap: 4,
  },
  prefixFlag: {
    fontSize: 15,
  },
  prefixCode: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  inputDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#cbd5e1',
    marginRight: 4,
  },
  eyeBtn: {
    padding: 10,
  },
  dropdownWrapper: {
    position: 'relative',
    zIndex: 10,
    marginBottom: 4,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 52,
  },
  dropdownTriggerActive: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownEmoji: {
    fontSize: 20,
  },
  dropdownSelectedLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  dropdownSelectedDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  dropdownMenu: {
    marginTop: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 6,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    gap: 4,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  dropdownOptionActive: {
    backgroundColor: '#fff7ed',
  },
  dropdownOptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  dropdownOptionLabelActive: {
    color: '#ea580c',
    fontWeight: '700',
  },
  dropdownOptionDesc: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 1,
  },
  dropdownCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docItem: {
    marginVertical: 4,
  },
  docLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  docSeparator: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  docUploadBox: {
    marginTop: 8,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  docUploadBoxSuccess: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
    borderStyle: 'solid',
  },
  docPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  uploadIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docPromptTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1e293b',
  },
  docPromptSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  docSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  docSuccessTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#15803d',
  },
  docSuccessHint: {
    fontSize: 11,
    color: '#16a34a',
  },
  pdfBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#dc2626',
  },
  docActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docBtnChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  docBtnChangeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
  },
  docBtnRemove: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  docBtnRemoveText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#dc2626',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  consentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: '#ffffff',
  },
  checkboxActive: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  consentText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  consentBold: {
    fontWeight: '700',
    color: '#0f172a',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f97316',
    borderRadius: 14,
    height: 52,
    gap: 10,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  secureFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  secureFooterText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  // Success View Styles
  successScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  topLogoRow: {
    marginBottom: 20,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  successIconOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 3,
    borderColor: '#bbf7d0',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  successDescription: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  appMetaBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 18,
    gap: 10,
  },
  partnerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  partnerTopLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  partnerTopValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  credRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  credRowTexts: {
    flex: 1,
  },
  credLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  credValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 1,
  },
  credActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tinyIconBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tinyCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  tinyCopyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  statusActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ea580c',
    width: '100%',
    height: 48,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  statusActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: 8,
  },
  secondaryBtnText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
});
