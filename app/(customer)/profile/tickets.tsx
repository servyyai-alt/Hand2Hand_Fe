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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Plus,
  Ticket,
  ChevronRight,
  Send,
  AlertCircle,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Sparkles,
} from 'lucide-react-native';
import { profileService, SupportTicket } from '../../../src/services/profile.service';
import { useAppSelector } from '../../../src/hooks/useAppSelector';
import { colors } from '../../../src/theme';
import { showToast } from '../../../src/utils/toast';

const STATUS_FILTERS = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const CATEGORIES = [
  { code: 'DELIVERY_DELAY', label: 'Delivery Delay' },
  { code: 'DAMAGED_PACKAGE', label: 'Damaged / Missing Item' },
  { code: 'WRONG_LOCATION', label: 'Pickup / Location Issue' },
  { code: 'BILLING', label: 'Fare & Payment Issue' },
  { code: 'DRIVER_BEHAVIOR', label: 'Delivery Partner Concern' },
  { code: 'ACCOUNT_ISSUE', label: 'Account & Security' },
  { code: 'OTHER', label: 'Other' },
];

export default function SupportTicketsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const currentUserId = useAppSelector((s) => s.auth.user?.id);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');

  // New ticket modal
  const [newModalVisible, setNewModalVisible] = useState(params.openNew === 'true');
  const [category, setCategory] = useState(
    (params.prefillCategory as string) || 'DELIVERY_DELAY'
  );
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Detail / Chat modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await profileService.getTickets({
        status: activeFilter !== 'ALL' ? activeFilter : undefined,
      });
      setTickets(res.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleCreateTicket = async () => {
    setCreateError(null);
    if (!subject.trim()) {
      setCreateError('Please enter a brief subject.');
      return;
    }
    if (!description.trim()) {
      setCreateError('Please describe the issue in detail.');
      return;
    }

    setCreating(true);
    try {
      await profileService.createTicket({
        category,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        relatedDeliveryId: (params.deliveryId as string) || undefined,
      });
      showToast('success', 'Ticket Raised', 'Support team has received your ticket.');
      setSubject('');
      setDescription('');
      setNewModalVisible(false);
      fetchTickets();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to raise ticket.';
      setCreateError(msg);
      showToast('error', 'Error', msg);
    } finally {
      setCreating(false);
    }
  };

  const openTicketDetail = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setDetailModalVisible(true);
    try {
      const fresh = await profileService.getTicketById(ticket._id);
      setSelectedTicket(fresh);
    } catch {}
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    setSendingReply(true);
    try {
      const updated = await profileService.addTicketMessage(
        selectedTicket._id,
        replyMessage.trim()
      );
      setSelectedTicket(updated);
      setReplyMessage('');
      fetchTickets();
    } catch (err: any) {
      showToast('error', 'Error', 'Failed to send message.');
    } finally {
      setSendingReply(false);
    }
  };

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
        <Text style={styles.headerTitle}>Support Tickets</Text>
        <TouchableOpacity
          style={styles.headerNewBtn}
          onPress={() => setNewModalVisible(true)}
          activeOpacity={0.8}
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.headerNewBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {STATUS_FILTERS.map((s) => {
            const isSel = activeFilter === s;
            const label = s === 'ALL' ? 'All' : s.replace('_', ' ');
            return (
              <TouchableOpacity
                key={s}
                style={[styles.filterChip, isSel && styles.filterChipSelected]}
                onPress={() => setActiveFilter(s)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, isSel && styles.filterChipTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 140 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading support tickets...</Text>
          </View>
        ) : tickets.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ticket size={38} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No support tickets found</Text>
            <Text style={styles.emptyDesc}>
              You do not have any open tickets. If you encounter any delivery or payment issue, raise a ticket for fast 24/7 care.
            </Text>
            <TouchableOpacity
              style={styles.emptyNewBtn}
              onPress={() => setNewModalVisible(true)}
              activeOpacity={0.8}
            >
              <Plus size={18} color="#ffffff" />
              <Text style={styles.emptyNewBtnText}>Raise a New Ticket</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Ticket List */
          <View style={styles.ticketList}>
            {tickets.map((t) => {
              const isOpen = t.status === 'OPEN';
              const isInProgress = t.status === 'IN_PROGRESS';
              const isResolved = t.status === 'RESOLVED';
              const isClosed = t.status === 'CLOSED';

              const shortId = t._id ? `#H2H-${t._id.slice(-4).toUpperCase()}` : '#H2H-TICK';
              const dateStr = new Date(t.createdAt).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <TouchableOpacity
                  key={t._id}
                  style={styles.ticketCard}
                  onPress={() => openTicketDetail(t)}
                  activeOpacity={0.8}
                >
                  <View style={styles.ticketTopRow}>
                    <View style={styles.ticketIdRow}>
                      <Text style={styles.ticketId}>{shortId}</Text>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>
                          {t.category.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        isOpen && styles.statusBadgeOpen,
                        isInProgress && styles.statusBadgeInProgress,
                        isResolved && styles.statusBadgeResolved,
                        isClosed && styles.statusBadgeClosed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isOpen && styles.statusBadgeTextOpen,
                          isInProgress && styles.statusBadgeTextInProgress,
                          isResolved && styles.statusBadgeTextResolved,
                          isClosed && styles.statusBadgeTextClosed,
                        ]}
                      >
                        {t.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.ticketSubject} numberOfLines={2}>
                    {t.subject}
                  </Text>

                  <View style={styles.ticketFooter}>
                    <View style={styles.dateRow}>
                      <Clock size={12} color={colors.outline} />
                      <Text style={styles.dateText}>{dateStr}</Text>
                    </View>
                    <View style={styles.moreRow}>
                      <Text style={styles.msgCountText}>
                        {t.messages?.length || 1} messages
                      </Text>
                      <ChevronRight size={16} color={colors.outline} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Raise New Ticket Modal */}
      <Modal
        visible={newModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setNewModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Raise Support Ticket</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setNewModalVisible(false)}
                activeOpacity={0.7}
              >
                <X size={20} color={colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalFormScroll}>
              {createError ? (
                <View style={styles.modalErrorBox}>
                  <AlertCircle size={16} color={colors.error} />
                  <Text style={styles.modalErrorText}>{createError}</Text>
                </View>
              ) : null}

              {/* Category Picker Chips */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>ISSUE CATEGORY</Text>
                <View style={styles.catWrap}>
                  {CATEGORIES.map((c) => {
                    const isSel = category === c.code;
                    return (
                      <TouchableOpacity
                        key={c.code}
                        style={[styles.catChip, isSel && styles.catChipSelected]}
                        onPress={() => setCategory(c.code)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.catChipText, isSel && styles.catChipTextSelected]}>
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Subject */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>SUBJECT</Text>
                <TextInput
                  style={styles.formInput}
                  value={subject}
                  onChangeText={(t) => {
                    setCreateError(null);
                    setSubject(t);
                  }}
                  placeholder="e.g. Courier hasn't arrived at pickup"
                  placeholderTextColor={colors.outline}
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>DETAILED DESCRIPTION</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={description}
                  onChangeText={(t) => {
                    setCreateError(null);
                    setDescription(t);
                  }}
                  placeholder="Provide context, pickup details or delivery tracking ID..."
                  placeholderTextColor={colors.outline}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Priority */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>URGENCY / PRIORITY</Text>
                <View style={styles.priorityRow}>
                  {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => {
                    const isSel = priority === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[styles.prioChip, isSel && styles.prioChipSelected]}
                        onPress={() => setPriority(p)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.prioChipText, isSel && styles.prioChipTextSelected]}>
                          {p}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Submit CTA */}
              <TouchableOpacity
                style={[styles.submitBtn, creating && styles.submitBtnDisabled]}
                onPress={handleCreateTicket}
                disabled={creating}
                activeOpacity={0.8}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Support Ticket</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Ticket Details & Chat Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalSheet, { maxHeight: '94%' }]}>
            {selectedTicket ? (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>
                      #H2H-{selectedTicket._id?.slice(-4).toUpperCase()}
                    </Text>
                    <Text style={styles.modalSub}>{selectedTicket.category.replace('_', ' ')}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setDetailModalVisible(false)}
                    activeOpacity={0.7}
                  >
                    <X size={20} color={colors.onSurface} />
                  </TouchableOpacity>
                </View>

                {/* Messages Thread */}
                <ScrollView
                  style={styles.threadScroll}
                  contentContainerStyle={styles.threadContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.ticketSummaryBox}>
                    <Text style={styles.ticketSummarySubject}>{selectedTicket.subject}</Text>
                    <Text style={styles.ticketSummaryDesc}>{selectedTicket.description}</Text>
                  </View>

                  {selectedTicket.messages?.map((m, idx) => {
                    const isMe = m.senderId === currentUserId || m.senderRole === 'CUSTOMER';
                    return (
                      <View
                        key={idx}
                        style={[styles.chatBubbleWrap, isMe ? styles.chatBubbleMe : styles.chatBubbleSupport]}
                      >
                        <Text style={styles.chatSender}>
                          {isMe ? 'You' : m.senderName || 'H2H Support'}
                        </Text>
                        <Text style={[styles.chatText, isMe ? styles.chatTextMe : styles.chatTextSupport]}>
                          {m.message}
                        </Text>
                        <Text style={styles.chatTime}>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>

                {/* Reply Input */}
                <View style={styles.replyBar}>
                  <TextInput
                    style={styles.replyInput}
                    value={replyMessage}
                    onChangeText={setReplyMessage}
                    placeholder="Type message reply..."
                    placeholderTextColor={colors.outline}
                  />
                  <TouchableOpacity
                    style={[styles.sendBtn, (!replyMessage.trim() || sendingReply) && styles.sendBtnDisabled]}
                    onPress={handleSendReply}
                    disabled={!replyMessage.trim() || sendingReply}
                    activeOpacity={0.8}
                  >
                    {sendingReply ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Send size={18} color="#ffffff" />
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  headerNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  headerNewBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  filterWrap: {
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.surfaceContainerLow,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    lineHeight: 15,
    color: colors.onSurfaceVariant,
  },
  filterChipTextSelected: {
    color: '#ffffff',
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
  emptyNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    marginTop: 8,
  },
  emptyNewBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 18,
  },
  ticketList: {
    gap: 10,
  },
  ticketCard: {
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
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  ticketIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  ticketId: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
    color: colors.primary,
  },
  categoryBadge: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  categoryBadgeText: {
    fontSize: 9.5,
    fontWeight: '600',
    lineHeight: 12,
    color: colors.onSurfaceVariant,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  statusBadgeOpen: {
    backgroundColor: colors.primaryFixed,
  },
  statusBadgeInProgress: {
    backgroundColor: colors.secondaryFixed,
  },
  statusBadgeResolved: {
    backgroundColor: '#e6f7ec',
  },
  statusBadgeClosed: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    lineHeight: 12,
  },
  statusBadgeTextOpen: {
    color: colors.primary,
  },
  statusBadgeTextInProgress: {
    color: colors.secondary,
  },
  statusBadgeTextResolved: {
    color: colors.tertiary,
  },
  statusBadgeTextClosed: {
    color: colors.outline,
  },
  ticketSubject: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.onSurface,
    lineHeight: 18,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 10.5,
    lineHeight: 14,
    color: colors.outline,
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  msgCountText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  modalSub: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFormScroll: {
    padding: 20,
    gap: 16,
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
    color: colors.error,
    flex: 1,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  catWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  catChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catChipText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  catChipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  formInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    fontSize: 14,
    color: colors.onSurface,
  },
  formTextArea: {
    minHeight: 90,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  prioChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  prioChipSelected: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondaryContainer,
  },
  prioChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  prioChipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  threadScroll: {
    flex: 1,
  },
  threadContent: {
    padding: 16,
    gap: 12,
  },
  ticketSummaryBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 14,
    gap: 4,
    marginBottom: 8,
  },
  ticketSummarySubject: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  ticketSummaryDesc: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  chatBubbleWrap: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 16,
    gap: 4,
  },
  chatBubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  chatBubbleSupport: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceContainerHigh,
    borderBottomLeftRadius: 4,
  },
  chatSender: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.outlineVariant,
  },
  chatText: {
    fontSize: 13,
    lineHeight: 18,
  },
  chatTextMe: {
    color: '#ffffff',
  },
  chatTextSupport: {
    color: colors.onSurface,
  },
  chatTime: {
    fontSize: 9,
    color: colors.outline,
    alignSelf: 'flex-end',
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
    gap: 8,
    backgroundColor: colors.surfaceContainerLowest,
  },
  replyInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.onSurface,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
