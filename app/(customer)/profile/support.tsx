import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  PlusCircle,
  History,
  Truck,
  MapPin,
  CreditCard,
  User,
  PackageX,
  UserCog,
  HelpCircle,
  PhoneCall,
  MessageCircle,
  ChevronRight,
  Building2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react-native';
import { colors } from '../../../src/theme';

interface CategoryItem {
  id: string;
  categoryCode: string;
  title: string;
  icon: any;
  color: string;
  bgColor: string;
}

const CATEGORIES: CategoryItem[] = [
  { id: '1', categoryCode: 'DELIVERY_DELAY', title: 'Delivery Issue', icon: Truck, color: colors.secondary, bgColor: colors.secondaryFixed },
  { id: '2', categoryCode: 'WRONG_LOCATION', title: 'Pickup Issue', icon: MapPin, color: colors.primary, bgColor: colors.primaryFixed },
  { id: '3', categoryCode: 'BILLING', title: 'Payment Issue', icon: CreditCard, color: colors.secondaryContainer, bgColor: colors.secondaryFixed },
  { id: '4', categoryCode: 'DRIVER_BEHAVIOR', title: 'Delivery Partner Issue', icon: User, color: colors.primary, bgColor: colors.primaryFixed },
  { id: '5', categoryCode: 'DAMAGED_PACKAGE', title: 'Item Damaged / Missing', icon: PackageX, color: colors.error, bgColor: colors.errorContainer },
  { id: '6', categoryCode: 'ACCOUNT_ISSUE', title: 'Account Issue', icon: UserCog, color: colors.tertiary, bgColor: '#e6f7ec' },
  { id: '7', categoryCode: 'OTHER', title: 'Other Inquiries', icon: HelpCircle, color: colors.onSurfaceVariant, bgColor: colors.surfaceContainer },
];

export default function HelpAndSupportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = CATEGORIES.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCategoryPress = (cat: CategoryItem) => {
    router.push({
      pathname: '/(customer)/profile/tickets',
      params: { prefillCategory: cat.categoryCode },
    });
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:18001234424').catch(() => {
      Alert.alert('Phone Call', 'Toll-free customer hotline: 1800-123-4424 (24/7 Available)');
    });
  };

  const handleWhatsAppSupport = () => {
    Linking.openURL('https://wa.me/919876543210?text=Hi%20H2H%20Support,%20I%20need%20help%20with%20my%20order').catch(() => {
      Alert.alert('WhatsApp Support', 'Reach us on WhatsApp: +91 98765 43210');
    });
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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.supportBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.supportBadgeText}>Care 24/7</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 140 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <Text style={styles.searchPrompt}>How can we help today?</Text>
          <View style={styles.searchBar}>
            <Search size={18} color={colors.outline} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search help topics, orders or issues..."
              placeholderTextColor={colors.outline}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.raiseTicketBtn}
            onPress={() => router.push({ pathname: '/(customer)/profile/tickets', params: { openNew: 'true' } })}
            activeOpacity={0.8}
          >
            <PlusCircle size={16} color="#ffffff" />
            <Text style={styles.raiseTicketText} numberOfLines={1}>+ Raise Ticket</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewTicketsBtn}
            onPress={() => router.push('/(customer)/profile/tickets')}
            activeOpacity={0.8}
          >
            <History size={16} color={colors.primary} />
            <Text style={styles.viewTicketsText} numberOfLines={1}>View Tickets</Text>
          </TouchableOpacity>
        </View>

        {/* Categories Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SUPPORT CATEGORIES</Text>
          <View style={styles.categoryGrid}>
            {filteredCategories.map((cat) => {
              const IconComp = cat.icon;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.catCard}
                  onPress={() => handleCategoryPress(cat)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.catIconBox, { backgroundColor: cat.bgColor }]}>
                    <IconComp size={18} color={cat.color} />
                  </View>
                  <Text style={styles.catTitle}>{cat.title}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Contact Support Direct Channels */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>INSTANT ASSISTANCE</Text>
          <View style={styles.channelsCard}>
            <TouchableOpacity
              style={styles.channelRow}
              onPress={handleCallSupport}
              activeOpacity={0.7}
            >
              <View style={[styles.channelIconBox, { backgroundColor: colors.primaryFixed }]}>
                <PhoneCall size={18} color={colors.primary} />
              </View>
              <View style={styles.channelCol}>
                <Text style={styles.channelTitle}>Toll-Free Helpline (24/7)</Text>
                <Text style={styles.channelSub}>1800-123-4424 • Instant connection</Text>
              </View>
              <ChevronRight size={18} color={colors.outline} />
            </TouchableOpacity>

            <View style={styles.channelDivider} />

            <TouchableOpacity
              style={styles.channelRow}
              onPress={handleWhatsAppSupport}
              activeOpacity={0.7}
            >
              <View style={[styles.channelIconBox, { backgroundColor: '#e6f7ec' }]}>
                <MessageCircle size={18} color={colors.tertiary} />
              </View>
              <View style={styles.channelCol}>
                <Text style={styles.channelTitle}>WhatsApp Support</Text>
                <Text style={styles.channelSub}>Chat live with support representative</Text>
              </View>
              <ChevronRight size={18} color={colors.outline} />
            </TouchableOpacity>
          </View>
        </View>

        {/* H2H For Partners section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>H2H FOR PARTNERS</Text>
          <View style={styles.partnerApplyCard}>
            <View style={styles.partnerApplyHeader}>
              <View style={styles.partnerApplyIconBox}>
                <Truck size={22} color="#f97316" />
              </View>
              <View style={styles.partnerApplyTextCol}>
                <Text style={styles.partnerApplyTitle}>Become a Delivery Partner</Text>
                <Text style={styles.partnerApplySub}>Join H2H and earn by delivering items.</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.partnerApplyBtn}
              onPress={() => router.push('/partner/apply' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.partnerApplyBtnText}>Create Delivery Partner Account</Text>
              <ArrowRight size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  supportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e6f7ec',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.tertiary,
  },
  supportBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    lineHeight: 13,
    color: colors.tertiary,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 18,
  },
  searchSection: {
    gap: 8,
  },
  searchPrompt: {
    fontSize: 16.5,
    fontWeight: '700',
    lineHeight: 21,
    color: colors.onSurface,
    paddingHorizontal: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    shadowColor: '#111c2d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.onSurface,
    padding: 0,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  raiseTicketBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.secondaryContainer,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: colors.secondaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  raiseTicketText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  viewTicketsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  viewTicketsText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    color: colors.primary,
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catCard: {
    width: '48%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    gap: 6,
    shadowColor: '#111c2d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  catIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTitle: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    color: colors.onSurface,
  },
  channelsCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    overflow: 'hidden',
    shadowColor: '#111c2d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  channelIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  channelCol: {
    flex: 1,
    gap: 2,
  },
  channelTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 18,
    color: colors.onSurface,
  },
  channelSub: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    lineHeight: 15,
  },
  channelDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainer,
    marginHorizontal: 14,
  },
  partnerApplyCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    gap: 14,
  },
  partnerApplyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  partnerApplyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerApplyTextCol: {
    flex: 1,
  },
  partnerApplyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
    lineHeight: 20,
  },
  partnerApplySub: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
    marginTop: 2,
  },
  partnerApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f97316',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  partnerApplyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
