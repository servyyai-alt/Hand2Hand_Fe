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
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  LogOut,
  RefreshCw,
  FileText,
  UploadCloud,
  FileCheck,
  Bike,
  User,
  Phone,
  Mail,
  ChevronRight,
  X,
  Copy,
  CreditCard,
  HelpCircle,
  File,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import { apiClient } from '../../src/services/api.service';
import { storageService } from '../../src/services/storage.service';
import { useAppDispatch, useAppSelector } from '../../src/hooks/useAppSelector';
import { logout, updateUser } from '../../src/store/slices/authSlice';
import { colors } from '../../src/theme';
import { getApiError, showToast } from '../../src/utils/toast';
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
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const authUser = useAppSelector(s => s.auth.user);

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

  // Fetch live application status
  const { data: appData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['partner', 'application-status'],
    queryFn: async () => {
      const res = await apiClient.get('/delivery-partners/application-status');
      const data = res.data.data;
      if (data?.user) {
        // Sync local auth store if status changed
        dispatch(updateUser(data.user));
        try {
          await storageService.saveUser({ ...authUser, ...data.user });
        } catch {}
      }
      return data;
    },
    refetchInterval: 2500,
  });

  // Resubmit mutation
  const resubmitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/delivery-partners/resubmit', payload);
      return res.data;
    },
    onSuccess: (data) => {
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

  const handleLogout = async () => {
    try {
      await storageService.clearAll();
      dispatch(logout());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('info', 'Logged Out', 'Signed out of Delivery Partner Portal.');
      router.replace('/(auth)/login');
    } catch {
      router.replace('/(auth)/login');
    }
  };

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
      // Image only
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

    // PDF and Image for DL, PAN, Aadhaar
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
      vehicleType: appData?.profile?.vehicle?.type || 'Motorcycle / Bike',
      vehicleNumber: appData?.profile?.vehicle?.plateNumber || '',
      drivingLicenceNumber: appData?.profile?.kyc?.drivingLicenceNumber || '',
      drivingLicencePhoto: '',
      panNumber: appData?.profile?.kyc?.panNumber || '',
      panPhoto: '',
      aadhaarNumber: appData?.profile?.kyc?.aadhaarNumber || '',
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

  const status = appData?.status || authUser?.approvalStatus || 'PENDING';
  const adminStatus = appData?.adminApproval?.status || authUser?.adminApprovalStatus || 'PENDING';
  const superAdminStatus = appData?.superAdminApproval?.status || authUser?.superAdminApprovalStatus || 'PENDING';
  const rejectionReason = appData?.rejectionReason || authUser?.rejectionReason;

  const isApproved =
    appData?.status === 'ACTIVE' ||
    appData?.approvalStatus === 'APPROVED' ||
    appData?.accountStatus === 'ACTIVE' ||
    appData?.canWork === true ||
    (adminStatus === 'APPROVED' && superAdminStatus === 'APPROVED') ||
    superAdminStatus === 'APPROVED' ||
    adminStatus === 'APPROVED' ||
    authUser?.status === 'ACTIVE' ||
    authUser?.accountStatus === 'ACTIVE' ||
    authUser?.approvalStatus === 'APPROVED' ||
    authUser?.canWork === true;

  const isRejected = status === 'REJECTED' || adminStatus === 'REJECTED' || superAdminStatus === 'REJECTED';

  // When admin or superadmin approves, directly redirect to Delivery Partner Dashboard!
  useEffect(() => {
    if (isApproved) {
      router.replace('/(partner)');
    }
  }, [isApproved]);

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

  return (
    <View style={styles.screen}>
      {/* Top App Header */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={styles.brandRow}>
            <Image
              source={require('../../assets/images/h2h-header-logo.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
            <View style={styles.partnerBadge}>
              <Text style={styles.partnerBadgeText}>PARTNER ONBOARDING</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <LogOut size={15} color="#64748b" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
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
            tintColor="#ea580c"
            colors={['#ea580c']}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#ea580c" />
            <Text style={styles.loadingText}>Fetching verification status...</Text>
          </View>
        ) : (
          <>
            {/* PROMINENT PARTNER ID & APPLICATION STATUS CARD */}
            <View style={styles.partnerIdHeroCard}>
              <View style={styles.partnerIdTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.partnerIdSubtitle}>DELIVERY PARTNER ID</Text>
                  <Text style={styles.partnerIdTitle}>
                    {appData?.partnerId || authUser?.partnerId || appData?.user?.partnerId || `H2H-DP-${(appData?.applicationId || authUser?.id || 'PENDING').toString().slice(-6).toUpperCase()}`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.copyIdBtn}
                  onPress={() => {
                    const idVal = appData?.partnerId || authUser?.partnerId || appData?.user?.partnerId || `H2H-DP-${(appData?.applicationId || authUser?.id || 'PENDING').toString().slice(-6).toUpperCase()}`;
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
              /* CASE C: APPROVED */
              <View style={styles.approvedBanner}>
                <View style={styles.bannerIconCircleGreen}>
                  <CheckCircle2 size={36} color="#16a34a" />
                </View>
                <Text style={styles.approvedTitle}>Application Approved!</Text>
                <Text style={styles.approvedSub}>
                  Congratulations! Your onboarding documents have been verified and approved.
                </Text>

                <TouchableOpacity
                  style={styles.dashboardBtn}
                  onPress={() => router.replace('/(partner)')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.dashboardBtnText}>Go to Partner Dashboard</Text>
                  <ArrowRight size={18} color="#ffffff" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : isRejected ? (
              /* CASE B: REJECTED */
              <View style={styles.rejectedBanner}>
                <View style={styles.bannerIconCircleRed}>
                  <AlertTriangle size={36} color="#dc2626" />
                </View>
                <Text style={styles.rejectedTitle}>Application Rejected</Text>
                <Text style={styles.rejectedSub}>
                  Your onboarding application was rejected during the verification review.
                </Text>

                {/* Rejection Reason Box */}
                <View style={styles.rejectionBox}>
                  <Text style={styles.rejectionBoxHeader}>REASON FOR REJECTION:</Text>
                  <Text style={styles.rejectionBoxContent}>
                    {rejectionReason || 'Uploaded documents could not be verified. Please check and re-upload valid identity documents.'}
                  </Text>
                  {appData?.rejectedBy && (
                    <Text style={styles.rejectedByText}>
                      Reviewed by: {appData.rejectedBy.name || 'Operations Review Team'}
                    </Text>
                  )}
                </View>

                {/* Resubmit CTA */}
                <TouchableOpacity
                  style={styles.resubmitBtn}
                  onPress={openResubmitModal}
                  activeOpacity={0.85}
                >
                  <RefreshCw size={18} color="#ffffff" />
                  <Text style={styles.resubmitBtnText}>Resubmit Application</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* CASE A: PENDING REVIEW */
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
            <View style={styles.overviewCard}>
              <Text style={styles.overviewCardTitle}>Submitted Details</Text>

              <View style={styles.detailSectionHeader}>
                <Text style={styles.detailSectionTitle}>Personal Details</Text>
              </View>

              <View style={styles.overviewItem}>
                <View style={styles.overviewItemLeft}>
                  <User size={15} color="#ea580c" />
                  <Text style={styles.overviewItemLabel}>Name</Text>
                </View>
                <Text style={styles.overviewItemValue} numberOfLines={1}>
                  {appData?.user?.name || authUser?.name || '—'}
                </Text>
              </View>

              <View style={styles.overviewItem}>
                <View style={styles.overviewItemLeft}>
                  <Phone size={15} color="#ea580c" />
                  <Text style={styles.overviewItemLabel}>Phone</Text>
                </View>
                <Text style={styles.overviewItemValue} numberOfLines={1}>
                  +91 {appData?.user?.phone || authUser?.phone || '—'}
                </Text>
              </View>

              <View style={styles.overviewItem}>
                <View style={styles.overviewItemLeft}>
                  <Mail size={15} color="#ea580c" />
                  <Text style={styles.overviewItemLabel}>Email</Text>
                </View>
                <Text style={styles.overviewItemValue} numberOfLines={1}>
                  {appData?.user?.email || authUser?.email || '—'}
                </Text>
              </View>

              <View style={styles.detailSectionHeader}>
                <Text style={styles.detailSectionTitle}>Vehicle Details</Text>
              </View>

              <View style={styles.overviewItem}>
                <View style={styles.overviewItemLeft}>
                  <Bike size={15} color="#ea580c" />
                  <Text style={styles.overviewItemLabel}>Vehicle Type</Text>
                </View>
                <Text style={styles.overviewItemValue} numberOfLines={1}>
                  {appData?.profile?.vehicle?.type || 'Bike'}
                </Text>
              </View>

              <View style={styles.overviewItem}>
                <View style={styles.overviewItemLeft}>
                  <CreditCard size={15} color="#ea580c" />
                  <Text style={styles.overviewItemLabel}>Registration</Text>
                </View>
                <Text style={styles.overviewItemValue} numberOfLines={1}>
                  {appData?.profile?.vehicle?.plateNumber || 'Pending'}
                </Text>
              </View>
            </View>

            {/* KYC DOCUMENT CHECKLIST */}
            <View style={styles.checklistCard}>
              <View style={styles.checklistHeader}>
                <ShieldCheck size={18} color="#ea580c" />
                <Text style={styles.checklistTitle}>KYC Document Checklist</Text>
              </View>

              {/* Driving Licence */}
              {(() => {
                const doc = appData?.kycDocuments?.find((d: any) => d.type === 'DRIVING_LICENCE');
                const isSub = doc ? doc.submitted : Boolean(appData?.profile?.kyc?.drivingLicencePhoto || appData?.profile?.kyc?.drivingLicenceNumber);
                const mask = doc?.maskedNumber || (appData?.profile?.kyc?.drivingLicenceNumber ? `DL********${appData.profile.kyc.drivingLicenceNumber.slice(-3)}` : 'Submitted');
                return (
                  <View style={styles.checklistItem}>
                    <View style={styles.checklistItemLeft}>
                      <CreditCard size={18} color="#64748b" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.checklistItemName}>Driving Licence</Text>
                        <Text style={styles.checklistItemNumber}>DL Number: {mask}</Text>
                      </View>
                    </View>
                    <View style={[styles.docStatusBadge, isSub ? styles.docStatusBadgeDone : styles.docStatusBadgePending]}>
                      <Text style={[styles.docStatusBadgeText, isSub ? styles.docStatusBadgeTextDone : styles.docStatusBadgeTextPending]}>
                        {isSub ? '✓ Submitted' : '⚠ Pending'}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              <View style={styles.checklistDivider} />

              {/* PAN Card */}
              {(() => {
                const doc = appData?.kycDocuments?.find((d: any) => d.type === 'PAN_CARD');
                const isSub = doc ? doc.submitted : Boolean(appData?.profile?.kyc?.panPhoto || appData?.profile?.kyc?.panNumber);
                const mask = doc?.maskedNumber || (appData?.profile?.kyc?.panNumber ? `${appData.profile.kyc.panNumber.slice(0, 5)}****${appData.profile.kyc.panNumber.slice(-1)}` : 'Submitted');
                return (
                  <View style={styles.checklistItem}>
                    <View style={styles.checklistItemLeft}>
                      <FileText size={18} color="#64748b" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.checklistItemName}>PAN Card</Text>
                        <Text style={styles.checklistItemNumber}>PAN: {mask}</Text>
                      </View>
                    </View>
                    <View style={[styles.docStatusBadge, isSub ? styles.docStatusBadgeDone : styles.docStatusBadgePending]}>
                      <Text style={[styles.docStatusBadgeText, isSub ? styles.docStatusBadgeTextDone : styles.docStatusBadgeTextPending]}>
                        {isSub ? '✓ Submitted' : '⚠ Pending'}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              <View style={styles.checklistDivider} />

              {/* Aadhaar Card */}
              {(() => {
                const doc = appData?.kycDocuments?.find((d: any) => d.type === 'AADHAAR_CARD');
                const isSub = doc ? doc.submitted : Boolean(appData?.profile?.kyc?.aadhaarPhoto || appData?.profile?.kyc?.aadhaarNumber);
                const mask = doc?.maskedNumber || (appData?.profile?.kyc?.aadhaarNumber ? `XXXX XXXX ${appData.profile.kyc.aadhaarNumber.slice(-4)}` : 'Submitted');
                return (
                  <View style={styles.checklistItem}>
                    <View style={styles.checklistItemLeft}>
                      <ShieldCheck size={18} color="#64748b" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.checklistItemName}>Aadhaar Card</Text>
                        <Text style={styles.checklistItemNumber}>Aadhaar: {mask}</Text>
                      </View>
                    </View>
                    <View style={[styles.docStatusBadge, isSub ? styles.docStatusBadgeDone : styles.docStatusBadgePending]}>
                      <Text style={[styles.docStatusBadgeText, isSub ? styles.docStatusBadgeTextDone : styles.docStatusBadgeTextPending]}>
                        {isSub ? '✓ Submitted' : '⚠ Pending'}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              <View style={styles.checklistDivider} />

              {/* Profile Photo */}
              {(() => {
                const hasAvatar = Boolean(appData?.user?.avatar || authUser?.avatar || appData?.profile?.profilePhoto);
                return (
                  <View style={styles.checklistItem}>
                    <View style={styles.checklistItemLeft}>
                      <User size={18} color="#64748b" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.checklistItemName}>Profile Photo</Text>
                        <Text style={styles.checklistItemNumber}>Passport front photo</Text>
                      </View>
                    </View>
                    <View style={[styles.docStatusBadge, hasAvatar ? styles.docStatusBadgeDone : styles.docStatusBadgePending]}>
                      <Text style={[styles.docStatusBadgeText, hasAvatar ? styles.docStatusBadgeTextDone : styles.docStatusBadgeTextPending]}>
                        {hasAvatar ? '✓ Submitted' : '⚠ Pending'}
                      </Text>
                    </View>
                  </View>
                );
              })()}
            </View>

            {/* ACTION OPTIONS */}
            <View style={styles.actionsCard}>
              <TouchableOpacity
                style={styles.actionBtnRefresh}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  refetch();
                  showToast('info', 'Status Refreshed', 'Checking latest verification updates.');
                }}
                activeOpacity={0.8}
              >
                <RefreshCw size={16} color="#0f172a" />
                <Text style={styles.actionBtnRefreshText}>Refresh Status</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnSupport}
                onPress={() => {
                  const partnerId = appData?.partnerId || authUser?.partnerId || 'DP';
                  const email = 'partner-support@hand2hand.com';
                  const subject = encodeURIComponent(`Application Inquiry - Partner ${partnerId}`);
                  const body = encodeURIComponent(`Hi H2H Support,\n\nI have an inquiry regarding my Delivery Partner application (${partnerId}).\nName: ${appData?.user?.name || authUser?.name || ''}\nPhone: ${appData?.user?.phone || authUser?.phone || ''}\n\n`);
                  Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`).catch(() => {
                    showToast('info', 'Support Email', 'partner-support@hand2hand.com');
                  });
                }}
                activeOpacity={0.8}
              >
                <HelpCircle size={16} color="#ea580c" />
                <Text style={styles.actionBtnSupportText}>Contact Support</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnLogout}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <LogOut size={16} color="#dc2626" />
                <Text style={styles.actionBtnLogoutText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Resubmit Application Modal */}
      <Modal
        visible={resubmitModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setResubmitModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalTopBar}>
              <View>
                <Text style={styles.modalHeading}>Update Application</Text>
                <Text style={styles.modalSubheading}>
                  Revise your vehicle details and re-upload required KYC documents.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setResubmitModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              {resubmitError && (
                <View style={styles.modalErrorBox}>
                  <Text style={styles.modalErrorText}>{resubmitError}</Text>
                </View>
              )}

              <View style={styles.modalFormGap}>
                {/* Vehicle Number */}
                <View style={styles.modalFieldWrap}>
                  <Text style={styles.modalFieldLabel}>Vehicle Registration Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={resubmitForm.vehicleNumber}
                    onChangeText={v => setResubmitForm(f => ({ ...f, vehicleNumber: v }))}
                    placeholder="e.g. DL 01 AB 1234"
                    autoCapitalize="characters"
                  />
                </View>

                {/* Driving Licence Number & Photo */}
                <View style={styles.modalFieldWrap}>
                  <Text style={styles.modalFieldLabel}>Driving Licence Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={resubmitForm.drivingLicenceNumber}
                    onChangeText={v => setResubmitForm(f => ({ ...f, drivingLicenceNumber: v }))}
                    placeholder="DL Number"
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={[
                      styles.modalDocUploadBtn,
                      resubmitForm.drivingLicencePhoto && styles.modalDocUploadBtnDone,
                    ]}
                    onPress={() => handlePickDocument('drivingLicencePhoto')}
                  >
                    {resubmitForm.drivingLicencePhoto ? (
                      <>
                        <FileCheck size={16} color="#16a34a" />
                        <Text style={styles.modalDocUploadDoneText} numberOfLines={1}>
                          ✓ {resubmitFileNames.drivingLicencePhoto || 'New DL Document Attached'}
                        </Text>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={16} color="#ea580c" />
                        <Text style={styles.modalDocUploadText}>Upload Driving Licence (Image or PDF)</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* PAN Number & Photo */}
                <View style={styles.modalFieldWrap}>
                  <Text style={styles.modalFieldLabel}>PAN Card Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={resubmitForm.panNumber}
                    onChangeText={v => setResubmitForm(f => ({ ...f, panNumber: v }))}
                    placeholder="PAN Number"
                    autoCapitalize="characters"
                    maxLength={10}
                  />
                  <TouchableOpacity
                    style={[
                      styles.modalDocUploadBtn,
                      resubmitForm.panPhoto && styles.modalDocUploadBtnDone,
                    ]}
                    onPress={() => handlePickDocument('panPhoto')}
                  >
                    {resubmitForm.panPhoto ? (
                      <>
                        <FileCheck size={16} color="#16a34a" />
                        <Text style={styles.modalDocUploadDoneText} numberOfLines={1}>
                          ✓ {resubmitFileNames.panPhoto || 'New PAN Document Attached'}
                        </Text>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={16} color="#ea580c" />
                        <Text style={styles.modalDocUploadText}>Upload PAN Card (Image or PDF)</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Aadhaar Number & Photo */}
                <View style={styles.modalFieldWrap}>
                  <Text style={styles.modalFieldLabel}>Aadhaar Card Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={resubmitForm.aadhaarNumber}
                    onChangeText={v => setResubmitForm(f => ({ ...f, aadhaarNumber: v }))}
                    placeholder="12-digit Aadhaar Number"
                    keyboardType="number-pad"
                    maxLength={12}
                  />
                  <TouchableOpacity
                    style={[
                      styles.modalDocUploadBtn,
                      resubmitForm.aadhaarPhoto && styles.modalDocUploadBtnDone,
                    ]}
                    onPress={() => handlePickDocument('aadhaarPhoto')}
                  >
                    {resubmitForm.aadhaarPhoto ? (
                      <>
                        <FileCheck size={16} color="#16a34a" />
                        <Text style={styles.modalDocUploadDoneText} numberOfLines={1}>
                          ✓ {resubmitFileNames.aadhaarPhoto || 'New Aadhaar Document Attached'}
                        </Text>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={16} color="#ea580c" />
                        <Text style={styles.modalDocUploadText}>Upload Aadhaar (Image or PDF)</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setResubmitModalOpen(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleDoResubmit}
                disabled={resubmitMutation.isPending}
              >
                {resubmitMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Submit for Review</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  headerInner: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoImg: {
    width: 104,
    height: 26,
  },
  partnerBadge: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  partnerBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 0.3,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  logoutText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 12,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  loadingWrap: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },

  // Partner ID Hero Card
  partnerIdHeroCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    gap: 10,
  },
  partnerIdTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  partnerIdSubtitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  partnerIdTitle: {
    fontSize: 17,
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
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  copyIdBtnText: {
    fontSize: 11.5,
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
  appRefDateValue: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '500',
  },

  // Pending Banner
  pendingBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    padding: 18,
    alignItems: 'center',
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
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  pendingSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  dualApprovalInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
    width: '100%',
  },
  dualApprovalInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#9a3412',
    lineHeight: 16,
    fontWeight: '500',
  },

  // Rejected Banner
  rejectedBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    padding: 18,
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  bannerIconCircleRed: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  rejectedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#991b1b',
    textAlign: 'center',
  },
  rejectedSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  rejectionBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    width: '100%',
  },
  rejectionBoxHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b91c1c',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  rejectionBoxContent: {
    fontSize: 13,
    color: '#7f1d1d',
    fontWeight: '600',
    lineHeight: 18,
  },
  rejectedByText: {
    fontSize: 11,
    color: '#991b1b',
    marginTop: 6,
    fontStyle: 'italic',
  },
  resubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ea580c',
    height: 48,
    borderRadius: 12,
    width: '100%',
    marginTop: 16,
  },
  resubmitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Approved Banner
  approvedBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#86efac',
    padding: 18,
    alignItems: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  bannerIconCircleGreen: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  approvedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#15803d',
    textAlign: 'center',
  },
  approvedSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  dashboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ea580c',
    height: 50,
    borderRadius: 12,
    width: '100%',
    marginTop: 16,
  },
  dashboardBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },

  // Two-Level Pipeline Card
  pipelineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 16,
  },
  pipelineHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  pipelineStepRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 28,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#ea580c',
  },
  stepCircleApproved: {
    backgroundColor: '#16a34a',
  },
  stepCircleRejected: {
    backgroundColor: '#dc2626',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  stepConnectorLine: {
    width: 2,
    flex: 1,
    minHeight: 34,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  stepConnectorLineApproved: {
    backgroundColor: '#86efac',
  },
  stepContentCol: {
    flex: 1,
    gap: 4,
  },
  stepTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  stepDescription: {
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

  badgePill: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#c2410c',
  },
  badgeApproved: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  badgeApprovedText: {
    color: '#15803d',
  },
  badgeRejected: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  badgeRejectedText: {
    color: '#dc2626',
  },

  // Overview Card
  overviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 10,
  },
  overviewCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 6,
  },
  detailSectionHeader: {
    marginTop: 6,
    marginBottom: 2,
  },
  detailSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  overviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  overviewItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 0,
  },
  overviewItemLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  overviewItemValue: {
    fontSize: 12.5,
    color: '#0f172a',
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
  },

  // KYC Checklist Card
  checklistCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 10,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  checklistTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 8,
  },
  checklistItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  checklistItemName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1e293b',
  },
  checklistItemNumber: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 1,
  },
  checklistDivider: {
    display: 'none',
  },
  docStatusBadge: {
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  docStatusBadgeDone: {
    backgroundColor: '#dcfce7',
  },
  docStatusBadgePending: {
    backgroundColor: '#fef3c7',
  },
  docStatusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  docStatusBadgeTextDone: {
    color: '#15803d',
  },
  docStatusBadgeTextPending: {
    color: '#b45309',
  },

  // Action Options
  actionsCard: {
    gap: 10,
    marginTop: 4,
  },
  actionBtnRefresh: {
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
  actionBtnRefreshText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  actionBtnSupport: {
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
  actionBtnSupportText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ea580c',
  },
  actionBtnLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
  },
  actionBtnLogoutText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#dc2626',
  },

  // Resubmit Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    gap: 14,
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubheading: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    maxWidth: 280,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalErrorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  modalErrorText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
  modalFormGap: {
    gap: 12,
    paddingVertical: 6,
  },
  modalFieldWrap: {
    gap: 5,
  },
  modalFieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  modalDocUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ea580c',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 4,
  },
  modalDocUploadBtnDone: {
    backgroundColor: '#f0fdf4',
    borderStyle: 'solid',
    borderColor: '#86efac',
  },
  modalDocUploadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
  },
  modalDocUploadDoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modalSubmitBtn: {
    flex: 2,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
