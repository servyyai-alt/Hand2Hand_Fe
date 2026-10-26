import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Image,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  FileCheck,
  Bike,
  User,
  Phone,
  Search,
  UploadCloud,
  X,
  Lock,
  Copy,
  CreditCard,
  HelpCircle,
  FileText,
  File,
  LogIn,
  Mail,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import { apiClient } from '../../src/services/api.service';
import { useAppSelector } from '../../src/hooks/useAppSelector';
import { showToast, getApiError } from '../../src/utils/toast';
import { AnimatedClock } from '../../src/components/animations';

const VEHICLE_OPTIONS = [
  'Motorcycle / Bike',
  'Scooter / Activa',
  'Electric Scooter / EV',
  'Bicycle',
  'Auto / 3-Wheeler',
];

const VEHICLE_MAP: Record<string, string> = {
  'Motorcycle / Bike': 'BIKE',
  'Scooter / Activa': 'SCOOTER',
  'Electric Scooter / EV': 'EV_SCOOTER',
  'Bicycle': 'BICYCLE',
  'Auto / 3-Wheeler': 'AUTO',
};

export default function PartnerApplicationStatusScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const searchParams = useLocalSearchParams<{ phone?: string; applicationId?: string }>();
  const queryClient = useQueryClient();
  const authUser = useAppSelector(s => s.auth.user);

  // Phone lookup state
  const [lookupPhone, setLookupPhone] = useState(searchParams.phone || '');
  const [activePhone, setActivePhone] = useState(searchParams.phone || '');

  // Resubmit modal state
  const [resubmitModalOpen, setResubmitModalOpen] = useState(false);
  const [resubmitForm, setResubmitForm] = useState({
    vehicleType: 'Motorcycle / Bike',
    vehicleNumber: '',
    drivingLicenceNumber: '',
    drivingLicencePhoto: '',
    panNumber: '',
    panPhoto: '',
    aadhaarNumber: '',
    aadhaarPhoto: '',
    profilePhoto: '',
  });
  const [resubmitError, setResubmitError] = useState<string | null>(null);

  // Query live application status
  const { data: appData, isLoading, refetch, isRefetching, error } = useQuery({
    queryKey: ['partner', 'application-status', activePhone, authUser?.id],
    queryFn: async () => {
      let url = '/delivery-partners/application-status';
      if (activePhone) {
        url += `?phone=${encodeURIComponent(activePhone)}`;
      }
      const res = await apiClient.get(url);
      return res.data.data;
    },
    enabled: Boolean(authUser?.role === 'DELIVERY_PARTNER' || activePhone),
    refetchInterval: 2500,
    retry: 1,
  });

  const handleLookupSubmit = () => {
    const clean = lookupPhone.trim().replace(/^\+91/, '').replace(/\D/g, '');
    if (!clean || clean.length !== 10) {
      showToast('error', 'Invalid Phone', 'Please enter a 10-digit mobile number.');
      return;
    }
    setActivePhone(clean);
  };

  // Resubmit mutation
  const resubmitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/delivery-partners/resubmit', payload);
      return res.data;
    },
    onSuccess: () => {
      showToast('success', 'Application Resubmitted', 'Your updated application is under review.');
      setResubmitModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['partner', 'application-status'] });
      refetch();
    },
    onError: (err: any) => {
      const msg = getApiError(err);
      setResubmitError(msg);
      showToast('error', 'Resubmission failed', msg);
    },
  });

  const [resubmitFileNames, setResubmitFileNames] = useState<Record<string, string>>({});

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

  const handlePickDocument = async (field: 'drivingLicencePhoto' | 'panPhoto' | 'aadhaarPhoto' | 'profilePhoto') => {
    if (field === 'profilePhoto') {
      if (Platform.OS === 'web') {
        try {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/jpeg,image/png,image/webp';
          input.onchange = (e: any) => {
            const file = e.target?.files?.[0];
            if (!file) return;
            if (file.size > 15 * 1024 * 1024) {
              showToast('error', 'File Too Large', 'Selected file exceeds the 15MB limit.');
              return;
            }
            if (!file.type.startsWith('image/')) {
              showToast('error', 'Unsupported File', 'Please upload a JPG, PNG, or WEBP image.');
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              setResubmitForm(prev => ({ ...prev, profilePhoto: reader.result as string }));
              setResubmitFileNames(prev => ({ ...prev, profilePhoto: file.name }));
              showToast('success', 'Profile Photo Selected', file.name);
            };
            reader.readAsDataURL(file);
          };
          input.click();
        } catch {
          showToast('error', 'Selection Failed', 'Could not open file picker.');
        }
      } else {
        try {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            showToast('error', 'Permission Required', 'Please allow gallery access to upload documents.');
            return;
          }
          const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.65,
            base64: true,
          });
          if (!res.canceled && res.assets && res.assets[0]) {
            const asset = res.assets[0];
            const dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
            setResubmitForm(prev => ({ ...prev, profilePhoto: dataUri }));
            setResubmitFileNames(prev => ({ ...prev, profilePhoto: asset.fileName || 'profile.jpg' }));
            showToast('success', 'Document Attached', 'Profile photo updated.');
          }
        } catch {
          showToast('error', 'Selection Failed', 'Could not open image library.');
        }
      }
      return;
    }

    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/webp,application/pdf';
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (!file) return;
          if (file.size > 15 * 1024 * 1024) {
            showToast('error', 'File Too Large', 'Selected file exceeds the 15MB limit.');
            return;
          }
          const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
          const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
          const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
          if (!validTypes.includes(file.type) && !validExts.includes(fileExt)) {
            showToast('error', 'Unsupported File', 'Please upload a JPG, PNG, or PDF file.');
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            setResubmitForm(prev => ({ ...prev, [field]: reader.result as string }));
            setResubmitFileNames(prev => ({ ...prev, [field]: file.name }));
            showToast('success', 'Document Selected', file.name);
          };
          reader.readAsDataURL(file);
        };
        input.click();
      } catch {
        showToast('error', 'Selection Failed', 'Could not open file picker.');
      }
    } else {
      try {
        const res = await DocumentPicker.getDocumentAsync({
          type: ['image/*', 'application/pdf'],
          copyToCacheDirectory: true,
        });
        if (!res.canceled && res.assets && res.assets[0]) {
          const asset = res.assets[0];
          if (asset.size && asset.size > 15 * 1024 * 1024) {
            showToast('error', 'File Too Large', 'Selected file exceeds the 15MB limit.');
            return;
          }
          setResubmitForm(prev => ({ ...prev, [field]: asset.uri }));
          setResubmitFileNames(prev => ({ ...prev, [field]: asset.name }));
          showToast('success', 'Document Attached', asset.name);
        }
      } catch {
        showToast('error', 'Selection Failed', 'Could not open document picker.');
      }
    }
  };

  const openResubmitModal = () => {
    setResubmitError(null);
    setResubmitForm({
      vehicleType: appData?.vehicle?.type || 'Motorcycle / Bike',
      vehicleNumber: appData?.vehicle?.registrationNumber || '',
      drivingLicenceNumber: appData?.kyc?.drivingLicenceNumber || '',
      drivingLicencePhoto: '',
      panNumber: appData?.kyc?.panNumber || '',
      panPhoto: '',
      aadhaarNumber: appData?.kyc?.aadhaarNumber || '',
      aadhaarPhoto: '',
      profilePhoto: '',
    });
    setResubmitModalOpen(true);
  };

  const handleDoResubmit = () => {
    setResubmitError(null);
    const backendVehicle = VEHICLE_MAP[resubmitForm.vehicleType] || resubmitForm.vehicleType || 'BIKE';
    const payload: any = {
      vehicleType: backendVehicle,
      vehicleNumber: resubmitForm.vehicleNumber.trim().toUpperCase(),
      drivingLicenceNumber: resubmitForm.drivingLicenceNumber.trim().toUpperCase(),
      panNumber: resubmitForm.panNumber.trim().toUpperCase(),
      aadhaarNumber: resubmitForm.aadhaarNumber.trim().replace(/\D/g, ''),
    };

    if (resubmitForm.drivingLicencePhoto) payload.drivingLicencePhoto = resubmitForm.drivingLicencePhoto;
    if (resubmitForm.panPhoto) payload.panPhoto = resubmitForm.panPhoto;
    if (resubmitForm.aadhaarPhoto) payload.aadhaarPhoto = resubmitForm.aadhaarPhoto;
    if (resubmitForm.profilePhoto) payload.profilePhoto = resubmitForm.profilePhoto;

    resubmitMutation.mutate(payload);
  };

  // Status mapping
  const status = appData?.status || 'PENDING';
  const adminStatus = appData?.adminApproval?.status || appData?.adminApprovalStatus || 'PENDING';
  const superAdminStatus = appData?.superAdminApproval?.status || appData?.superAdminApprovalStatus || 'PENDING';
  const rejectionReason = appData?.rejectionReason || '';

  const isApproved =
    appData?.status === 'ACTIVE' ||
    appData?.approvalStatus === 'APPROVED' ||
    appData?.accountStatus === 'ACTIVE' ||
    Boolean(appData?.canWork) ||
    Boolean(appData?.isActive) ||
    (adminStatus === 'APPROVED' && superAdminStatus === 'APPROVED') ||
    superAdminStatus === 'APPROVED' ||
    adminStatus === 'APPROVED';

  const isRejected =
    status === 'REJECTED' || adminStatus === 'REJECTED' || superAdminStatus === 'REJECTED';

  // If user is authenticated as partner and approved, redirect directly to dashboard
  useEffect(() => {
    if (isApproved && authUser && authUser.role === 'DELIVERY_PARTNER') {
      router.replace('/(partner)');
    }
  }, [isApproved, authUser]);

  const formatShortDate = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  // Determine current badge style & label
  let badgeLabel = 'PENDING VERIFICATION';
  let badgeColor = '#b45309';
  let badgeBg = '#fef3c7';

  if (isApproved) {
    badgeLabel = 'APPROVED';
    badgeColor = '#15803d';
    badgeBg = '#dcfce7';
  } else if (isRejected) {
    badgeLabel = 'REJECTED';
    badgeColor = '#b91c1c';
    badgeBg = '#fee2e2';
  } else if (adminStatus === 'APPROVED' && superAdminStatus !== 'APPROVED') {
    badgeLabel = 'ADMIN APPROVED (Waiting for Super Admin)';
    badgeColor = '#1d4ed8';
    badgeBg = '#dbeafe';
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Top Bar */}
      <View style={styles.navBar}>
        <View style={styles.navBarInner}>
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
            style={styles.logoImg}
            resizeMode="contain"
          />
          <View style={styles.headerPartnerPill}>
            <Text style={styles.headerPartnerPillText}>PARTNER</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              Haptics.selectionAsync();
              refetch();
            }}
            tintColor="#f97316"
            colors={['#f97316']}
          />
        }
      >
        {/* Lookup Bar if not logged in and no phone */}
        {!authUser && (
          <View style={styles.lookupCard}>
            <Text style={styles.lookupTitle}>Check Application Status</Text>
            <Text style={styles.lookupSub}>
              Enter your registered 10-digit mobile number to track review progress.
            </Text>
            <View style={styles.lookupRow}>
              <View style={styles.lookupInputWrap}>
                <Phone size={18} color="#64748b" style={{ marginRight: 8 }} />
                <Text style={styles.lookupPrefix}>+91</Text>
                <TextInput
                  style={styles.lookupInput}
                  value={lookupPhone}
                  onChangeText={v => setLookupPhone(v.replace(/\D/g, ''))}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              <TouchableOpacity
                style={styles.lookupBtn}
                onPress={handleLookupSubmit}
                activeOpacity={0.8}
              >
                <Search size={18} color="#ffffff" />
                <Text style={styles.lookupBtnText}>Check</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={styles.loadingText}>Fetching verification status...</Text>
          </View>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <View style={styles.notFoundCard}>
            <AlertTriangle size={36} color="#eab308" />
            <Text style={styles.notFoundTitle}>No Application Found</Text>
            <Text style={styles.notFoundSub}>
              We couldn't find an application associated with this mobile number. Please check the
              number or submit a new onboarding application.
            </Text>
            <TouchableOpacity
              style={styles.applyNowBtn}
              onPress={() => router.push('/partner/apply' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.applyNowBtnText}>Submit New Application</Text>
              <ArrowRight size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Live Data Display */}
        {!isLoading && appData && (
          <>
            {/* PROMINENT PARTNER ID CARD */}
            <View style={styles.partnerIdHeroCard}>
              <View style={styles.partnerIdTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.partnerIdSubtitle}>DELIVERY PARTNER ID</Text>
                  <Text style={styles.partnerIdTitle}>
                    {appData?.partnerId || authUser?.partnerId || appData?.user?.partnerId || `H2H-DP-${(appData?.applicationId || 'PENDING').toString().slice(-6).toUpperCase()}`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.copyIdBtn}
                  onPress={() => {
                    const idVal = appData?.partnerId || authUser?.partnerId || appData?.user?.partnerId || `H2H-DP-${(appData?.applicationId || 'PENDING').toString().slice(-6).toUpperCase()}`;
                    handleCopyText(idVal, 'Partner ID Copied');
                  }}
                  activeOpacity={0.7}
                >
                  <Copy size={14} color="#ea580c" />
                  <Text style={styles.copyIdBtnText}>Copy ID</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.partnerIdDivider} />

              <View style={styles.partnerMetaRow}>
                <View style={[
                  styles.partnerStatusPill,
                  isApproved ? styles.partnerStatusPillApproved : isRejected ? styles.partnerStatusPillRejected : styles.partnerStatusPillPending
                ]}>
                  <Text style={styles.partnerStatusDot}>
                    {isApproved ? '🟢' : isRejected ? '🔴' : '🟡'}
                  </Text>
                  <Text style={[
                    styles.partnerStatusPillText,
                    isApproved ? styles.partnerStatusPillTextApproved : isRejected ? styles.partnerStatusPillTextRejected : styles.partnerStatusPillTextPending
                  ]}>
                    {isApproved ? 'Active Partner' : isRejected ? 'Application Rejected' : 'Under Verification'}
                  </Text>
                </View>

                {appData?.applicationSubmittedAt && (
                  <Text style={styles.appRefDateValue}>
                    Submitted {formatShortDate(appData.applicationSubmittedAt)}
                  </Text>
                )}
              </View>
            </View>

            {/* MAIN STATUS BANNER */}
            {isApproved ? (
              <View style={styles.approvedBanner}>
                <View style={styles.bannerIconGreen}>
                  <CheckCircle2 size={36} color="#16a34a" />
                </View>
                <Text style={styles.approvedTitle}>Application Approved!</Text>
                <Text style={styles.approvedSub}>
                  Congratulations! Your onboarding documents have been verified and approved.
                </Text>
                <TouchableOpacity
                  style={styles.actionGreenBtn}
                  onPress={() => router.replace('/(partner)')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.actionGreenBtnText}>Go to Partner Dashboard</Text>
                  <ArrowRight size={18} color="#ffffff" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : isRejected ? (
              <View style={styles.rejectedBanner}>
                <View style={styles.bannerIconRed}>
                  <AlertTriangle size={36} color="#dc2626" />
                </View>
                <Text style={styles.rejectedTitle}>Application Rejected</Text>
                <Text style={styles.rejectedSub}>
                  Your onboarding application was rejected during the verification review.
                </Text>
                <View style={styles.rejectionReasonBox}>
                  <Text style={styles.rejectionReasonHeader}>REASON FOR REJECTION:</Text>
                  <Text style={styles.rejectionReasonText}>
                    {rejectionReason || 'Uploaded documents could not be verified. Please check and re-upload valid identity documents.'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.actionOrangeBtn}
                  onPress={openResubmitModal}
                  activeOpacity={0.85}
                >
                  <RefreshCw size={18} color="#ffffff" />
                  <Text style={styles.actionOrangeBtnText}>Resubmit Application</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pendingBanner}>
                <View style={styles.clockWrapper}>
                  <AnimatedClock size={68} />
                </View>
                <Text style={styles.pendingTitle}>Under Verification</Text>
                <Text style={styles.pendingSub}>
                  Your application has been received and is currently under review.{'\n\n'}
                  You will be notified once your profile has been approved and activated.
                </Text>
              </View>
            )}

            {/* SUBMITTED DETAILS CARD */}
            <View style={styles.detailsCard}>
              <Text style={styles.detailsCardTitle}>Submitted Details</Text>

              <Text style={styles.detailSubheading}>PERSONAL DETAILS</Text>
              <View style={styles.detailRow}>
                <View style={styles.detailRowLeft}>
                  <User size={15} color="#ea580c" />
                  <Text style={styles.detailLabel}>Name</Text>
                </View>
                <Text style={styles.detailVal} numberOfLines={1}>{appData.user?.name || '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <View style={styles.detailRowLeft}>
                  <Phone size={15} color="#ea580c" />
                  <Text style={styles.detailLabel}>Phone</Text>
                </View>
                <Text style={styles.detailVal} numberOfLines={1}>+91 {appData.user?.phone || '—'}</Text>
              </View>
              {appData.user?.email ? (
                <View style={styles.detailRow}>
                  <View style={styles.detailRowLeft}>
                    <Mail size={15} color="#ea580c" />
                    <Text style={styles.detailLabel}>Email</Text>
                  </View>
                  <Text style={styles.detailVal} numberOfLines={1}>{appData.user.email}</Text>
                </View>
              ) : null}

              <Text style={[styles.detailSubheading, { marginTop: 10 }]}>VEHICLE DETAILS</Text>
              <View style={styles.detailRow}>
                <View style={styles.detailRowLeft}>
                  <Bike size={15} color="#ea580c" />
                  <Text style={styles.detailLabel}>Vehicle Type</Text>
                </View>
                <Text style={styles.detailVal} numberOfLines={1}>{appData.vehicle?.type || appData.profile?.vehicle?.type || 'Bike'}</Text>
              </View>
              <View style={styles.detailRow}>
                <View style={styles.detailRowLeft}>
                  <CreditCard size={15} color="#ea580c" />
                  <Text style={styles.detailLabel}>Registration</Text>
                </View>
                <Text style={styles.detailVal} numberOfLines={1}>{appData.vehicle?.registrationNumber || appData.profile?.vehicle?.plateNumber || 'Pending'}</Text>
              </View>
            </View>

            {/* KYC DOCUMENT CHECKLIST */}
            <View style={styles.detailsCard}>
              <View style={styles.checklistHeaderRow}>
                <ShieldCheck size={18} color="#ea580c" />
                <Text style={styles.detailsCardTitle}>KYC Document Checklist</Text>
              </View>

              {/* Driving Licence */}
              {(() => {
                const doc = appData?.kycDocuments?.find((d: any) => d.type === 'DRIVING_LICENCE');
                const isSub = doc ? doc.submitted : Boolean(appData?.profile?.kyc?.drivingLicencePhoto || appData?.kyc?.drivingLicenceNumber);
                const mask = doc?.maskedNumber || (appData?.kyc?.drivingLicenceNumber ? `DL********${appData.kyc.drivingLicenceNumber.slice(-3)}` : 'Submitted');
                return (
                  <View style={styles.checklistItemRow}>
                    <View style={styles.checklistItemInfo}>
                      <CreditCard size={16} color="#64748b" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.checklistItemName}>Driving Licence</Text>
                        <Text style={styles.checklistItemNumber}>DL Number: {mask}</Text>
                      </View>
                    </View>
                    <View style={[styles.docBadge, isSub ? styles.docBadgeDone : styles.docBadgePending]}>
                      <Text style={[styles.docBadgeText, isSub ? styles.docBadgeTextDone : styles.docBadgeTextPending]}>
                        {isSub ? '✓ Submitted' : '⚠ Pending'}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              <View style={styles.checklistRowDivider} />

              {/* PAN Card */}
              {(() => {
                const doc = appData?.kycDocuments?.find((d: any) => d.type === 'PAN_CARD');
                const isSub = doc ? doc.submitted : Boolean(appData?.profile?.kyc?.panPhoto || appData?.kyc?.panNumber);
                const mask = doc?.maskedNumber || (appData?.kyc?.panNumber ? `${appData.kyc.panNumber.slice(0, 5)}****${appData.kyc.panNumber.slice(-1)}` : 'Submitted');
                return (
                  <View style={styles.checklistItemRow}>
                    <View style={styles.checklistItemInfo}>
                      <FileText size={16} color="#64748b" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.checklistItemName}>PAN Card</Text>
                        <Text style={styles.checklistItemNumber}>PAN: {mask}</Text>
                      </View>
                    </View>
                    <View style={[styles.docBadge, isSub ? styles.docBadgeDone : styles.docBadgePending]}>
                      <Text style={[styles.docBadgeText, isSub ? styles.docBadgeTextDone : styles.docBadgeTextPending]}>
                        {isSub ? '✓ Submitted' : '⚠ Pending'}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              <View style={styles.checklistRowDivider} />

              {/* Aadhaar Card */}
              {(() => {
                const doc = appData?.kycDocuments?.find((d: any) => d.type === 'AADHAAR_CARD');
                const isSub = doc ? doc.submitted : Boolean(appData?.profile?.kyc?.aadhaarPhoto || appData?.kyc?.aadhaarNumber);
                const mask = doc?.maskedNumber || (appData?.kyc?.aadhaarNumber ? `XXXX XXXX ${appData.kyc.aadhaarNumber.slice(-4)}` : 'Submitted');
                return (
                  <View style={styles.checklistItemRow}>
                    <View style={styles.checklistItemInfo}>
                      <ShieldCheck size={16} color="#64748b" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.checklistItemName}>Aadhaar Card</Text>
                        <Text style={styles.checklistItemNumber}>Aadhaar: {mask}</Text>
                      </View>
                    </View>
                    <View style={[styles.docBadge, isSub ? styles.docBadgeDone : styles.docBadgePending]}>
                      <Text style={[styles.docBadgeText, isSub ? styles.docBadgeTextDone : styles.docBadgeTextPending]}>
                        {isSub ? '✓ Submitted' : '⚠ Pending'}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              <View style={styles.checklistRowDivider} />

              {/* Profile Photo */}
              {(() => {
                const hasAvatar = Boolean(appData?.user?.avatar || appData?.profile?.profilePhoto);
                return (
                  <View style={styles.checklistItemRow}>
                    <View style={styles.checklistItemInfo}>
                      <User size={16} color="#64748b" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.checklistItemName}>Profile Photo</Text>
                        <Text style={styles.checklistItemNumber}>Passport front photo</Text>
                      </View>
                    </View>
                    <View style={[styles.docBadge, hasAvatar ? styles.docBadgeDone : styles.docBadgePending]}>
                      <Text style={[styles.docBadgeText, hasAvatar ? styles.docBadgeTextDone : styles.docBadgeTextPending]}>
                        {hasAvatar ? '✓ Submitted' : '⚠ Pending'}
                      </Text>
                    </View>
                  </View>
                );
              })()}
            </View>

            {/* ACTION OPTIONS */}
            <View style={styles.actionsBox}>
              <TouchableOpacity
                style={styles.actionBtnWhite}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  refetch();
                  showToast('info', 'Status Refreshed', 'Checking latest verification updates.');
                }}
                activeOpacity={0.8}
              >
                <RefreshCw size={16} color="#0f172a" />
                <Text style={styles.actionBtnWhiteText}>Refresh Status</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnOrange}
                onPress={() => {
                  const partnerId = appData?.partnerId || 'DP';
                  const email = 'partner-support@hand2hand.com';
                  const subject = encodeURIComponent(`Application Inquiry - Partner ${partnerId}`);
                  const body = encodeURIComponent(`Hi H2H Support,\n\nI have an inquiry regarding my Delivery Partner application (${partnerId}).\nName: ${appData?.user?.name || ''}\nPhone: ${appData?.user?.phone || activePhone || ''}\n\n`);
                  Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`).catch(() => {
                    showToast('info', 'Support Email', 'partner-support@hand2hand.com');
                  });
                }}
                activeOpacity={0.8}
              >
                <HelpCircle size={16} color="#ea580c" />
                <Text style={styles.actionBtnOrangeText}>Contact Support</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnDark}
                onPress={() => router.push('/(auth)/partner-login' as any)}
                activeOpacity={0.85}
              >
                <LogIn size={16} color="#ffffff" />
                <Text style={styles.actionBtnDarkText}>Sign In to Partner Portal</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Resubmit Modal */}
      <Modal visible={resubmitModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update & Resubmit</Text>
              <TouchableOpacity
                onPress={() => setResubmitModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {resubmitError && (
                <View style={styles.modalErrorBox}>
                  <Text style={styles.modalErrorText}>{resubmitError}</Text>
                </View>
              )}

              {/* Vehicle Number */}
              <Text style={styles.modalLabel}>Vehicle Registration Number</Text>
              <TextInput
                style={styles.modalInput}
                value={resubmitForm.vehicleNumber}
                onChangeText={v =>
                  setResubmitForm(p => ({ ...p, vehicleNumber: v.toUpperCase() }))
                }
                placeholder="e.g. TN 09 AB 1234"
                autoCapitalize="characters"
              />

              {/* DL Number & Photo */}
              <Text style={styles.modalLabel}>Driving Licence Number</Text>
              <TextInput
                style={styles.modalInput}
                value={resubmitForm.drivingLicenceNumber}
                onChangeText={v =>
                  setResubmitForm(p => ({ ...p, drivingLicenceNumber: v.toUpperCase() }))
                }
                placeholder="DL Number"
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.modalDocBtn}
                onPress={() => handlePickDocument('drivingLicencePhoto')}
              >
                <UploadCloud size={16} color="#64748b" />
                <Text style={styles.modalDocBtnText} numberOfLines={1}>
                  {resubmitForm.drivingLicencePhoto
                    ? `✓ ${resubmitFileNames.drivingLicencePhoto || 'DL Document Selected'}`
                    : 'Upload Driving Licence (Image or PDF)'}
                </Text>
              </TouchableOpacity>

              {/* PAN Number & Photo */}
              <Text style={styles.modalLabel}>PAN Number</Text>
              <TextInput
                style={styles.modalInput}
                value={resubmitForm.panNumber}
                onChangeText={v => setResubmitForm(p => ({ ...p, panNumber: v.toUpperCase() }))}
                placeholder="PAN Number"
                autoCapitalize="characters"
                maxLength={10}
              />
              <TouchableOpacity
                style={styles.modalDocBtn}
                onPress={() => handlePickDocument('panPhoto')}
              >
                <UploadCloud size={16} color="#64748b" />
                <Text style={styles.modalDocBtnText} numberOfLines={1}>
                  {resubmitForm.panPhoto
                    ? `✓ ${resubmitFileNames.panPhoto || 'PAN Document Selected'}`
                    : 'Upload PAN Card (Image or PDF)'}
                </Text>
              </TouchableOpacity>

              {/* Aadhaar Number & Photo */}
              <Text style={styles.modalLabel}>Aadhaar Number</Text>
              <TextInput
                style={styles.modalInput}
                value={resubmitForm.aadhaarNumber}
                onChangeText={v =>
                  setResubmitForm(p => ({ ...p, aadhaarNumber: v.replace(/\D/g, '') }))
                }
                placeholder="12-digit Aadhaar"
                keyboardType="numeric"
                maxLength={12}
              />
              <TouchableOpacity
                style={styles.modalDocBtn}
                onPress={() => handlePickDocument('aadhaarPhoto')}
              >
                <UploadCloud size={16} color="#64748b" />
                <Text style={styles.modalDocBtnText} numberOfLines={1}>
                  {resubmitForm.aadhaarPhoto
                    ? `✓ ${resubmitFileNames.aadhaarPhoto || 'Aadhaar Document Selected'}`
                    : 'Upload Aadhaar (Image or PDF)'}
                </Text>
              </TouchableOpacity>

              {/* Submit Resubmission */}
              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  resubmitMutation.isPending && { opacity: 0.7 },
                ]}
                onPress={handleDoResubmit}
                disabled={resubmitMutation.isPending}
              >
                {resubmitMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Resubmit for Review</Text>
                )}
              </TouchableOpacity>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  navBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  navBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: {
    width: 104,
    height: 28,
  },
  headerPartnerPill: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  headerPartnerPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ea580c',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 40,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  lookupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  lookupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  lookupSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 12,
  },
  lookupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lookupInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 44,
  },
  lookupPrefix: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
    marginRight: 6,
  },
  lookupInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0f172a',
  },
  lookupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f97316',
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 10,
  },
  lookupBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 10,
  },
  notFoundCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fef08a',
    marginTop: 10,
  },
  notFoundTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#854d0e',
    marginTop: 10,
  },
  notFoundSub: {
    fontSize: 12.5,
    color: '#713f12',
    textAlign: 'center',
    marginVertical: 10,
    lineHeight: 18,
  },
  applyNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f97316',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  applyNowBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  appRefCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  appRefLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  appRefValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  applicantName: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  appRefDateLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  appRefDateValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 2,
  },
  statusBadgeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  statusSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  mainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  mainBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  approvedBanner: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    marginBottom: 14,
  },
  bannerIconGreen: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  approvedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#15803d',
    marginBottom: 6,
  },
  approvedSub: {
    fontSize: 13,
    color: '#166534',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  actionGreenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionGreenBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  pendingBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  clockWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  pendingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
  },
  pendingSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  rejectedBanner: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    marginBottom: 14,
  },
  bannerIconRed: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  rejectedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#b91c1c',
    marginBottom: 6,
  },
  rejectedSub: {
    fontSize: 13,
    color: '#991b1b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  rejectionReasonBox: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fca5a5',
    marginBottom: 16,
  },
  rejectionReasonHeader: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#b91c1c',
    marginBottom: 4,
  },
  rejectionReasonText: {
    fontSize: 12.5,
    color: '#7f1d1d',
    lineHeight: 18,
  },
  actionOrangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f97316',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionOrangeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  trackerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  trackerCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
  },
  stepIconCol: {
    alignItems: 'center',
    width: 32,
    marginRight: 12,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: '#16a34a',
  },
  stepDotActive: {
    backgroundColor: '#f97316',
  },
  stepDotRejected: {
    backgroundColor: '#dc2626',
  },
  stepDotPending: {
    backgroundColor: '#cbd5e1',
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 36,
  },
  stepLineDone: {
    backgroundColor: '#16a34a',
  },
  stepLinePending: {
    backgroundColor: '#e2e8f0',
  },
  stepContent: {
    flex: 1,
    paddingBottom: 20,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  stepDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  stepTimestamp: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '600',
    marginTop: 2,
  },
  stepBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stepBadgeDone: {
    backgroundColor: '#dcfce7',
  },
  stepBadgeDoneText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  stepBadgeActive: {
    backgroundColor: '#ffedd5',
  },
  stepBadgeActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c2410c',
  },
  stepBadgeRejected: {
    backgroundColor: '#fee2e2',
  },
  stepBadgeRejectedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b91c1c',
  },
  stepBadgePending: {
    backgroundColor: '#f1f5f9',
  },
  stepBadgePendingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  stepBadgeText: {},

  // Partner ID Hero Card
  partnerIdHeroCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
    marginBottom: 14,
  },
  partnerIdTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  partnerIdSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  partnerIdTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  copyIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyIdBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
  },
  partnerIdDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  partnerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  partnerStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  partnerStatusPillPending: {
    backgroundColor: '#fef3c7',
  },
  partnerStatusPillApproved: {
    backgroundColor: '#dcfce7',
  },
  partnerStatusPillRejected: {
    backgroundColor: '#fee2e2',
  },
  partnerStatusDot: {
    fontSize: 12,
  },
  partnerStatusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  partnerStatusPillTextPending: {
    color: '#b45309',
  },
  partnerStatusPillTextApproved: {
    color: '#15803d',
  },
  partnerStatusPillTextRejected: {
    color: '#b91c1c',
  },

  bannerIconAmber: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  // Details Card
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 12,
    gap: 8,
  },
  detailsCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 6,
  },
  detailSubheading: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  detailRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 0,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  detailVal: {
    fontSize: 12.5,
    color: '#0f172a',
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
  },

  // Checklist
  checklistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
    marginBottom: 4,
  },
  checklistItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 3,
  },
  checklistItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  checklistItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  checklistItemNumber: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 1,
  },
  checklistRowDivider: {
    height: 1,
    backgroundColor: '#f8fafc',
    marginVertical: 3,
  },
  docBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  docBadgeDone: {
    backgroundColor: '#dcfce7',
  },
  docBadgePending: {
    backgroundColor: '#fef3c7',
  },
  docBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  docBadgeTextDone: {
    color: '#15803d',
  },
  docBadgeTextPending: {
    color: '#b45309',
  },

  // Actions
  actionsBox: {
    gap: 10,
    marginTop: 14,
  },
  actionBtnWhite: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
  },
  actionBtnWhiteText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  actionBtnOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
  },
  actionBtnOrangeText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ea580c',
  },
  actionBtnDark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: '#0f172a',
    borderRadius: 12,
  },
  actionBtnDarkText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalScroll: {
    marginBottom: 10,
  },
  modalErrorBox: {
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalErrorText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
  },
  modalLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  modalDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    justifyContent: 'center',
  },
  modalDocBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  modalSubmitBtn: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
