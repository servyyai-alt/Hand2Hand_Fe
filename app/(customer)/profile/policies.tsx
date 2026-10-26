import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  PackageCheck,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { colors } from '../../../src/theme';

interface PolicyItem {
  id: string;
  title: string;
  icon: any;
  content: string;
}

const POLICIES: PolicyItem[] = [
  {
    id: 'terms',
    title: 'Terms of Service',
    icon: FileText,
    content: `Welcome to H2H — Hand to Hand Delivery. By using our application and delivery services, you agree to comply with our user agreement.

1. User Eligibility: You must be at least 18 years old to create a Customer account and book deliveries.
2. Permitted Deliveries: You may only send personal items, documents, keys, chargers, clothing, and non-hazardous parcels within permissible weight limits (up to 15kg).
3. Prohibited Goods: You must not send illegal substances, hazardous chemicals, firearms, flammable liquids, or perishable uncanned items.
4. Handover Verification: The sender and recipient must verify handover using the secure 4-digit OTP provided in the app.`,
  },
  {
    id: 'privacy',
    title: 'Privacy Policy & Data Security',
    icon: ShieldCheck,
    content: `At H2H, your privacy and security are paramount.

1. Information Collected: We collect your name, phone number, email address, and delivery addresses solely to execute delivery fulfillment and customer support.
2. Location Access: GPS location is used exclusively during active order creation and route tracking.
3. Courier Access: Delivery partners receive your pickup and drop addresses only while assigned to your delivery. Once delivery is marked completed, customer contact details are anonymized.
4. Data Archival: If you choose to deactivate your account, historical order logs and invoices are retained for legal, financial, and regulatory compliance.`,
  },
  {
    id: 'delivery',
    title: 'Parcel Handover & Delivery Policy',
    icon: PackageCheck,
    content: `H2H operates on a direct Human-to-Human delivery model.

1. Direct Pickup: Once an order is accepted, your assigned delivery partner heads to the pickup point within estimated ETAs.
2. Handover OTP: Do not surrender any item without checking the delivery partner profile and verifying the pickup OTP.
3. Recipient Confirmation: Deliveries are only completed after the recipient provides the final confirmation OTP to the courier.
4. Item Care: Handlers are trained to treat packages with utmost care. Fragile items must be suitably packed by the sender.`,
  },
  {
    id: 'refunds',
    title: 'Cancellation & Refund Policy',
    icon: RotateCcw,
    content: `We ensure transparent pricing and fair cancellation policies.

1. Cancellation Before Pickup: You can cancel free of charge if no delivery partner has been dispatched or within 2 minutes of partner dispatch.
2. Cancellation After Pickup: Once the courier collects the package, cancellations require returning the item to the pickup point and may incur base fare charges.
3. Failed Delivery: If the recipient is unreachable after multiple attempts, the courier will return the package to the sender.
4. Refunds: Approved refunds are processed directly back to your original payment method within 3 to 5 business days.`,
  },
];

export default function PoliciesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>('terms');

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
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
        <Text style={styles.headerTitle}>Terms & Policies</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 140 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>H2H Legal & Trust Center</Text>
          <Text style={styles.introDesc}>
            Transparent terms and security policies governing our human-to-human Hand2Hand delivery network.
          </Text>
        </View>

        <View style={styles.policyList}>
          {POLICIES.map((p) => {
            const isExpanded = expandedId === p.id;
            const IconComp = p.icon;

            return (
              <View key={p.id} style={styles.policyCard}>
                <TouchableOpacity
                  style={styles.policyHeader}
                  onPress={() => toggleExpand(p.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.policyIconBox}>
                    <IconComp size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.policyTitle}>{p.title}</Text>
                  {isExpanded ? (
                    <ChevronUp size={20} color={colors.outline} />
                  ) : (
                    <ChevronDown size={20} color={colors.outline} />
                  )}
                </TouchableOpacity>

                {isExpanded ? (
                  <View style={styles.policyBody}>
                    <Text style={styles.policyContent}>{p.content}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
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
  headerRightPlaceholder: {
    width: 38,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 14,
  },
  introCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    gap: 4,
  },
  introTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    color: colors.primary,
  },
  introDesc: {
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
  policyList: {
    gap: 10,
  },
  policyCard: {
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
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  policyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    flexShrink: 0,
  },
  policyTitle: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 18,
    color: colors.onSurface,
  },
  policyBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
  },
  policyContent: {
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
});
