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
  RefreshControl,
  Platform,
  useWindowDimensions,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  FileText,
  Search,
  X,
  Package,
  MapPin,
  Banknote,
  QrCode,
  Printer,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Hash,
  AlertCircle,
  Check,
} from 'lucide-react-native';
import {
  paymentService,
  PaymentItem,
  PaymentDetails,
  InvoiceData,
  PaymentSummary,
} from '../../../src/services/payment.service';
import { colors } from '../../../src/theme';
import { showToast } from '../../../src/utils/toast';
import { useAppSelector } from '../../../src/hooks/useAppSelector';
import { GuestAuthPrompt } from '../../../src/components/auth/GuestAuthPrompt';

type FilterStatus = 'ALL' | 'PAID' | 'PENDING' | 'REFUNDED';

export default function PaymentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;
  const authUser = useAppSelector((s) => s.auth.user);
  const isGuest = useAppSelector((s) => s.auth.isGuest);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({
    totalPaid: 0,
    pendingAmount: 0,
    paidCount: 0,
    pendingCount: 0,
    totalCount: 0,
    currency: 'INR',
  });
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Modals state
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const fetchPayments = useCallback(async (isRefresh = false) => {
    if (isGuest || !authUser) {
      setLoading(false);
      return;
    }
    if (!isRefresh) setLoading(true);
    try {
      const res = await paymentService.getPaymentHistory({
        status: activeFilter !== 'ALL' ? activeFilter : undefined,
        search: searchQuery.trim() || undefined,
        limit: 50,
      });
      setPayments(res.data || []);
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to load payments';
      showToast('error', 'Payment Load Error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments(true);
  };

  const handleOpenDetails = async (paymentId: string) => {
    setLoadingDetails(true);
    try {
      const details = await paymentService.getPaymentById(paymentId);
      setSelectedPayment(details);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Could not fetch payment details';
      showToast('error', 'Error', msg);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenInvoice = async (paymentId: string) => {
    setLoadingInvoice(true);
    try {
      const invoice = await paymentService.getInvoice(paymentId);
      setInvoiceData(invoice);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Could not generate invoice';
      showToast('error', 'Invoice Error', msg);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handlePrintOrShare = async () => {
    if (!invoiceData) return;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.print) {
        window.print();
      } else {
        showToast('info', 'Invoice Ready', `Invoice ${invoiceData.invoiceNumber} is displayed.`);
      }
    } else {
      try {
        await Share.share({
          title: `H2H Invoice ${invoiceData.invoiceNumber}`,
          message: `H2H Delivery Invoice #${invoiceData.invoiceNumber}\nAmount Paid: ₹${invoiceData.fareBreakdown.total}\nTracking: ${invoiceData.delivery.trackingId}\nThank you for choosing H2H Delivery!`,
        });
      } catch {
        // user dismissed share dialog
      }
    }
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'N/A';
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
      return isoStr;
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'PAID':
        return {
          label: 'Paid',
          bg: '#DCFCE7',
          text: '#15803D',
          border: '#BBF7D0',
          Icon: CheckCircle2,
        };
      case 'PENDING':
        return {
          label: 'Pending',
          bg: '#FEF3C7',
          text: '#B45309',
          border: '#FDE68A',
          Icon: Clock,
        };
      case 'REFUNDED':
        return {
          label: 'Refunded',
          bg: '#DBEAFE',
          text: '#1D4ED8',
          border: '#BFDBFE',
          Icon: RotateCcw,
        };
      case 'FAILED':
        return {
          label: 'Failed',
          bg: '#FEE2E2',
          text: '#B91C1C',
          border: '#FECACA',
          Icon: XCircle,
        };
      default:
        return {
          label: status,
          bg: colors.surfaceContainerLow,
          text: colors.onSurfaceVariant,
          border: colors.surfaceContainer,
          Icon: AlertCircle,
        };
    }
  };

  const getMethodBadge = (method: string) => {
    const m = (method || '').toUpperCase();
    if (m === 'CASH') {
      return {
        label: 'Cash at Handover',
        Icon: Banknote,
        color: '#D97706',
        bg: '#FEF3C7',
      };
    }
    if (m === 'CARD') {
      return {
        label: 'Debit/Credit Card',
        Icon: CreditCard,
        color: colors.primary,
        bg: '#EFF6FF',
      };
    }
    return {
      label: 'Instant UPI Pay',
      Icon: QrCode,
      color: '#0284C7',
      bg: '#E0F2FE',
    };
  };

  if (isGuest || !authUser) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={[styles.header, { paddingHorizontal: 16 }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace('/(customer)')}
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.onSurface }}>
            Payments & Invoices
          </Text>
          <View style={{ width: 36 }} />
        </View>
        <GuestAuthPrompt
          title="Sign in to continue"
          description="Sign in or create an account to view your payment history and download invoices."
          icon={<CreditCard size={28} color="#00417E" />}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Compact Responsive Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace('/(customer)/profile')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back to Profile"
          >
            <ArrowLeft size={18} color={colors.onSurface} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Payments & Invoices</Text>
            <Text style={styles.headerSubtitle}>Verified billing and tax receipts</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.headerActionBtn, showSearch && styles.headerActionBtnActive]}
          onPress={() => setShowSearch((prev) => !prev)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Search Transactions"
        >
          <Search size={16} color={showSearch ? colors.primary : colors.onSurface} />
        </TouchableOpacity>
      </View>

      {/* Search Bar (Toggled) */}
      {showSearch && (
        <View style={styles.searchBarWrap}>
          <View style={styles.searchBar}>
            <Search size={16} color={colors.outline} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search reference, tracking ID, or address..."
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
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 140 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Payment Overview Summary Cards */}
        <View style={styles.overviewSection}>
          <Text style={styles.sectionHeading}>PAYMENT OVERVIEW</Text>
          <View style={styles.summaryRow}>
            {/* 1. Total Paid */}
            <View style={[styles.summaryCard, styles.summaryCardPaid]}>
              <View style={styles.summaryIconWrapPaid}>
                <CheckCircle2 size={16} color="#15803D" />
              </View>
              <Text style={styles.summaryAmountPaid}>₹{summary.totalPaid}</Text>
              <Text style={styles.summaryLabelPaid}>Total Paid</Text>
            </View>

            {/* 2. Pending Payments */}
            <View style={[styles.summaryCard, styles.summaryCardPending]}>
              <View style={styles.summaryIconWrapPending}>
                <Clock size={16} color="#B45309" />
              </View>
              <Text style={styles.summaryAmountPending}>₹{summary.pendingAmount}</Text>
              <Text style={styles.summaryLabelPending}>Pending</Text>
            </View>

            {/* 3. Completed Paid Orders */}
            <View style={[styles.summaryCard, styles.summaryCardCount]}>
              <View style={styles.summaryIconWrapCount}>
                <Package size={16} color={colors.primary} />
              </View>
              <Text style={styles.summaryAmountCount}>{summary.paidCount}</Text>
              <Text style={styles.summaryLabelCount}>Paid Orders</Text>
            </View>
          </View>
        </View>

        {/* Status Filter Chips */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {(['ALL', 'PAID', 'PENDING', 'REFUNDED'] as FilterStatus[]).map((tab) => {
              const isSel = activeFilter === tab;
              let count = summary.totalCount;
              if (tab === 'PAID') count = summary.paidCount;
              if (tab === 'PENDING') count = summary.pendingCount;
              if (tab === 'REFUNDED') count = 0;

              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.filterChip, isSel && styles.filterChipSelected]}
                  onPress={() => setActiveFilter(tab)}
                  activeOpacity={0.8}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSel }}
                >
                  <Text style={[styles.filterChipText, isSel && styles.filterChipTextSelected]}>
                    {tab === 'ALL' ? 'All Payments' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                  </Text>
                  <View style={[styles.filterBadge, isSel && styles.filterBadgeSelected]}>
                    <Text style={[styles.filterBadgeText, isSel && styles.filterBadgeTextSelected]}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Payment History List */}
        <View style={styles.historySection}>
          <Text style={styles.sectionHeading}>PAYMENT HISTORY</Text>

          {loading && !refreshing ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Fetching payment records & receipts...</Text>
            </View>
          ) : payments.length === 0 ? (
            /* Required Empty State */
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <FileText size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No payment history yet</Text>
              <Text style={styles.emptySubtitle}>
                Your completed payment records and available receipts will appear here.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => router.push('/(customer)/deliveries')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="View My Deliveries"
              >
                <Package size={16} color="#ffffff" strokeWidth={2.2} />
                <Text style={styles.emptyActionBtnText}>View My Deliveries</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Payment Cards */
            <View style={styles.paymentList}>
              {payments.map((item) => {
                const badge = getStatusBadge(item.status);
                const BadgeIcon = badge.Icon;
                const methodBadge = getMethodBadge(item.method);
                const MethodIcon = methodBadge.Icon;

                return (
                  <View key={item.id} style={styles.paymentCard}>
                    {/* Top Row: Booking ID + Status Badge */}
                    <View style={styles.cardHeader}>
                      <View style={styles.trackingWrap}>
                        <Hash size={13} color={colors.outline} />
                        <Text style={styles.trackingText}>{item.trackingId}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                        <BadgeIcon size={12} color={badge.text} />
                        <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
                      </View>
                    </View>

                    {/* Middle: Route summary */}
                    <View style={styles.routeBox}>
                      <View style={styles.routeRow}>
                        <View style={styles.dotGreen} />
                        <Text style={styles.routeText} numberOfLines={1}>
                          {item.pickupAddress}
                        </Text>
                      </View>
                      <View style={styles.routeConnector} />
                      <View style={styles.routeRow}>
                        <View style={styles.dotOrange} />
                        <Text style={styles.routeText} numberOfLines={1}>
                          {item.dropAddress}
                        </Text>
                      </View>
                    </View>

                    {/* Middle: Method + Date + Amount Row */}
                    <View style={styles.metaRow}>
                      <View style={styles.metaLeft}>
                        <View style={[styles.methodBadge, { backgroundColor: methodBadge.bg }]}>
                          <MethodIcon size={12} color={methodBadge.color} />
                          <Text style={[styles.methodBadgeText, { color: methodBadge.color }]}>
                            {methodBadge.label}
                          </Text>
                        </View>
                        <View style={styles.dateWrap}>
                          <Calendar size={12} color={colors.outline} />
                          <Text style={styles.dateText}>{formatDate(item.paidAt || item.createdAt)}</Text>
                        </View>
                      </View>

                      <View style={styles.amountWrap}>
                        <Text style={styles.amountLabel}>Total Amount</Text>
                        <Text style={styles.amountVal}>₹{item.amount}</Text>
                      </View>
                    </View>

                    {/* Card Actions: View Details & View Receipt */}
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.detailsBtn}
                        onPress={() => handleOpenDetails(item.deliveryId)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="View Payment Details"
                      >
                        <Text style={styles.detailsBtnText}>View Details</Text>
                        <ChevronRight size={14} color={colors.onSurface} />
                      </TouchableOpacity>

                      {item.hasInvoice ? (
                        <TouchableOpacity
                          style={styles.invoiceBtn}
                          onPress={() => handleOpenInvoice(item.deliveryId)}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityLabel="View Tax Receipt"
                        >
                          <FileText size={13} color="#ffffff" />
                          <Text style={styles.invoiceBtnText}>View Receipt</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ------------------------------------------------------------- */}
      {/* 1. Payment Details Modal */}
      {/* ------------------------------------------------------------- */}
      {selectedPayment && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setSelectedPayment(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <Text style={styles.modalTitle}>Payment Details</Text>
                  <Text style={styles.modalSubtitle}>Ref: {selectedPayment.trackingId}</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedPayment(null)}
                  activeOpacity={0.7}
                >
                  <X size={18} color={colors.onSurface} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Status & Amount Highlight */}
                <View style={styles.detailHighlightBox}>
                  <View>
                    <Text style={styles.highlightLabel}>Amount Charged</Text>
                    <Text style={styles.highlightAmount}>₹{selectedPayment.amount}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: getStatusBadge(selectedPayment.status).bg,
                        borderColor: getStatusBadge(selectedPayment.status).border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getStatusBadge(selectedPayment.status).text },
                      ]}
                    >
                      {getStatusBadge(selectedPayment.status).label}
                    </Text>
                  </View>
                </View>

                {/* Transaction Reference & Method */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>TRANSACTION INFORMATION</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Payment Method</Text>
                    <Text style={styles.detailRowVal}>{getMethodBadge(selectedPayment.method).label}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Transaction Ref</Text>
                    <Text style={[styles.detailRowVal, styles.monoText]}>
                      {selectedPayment.transactionId || `TXN-${selectedPayment.trackingId}`}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Payment Date</Text>
                    <Text style={styles.detailRowVal}>{formatDate(selectedPayment.paidAt)}</Text>
                  </View>
                </View>

                {/* Delivery Locations */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>LOCATIONS</Text>
                  <View style={styles.locationBox}>
                    <Text style={styles.locLabel}>PICKUP FROM</Text>
                    <Text style={styles.locName}>{selectedPayment.pickup?.contactName}</Text>
                    <Text style={styles.locAddress}>{selectedPayment.pickup?.address}</Text>
                  </View>
                  <View style={styles.locationBox}>
                    <Text style={styles.locLabel}>DELIVER TO</Text>
                    <Text style={styles.locName}>{selectedPayment.drop?.contactName}</Text>
                    <Text style={styles.locAddress}>{selectedPayment.drop?.address}</Text>
                  </View>
                </View>

                {/* Fare Breakdown */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>FARE BREAKDOWN</Text>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Base Delivery Fare</Text>
                    <Text style={styles.breakdownVal}>₹{selectedPayment.fareBreakdown.base}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Distance Charge</Text>
                    <Text style={styles.breakdownVal}>₹{selectedPayment.fareBreakdown.perKm}</Text>
                  </View>
                  {selectedPayment.fareBreakdown.weightCharge > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Weight Handling</Text>
                      <Text style={styles.breakdownVal}>₹{selectedPayment.fareBreakdown.weightCharge}</Text>
                    </View>
                  )}
                  {selectedPayment.fareBreakdown.discount > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={[styles.breakdownLabel, { color: '#16A34A' }]}>Discount</Text>
                      <Text style={[styles.breakdownVal, { color: '#16A34A' }]}>
                        -₹{selectedPayment.fareBreakdown.discount}
                      </Text>
                    </View>
                  )}
                  <View style={styles.breakdownTotalRow}>
                    <Text style={styles.breakdownTotalLabel}>Final Amount Paid</Text>
                    <Text style={styles.breakdownTotalVal}>₹{selectedPayment.amount}</Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                {selectedPayment.hasInvoice && (
                  <TouchableOpacity
                    style={styles.modalPrimaryActionBtn}
                    onPress={() => {
                      const id = selectedPayment.deliveryId;
                      setSelectedPayment(null);
                      handleOpenInvoice(id);
                    }}
                    activeOpacity={0.8}
                  >
                    <FileText size={15} color="#ffffff" />
                    <Text style={styles.modalPrimaryActionBtnText}>View Full Invoice</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.modalCloseOutBtn}
                  onPress={() => setSelectedPayment(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCloseOutBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. Formal Tax Invoice / Receipt Modal */}
      {/* ------------------------------------------------------------- */}
      {invoiceData && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setInvoiceData(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.invoiceCard}>
              <View style={styles.invoiceHeader}>
                <View>
                  <Text style={styles.invoiceBrand}>HAND2HAND DELIVERY</Text>
                  <Text style={styles.invoiceSub}>Hand2Hand Person-to-Person Delivery</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setInvoiceData(null)}
                  activeOpacity={0.7}
                >
                  <X size={18} color={colors.onSurface} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.invoiceScroll} showsVerticalScrollIndicator={false}>
                {/* Official Tag & Number */}
                <View style={styles.invoiceMetaBanner}>
                  <View>
                    <Text style={styles.invoiceTitle}>TAX INVOICE / RECEIPT</Text>
                    <Text style={styles.invoiceNoText}>{invoiceData.invoiceNumber}</Text>
                  </View>
                  <View style={styles.invoiceVerifiedPill}>
                    <ShieldCheck size={12} color="#15803D" />
                    <Text style={styles.invoiceVerifiedText}>Verified</Text>
                  </View>
                </View>

                {/* Company & Customer Details Grid */}
                <View style={styles.invoicePartyGrid}>
                  <View style={styles.partyBox}>
                    <Text style={styles.partyRole}>ISSUED BY</Text>
                    <Text style={styles.partyName}>{invoiceData.company.name}</Text>
                    <Text style={styles.partyDesc}>{invoiceData.company.address}</Text>
                    <Text style={styles.partyDesc}>GSTIN: {invoiceData.company.gstin}</Text>
                    <Text style={styles.partyDesc}>{invoiceData.company.email}</Text>
                  </View>
                  <View style={styles.partyBox}>
                    <Text style={styles.partyRole}>BILLED TO</Text>
                    <Text style={styles.partyName}>{invoiceData.customer.name}</Text>
                    {invoiceData.customer.phone ? (
                      <Text style={styles.partyDesc}>Ph: {invoiceData.customer.phone}</Text>
                    ) : null}
                    {invoiceData.customer.email ? (
                      <Text style={styles.partyDesc}>{invoiceData.customer.email}</Text>
                    ) : null}
                    <Text style={styles.partyDesc}>Date: {formatDate(invoiceData.invoiceDate)}</Text>
                  </View>
                </View>

                {/* Delivery Summary */}
                <View style={styles.invoiceDeliverySummary}>
                  <Text style={styles.invoiceDeliveryTitle}>DELIVERY PARTICULARS</Text>
                  <View style={styles.invoiceDeliveryRow}>
                    <Text style={styles.invoiceDeliveryLabel}>Tracking ID:</Text>
                    <Text style={styles.invoiceDeliveryVal}>{invoiceData.delivery.trackingId}</Text>
                  </View>
                  <View style={styles.invoiceDeliveryRow}>
                    <Text style={styles.invoiceDeliveryLabel}>Category:</Text>
                    <Text style={styles.invoiceDeliveryVal}>{invoiceData.delivery.category || 'Package'}</Text>
                  </View>
                  <View style={styles.invoiceDeliveryRow}>
                    <Text style={styles.invoiceDeliveryLabel}>Pickup:</Text>
                    <Text style={styles.invoiceDeliveryVal} numberOfLines={1}>
                      {invoiceData.delivery.pickupAddress}
                    </Text>
                  </View>
                  <View style={styles.invoiceDeliveryRow}>
                    <Text style={styles.invoiceDeliveryLabel}>Destination:</Text>
                    <Text style={styles.invoiceDeliveryVal} numberOfLines={1}>
                      {invoiceData.delivery.dropAddress}
                    </Text>
                  </View>
                </View>

                {/* Line Item Table */}
                <View style={styles.invoiceTable}>
                  <View style={styles.tableHead}>
                    <Text style={[styles.tableHeadCell, { flex: 2 }]}>Service Description</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1, textAlign: 'right' }]}>Amount</Text>
                  </View>

                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>Base Logistics Fare</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                      ₹{invoiceData.fareBreakdown.base}
                    </Text>
                  </View>

                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>Distance Transit Charge</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                      ₹{invoiceData.fareBreakdown.perKm}
                    </Text>
                  </View>

                  {invoiceData.fareBreakdown.weightCharge > 0 && (
                    <View style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 2 }]}>Weight Handling Fee</Text>
                      <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                        ₹{invoiceData.fareBreakdown.weightCharge}
                      </Text>
                    </View>
                  )}

                  {invoiceData.fareBreakdown.discount > 0 && (
                    <View style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 2, color: '#16A34A' }]}>Promotional Discount</Text>
                      <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: '#16A34A' }]}>
                        -₹{invoiceData.fareBreakdown.discount}
                      </Text>
                    </View>
                  )}

                  <View style={styles.tableTotalRow}>
                    <Text style={styles.tableTotalLabel}>Total Payable & Settled</Text>
                    <Text style={styles.tableTotalVal}>₹{invoiceData.fareBreakdown.total}</Text>
                  </View>
                </View>

                {/* Payment Receipt Acknowledgement */}
                <View style={styles.invoicePaymentAcknowledge}>
                  <CheckCircle2 size={16} color="#15803D" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.acknowledgeTitle}>Payment Confirmed & Settled</Text>
                    <Text style={styles.acknowledgeDesc}>
                      Mode: {invoiceData.payment.method} • Ref: {invoiceData.payment.transactionId}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Invoice Actions */}
              <View style={styles.invoiceActionRow}>
                <TouchableOpacity
                  style={styles.printBtn}
                  onPress={handlePrintOrShare}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Print or Share Receipt"
                >
                  <Printer size={15} color="#ffffff" />
                  <Text style={styles.printBtnText}>
                    {Platform.OS === 'web' ? 'Print / Download' : 'Share Receipt'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.invoiceCloseBtn}
                  onPress={() => setInvoiceData(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.invoiceCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
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
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.onSurface,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
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
  searchBarWrap: {
    paddingHorizontal: 16,
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.onSurface,
    padding: 0,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    gap: 16,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  overviewSection: {},
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
    borderWidth: 1,
    ...Platform.select({
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.03)' } as any,
      default: { elevation: 2 },
    }),
  },
  summaryCardPaid: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  summaryIconWrapPaid: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryAmountPaid: {
    fontSize: 17,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: -0.3,
  },
  summaryLabelPaid: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
    marginTop: 2,
  },
  summaryCardPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
  },
  summaryIconWrapPending: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryAmountPending: {
    fontSize: 17,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: -0.3,
  },
  summaryLabelPending: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
    marginTop: 2,
  },
  summaryCardCount: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  summaryIconWrapCount: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryAmountCount: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  summaryLabelCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  filterSection: {
    marginHorizontal: -14,
  },
  filterScroll: {
    paddingHorizontal: 14,
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
  filterBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainerLow,
  },
  filterBadgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  filterBadgeTextSelected: {
    color: '#ffffff',
  },
  historySection: {},
  loadingBox: {
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
  },
  emptyActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  paymentList: {
    gap: 12,
  },
  paymentCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    gap: 10,
    ...Platform.select({
      web: { boxShadow: '0 3px 10px rgba(0,0,0,0.03)' } as any,
      default: { elevation: 2 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  trackingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  trackingText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.onSurface,
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  routeBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 10,
    padding: 8,
    gap: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  dotOrange: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondaryContainer,
  },
  routeConnector: {
    width: 1.5,
    height: 6,
    backgroundColor: colors.outlineVariant,
    marginLeft: 2.25,
  },
  routeText: {
    flex: 1,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 2,
  },
  metaLeft: {
    gap: 6,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  methodBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 10.5,
    color: colors.outline,
  },
  amountWrap: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.outline,
    letterSpacing: 0.2,
  },
  amountVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
  },
  detailsBtn: {
    flex: 1,
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
  invoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  invoiceBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Modal Common
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 20,
    gap: 12,
    ...Platform.select({
      web: { boxShadow: '0 20px 40px rgba(0,0,0,0.25)' } as any,
      default: { elevation: 12 },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  modalHeaderLeft: {},
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.onSurface,
  },
  modalSubtitle: {
    fontSize: 11,
    color: colors.outline,
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    maxHeight: 450,
  },
  detailHighlightBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  highlightLabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  highlightAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  detailSection: {
    marginBottom: 14,
    gap: 6,
  },
  detailSectionTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  detailRowLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  detailRowVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  monoText: {
    fontFamily: Platform.select({ web: 'monospace', default: undefined }),
    fontSize: 11,
  },
  locationBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 10,
    padding: 8,
    gap: 2,
    marginBottom: 4,
  },
  locLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.4,
  },
  locName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
  },
  locAddress: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  breakdownLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  breakdownVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1.5,
    borderTopColor: colors.surfaceContainer,
  },
  breakdownTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.onSurface,
  },
  breakdownTotalVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  modalFooter: {
    gap: 8,
    marginTop: 6,
  },
  modalPrimaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalPrimaryActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalCloseOutBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLow,
  },
  modalCloseOutBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  // Tax Invoice Card
  invoiceCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    gap: 12,
    ...Platform.select({
      web: { boxShadow: '0 20px 50px rgba(0,0,0,0.3)' } as any,
      default: { elevation: 14 },
    }),
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  invoiceBrand: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  invoiceSub: {
    fontSize: 10.5,
    color: colors.outline,
  },
  invoiceScroll: {
    maxHeight: 460,
  },
  invoiceMetaBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  invoiceTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.onSurface,
    letterSpacing: 0.5,
  },
  invoiceNoText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  invoiceVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  invoiceVerifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  invoicePartyGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  partyBox: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 10,
    padding: 8,
    gap: 2,
  },
  partyRole: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.outline,
    letterSpacing: 0.4,
  },
  partyName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  partyDesc: {
    fontSize: 9.5,
    color: colors.onSurfaceVariant,
  },
  invoiceDeliverySummary: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 4,
  },
  invoiceDeliveryTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.outline,
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  invoiceDeliveryRow: {
    flexDirection: 'row',
    gap: 6,
  },
  invoiceDeliveryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    width: 80,
  },
  invoiceDeliveryVal: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurface,
  },
  invoiceTable: {
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tableHeadCell: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurface,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
  },
  tableCell: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  tableTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1.5,
    borderTopColor: colors.surfaceContainer,
  },
  tableTotalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.onSurface,
  },
  tableTotalVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  invoicePaymentAcknowledge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  acknowledgeTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#15803D',
  },
  acknowledgeDesc: {
    fontSize: 10,
    color: '#166534',
  },
  invoiceActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  printBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  printBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  invoiceCloseBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
    paddingVertical: 12,
    borderRadius: 12,
  },
  invoiceCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
});
