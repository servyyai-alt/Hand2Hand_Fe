import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Animated,
  Easing,
  Platform,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Reanimated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  Plus,
  MapPin,
  Clock,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Bell,
  User,
  ShieldCheck,
  KeyRound,
  Navigation,
  Headphones,
  CheckCircle2,
  ArrowRight,
  X,
  Crosshair,
  Building,
  Home,
  Briefcase,
  GraduationCap,
} from 'lucide-react-native';
import { apiClient } from '../../src/services/api.service';
import { profileService, SavedAddress } from '../../src/services/profile.service';
import { useAppSelector } from '../../src/hooks/useAppSelector';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { Skeleton } from '../../src/components/feedback/Skeleton';
import { colors, spacing } from '../../src/theme';
import { Reveal, Item, Press, Parallax, FloatView, WordReveal, RouteTrack, MiniBar } from '../../src/components/home/HomeMotion';

// ---------------------------------------------------------------------------
// Official H2H Brand Palette
// ---------------------------------------------------------------------------
const BRAND = {
  navy: '#00417E',
  navyDark: '#002B54',
  navyLight: '#E8F1FA',
  navySoft: '#1A5996',
  orange: '#FB7800',
  orangeLight: '#FFF2E5',
  orangeDark: '#D46300',
  green: '#008736',
  greenLight: '#E8F8EE',
  bg: '#F8FAFC',
  cardBg: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
};

// ---------------------------------------------------------------------------
// 6 Supported Categories (P2P Permitted)
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { icon: '📄', label: 'Documents', hint: 'Papers & files', actionCategory: 'DOCUMENTS', bg: '#EFF6FF', border: '#BFDBFE' },
  { icon: '🍔', label: 'Food', hint: 'Fresh & packed', actionCategory: 'FOOD', bg: '#FFF7ED', border: '#FED7AA' },
  { icon: '👕', label: 'Clothes', hint: 'Wear & laundry', actionCategory: 'CLOTHES', bg: '#F0FDF4', border: '#BBF7D0' },
  { icon: '🎁', label: 'Gifts', hint: 'Send a surprise', actionCategory: 'GIFTS', bg: '#FAF5FF', border: '#E9D5FF' },
  { icon: '📦', label: 'Parcel', hint: 'Boxes & goods', actionCategory: 'PARCEL', bg: '#FFF1F2', border: '#FECDD3' },
  { icon: '📚', label: 'Books', hint: 'Read & share', actionCategory: 'BOOKS', bg: '#F0F9FF', border: '#BAE6FD' },
];

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function usePulse(duration = 1600) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, duration]);
  return pulse;
}

export default function CustomerHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, accessToken: token, isGuest } = useAppSelector((s) => s.auth);
  const unreadNotifications = useAppSelector((s) => s.notification?.unreadCount ?? 0);
  const pulse = usePulse();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });

  // Location selector state
  const [selectedLocation, setSelectedLocation] = useState('Vellore, Tamil Nadu');
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);

  // Deliveries query
  const { data: deliveriesData, isLoading: deliveriesLoading, refetch, isRefetching } = useQuery({
    queryKey: ['customer', 'deliveries', 'recent'],
    queryFn: () => apiClient.get('/deliveries/my?page=1&limit=5').then((r) => r.data.data),
    enabled: Boolean(user && token),
    retry: (failureCount, error: any) => error?.response?.status !== 401 && failureCount < 1,
  });

  // Saved addresses for location picker
  const { data: savedAddresses = [] } = useQuery<SavedAddress[]>({
    queryKey: ['customer', 'addresses'],
    queryFn: () => profileService.getAddresses(),
    enabled: Boolean(user && token),
    staleTime: 60_000,
  });

  // CMS Home Banners query
  const { data: banners = [] } = useQuery<Array<{ _id: string; title: string; subtitle?: string; imageUrl?: string; actionCategory?: string }>>({
    queryKey: ['home-banners', 'active'],
    queryFn: () => apiClient.get('/home-banners/active').then((r) => r.data.data || []).catch(() => []),
    staleTime: 60_000,
    retry: false,
  });

  const activeDelivery = deliveriesData?.data?.find(
    (d: { status: string }) => !['DELIVERED', 'CANCELLED', 'FAILED'].includes(d.status)
  );

  const recentDeliveries = (deliveriesData?.data || []).slice(0, 3);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  // Handle GPS detection
  const handleDetectLocation = async () => {
    setDetectingGps(true);
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (geo) {
          const locName = [geo.name || geo.district, geo.city || geo.subregion, geo.region].filter(Boolean).slice(0, 2).join(', ');
          setSelectedLocation(locName || 'Current Location');
        }
      }
    } catch {
      setSelectedLocation('Vellore, Tamil Nadu');
    } finally {
      setDetectingGps(false);
      setLocationModalOpen(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Reanimated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 14) + spacing.xs,
            paddingBottom: Math.max(insets.bottom, 16) + 120,
          },
        ]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BRAND.orange} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================================= */}
        {/* 1. TOP HEADER & BRAND BAR                                         */}
        {/* ================================================================= */}
        <Reveal scrollY={scrollY} immediate>
          <View style={styles.topHeader}>
            {/* Left: Brand Monogram & Name */}
            <View style={styles.brandRow}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logoBadge}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.brandTitle}>Hand2Hand</Text>
                <Text style={styles.brandSubtitle}>Direct P2P Delivery</Text>
              </View>
            </View>

            {/* Right: Notification Bell & Profile Shortcut */}
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => router.push('/(customer)/notifications')}
                accessibilityLabel="Notifications"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Bell size={20} color={BRAND.navy} />
                {unreadNotifications > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.avatarBtn}
                onPress={() => router.push('/(customer)/profile')}
                accessibilityLabel="Profile"
              >
                <Text style={styles.avatarInitial}>
                  {user?.name?.[0]?.toUpperCase() ?? (isGuest ? 'G' : 'U')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Location Selector Bar */}
          <TouchableOpacity
            style={styles.locationBar}
            activeOpacity={0.75}
            onPress={() => setLocationModalOpen(true)}
          >
            <View style={styles.locationPinWrap}>
              <MapPin size={16} color={BRAND.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.locationLabel}>Delivering in</Text>
              <Text style={styles.locationValue} numberOfLines={1}>
                {selectedLocation}
              </Text>
            </View>
            <View style={styles.changeAffordance}>
              <Text style={styles.changeText}>Change</Text>
              <ChevronDown size={14} color={BRAND.navy} />
            </View>
          </TouchableOpacity>

          {/* User Greeting */}
          <View style={styles.greetingSection}>
            <Text style={styles.greetingTime}>Good {getTimeOfDay()},</Text>
            <Text style={styles.greetingName} numberOfLines={1}>
              {user?.name?.split(' ')[0] || (isGuest ? 'Guest' : 'Friend')} 👋
            </Text>
          </View>
        </Reveal>

        {/* ================================================================= */}
        {/* 2. HERO BANNER                                                    */}
        {/* ================================================================= */}
        <Reveal scrollY={scrollY} immediate>
          <Parallax scrollY={scrollY} style={styles.heroCard}>
            {/* Visual decorative accents */}
            <FloatView style={styles.heroCircleDeco} amp={12} />
            <FloatView style={styles.heroCircleDecoSmall} amp={8} duration={2000} />

            <View style={styles.heroContent}>
              <View style={styles.heroTag}>
                <Sparkles size={13} color="#FFFFFF" />
                <Text style={styles.heroTagText}>Hand2Hand Person-to-Person</Text>
              </View>

              <WordReveal text="Send anything. Across your city." style={styles.heroHeadline} />
              <Text style={styles.heroDesc}>
                From documents to parcels, send items from one person to another with H2H.
              </Text>

              <RouteTrack />

              <View style={styles.heroCtaRow}>
                <Press style={styles.heroPrimaryBtn}
                  onPress={() => router.push('/(customer)/create-delivery')}
                >
                  <Package size={18} color="#FFFFFF" />
                  <Text style={styles.heroPrimaryBtnText}>Send an Item</Text>
                  <ArrowRight size={16} color="#FFFFFF" />
                </Press>

                <View style={styles.heroPillBadge}>
                  <Text style={styles.heroPillText}>⚡ Direct Pickup</Text>
                </View>
              </View>
            </View>
          </Parallax>
        </Reveal>

        {/* ================================================================= */}
        {/* 3. CMS PROMOTIONAL BANNER (if available from backend)             */}
        {/* ================================================================= */}
        {banners.length > 0 && (
          <Reveal scrollY={scrollY}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cmsBannersScroll}
            >
              {banners.map((b) => (
                <TouchableOpacity
                  key={b._id}
                  style={styles.cmsBannerCard}
                  activeOpacity={0.85}
                  onPress={() => {
                    const cat = b.actionCategory?.toUpperCase();
                    router.push(cat ? `/(customer)/create-delivery?category=${cat}` : '/(customer)/create-delivery');
                  }}
                >
                  <View style={styles.cmsBannerBadge}>
                    <Text style={styles.cmsBannerBadgeText}>H2H SPECIAL</Text>
                  </View>
                  <Text style={styles.cmsBannerTitle} numberOfLines={1}>{b.title}</Text>
                  {b.subtitle ? (
                    <Text style={styles.cmsBannerSubtitle} numberOfLines={1}>{b.subtitle}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Reveal>
        )}

        {/* ================================================================= */}
        {/* 4. QUICK SEND ACTION CARD                                         */}
        {/* ================================================================= */}
        <Reveal scrollY={scrollY}>
          <Press style={styles.quickSendCard}
            onPress={() => router.push('/(customer)/create-delivery')}
          >
            <View style={styles.quickSendLeft}>
              <View style={styles.quickSendIconBox}>
                <Animated.View
                  style={[
                    styles.quickPulseRing,
                    { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
                  ]}
                />
                <Package size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickSendTitle}>Instant P2P Delivery</Text>
                <Text style={styles.quickSendSub}>A partner picks it up from you & delivers directly</Text>
              </View>
            </View>
            <View style={styles.quickSendPlus}>
              <Plus size={20} color="#FFFFFF" />
            </View>
          </Press>
        </Reveal>

        {/* ================================================================= */}
        {/* 5. ITEM CATEGORIES (6 Supported)                                  */}
        {/* ================================================================= */}
        <Reveal scrollY={scrollY}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>What are you sending?</Text>
              <Text style={styles.sectionSub}>Select a category to quickly start booking</Text>
            </View>
          </View>

          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat, i) => (
              <Press i={i} key={cat.label} style={[styles.categoryCard, { backgroundColor: cat.bg, borderColor: cat.border }]}
                onPress={() => router.push(`/(customer)/create-delivery?category=${cat.actionCategory}`)}
              >
                <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
                <Text style={styles.categoryHint}>{cat.hint}</Text>
              </Press>
            ))}
          </View>
        </Reveal>

        {/* ================================================================= */}
        {/* 6. ACTIVE DELIVERY SECTION                                        */}
        {/* ================================================================= */}
        <Reveal scrollY={scrollY}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Active Delivery</Text>
              {activeDelivery && (
                <View style={styles.liveIndicator}>
                  <Animated.View
                    style={[
                      styles.livePulseRing,
                      { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
                    ]}
                  />
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Live</Text>
                </View>
              )}
            </View>
            {activeDelivery && (
              <TouchableOpacity onPress={() => router.push('/(customer)/deliveries')}>
                <Text style={styles.viewAllLink}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {activeDelivery ? (
            <Press style={styles.activeCard}
              onPress={() => router.push(`/(customer)/tracking?id=${activeDelivery._id}`)}
            >
              <View style={styles.activeCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeCategory}>
                    {activeDelivery.packageDetails?.category || 'Parcel Delivery'}
                  </Text>
                  <Text style={styles.activeTrackingId}>
                    ID: {activeDelivery.trackingId || activeDelivery._id?.slice(-8).toUpperCase()}
                  </Text>
                </View>
                <StatusBadge status={activeDelivery.status} />
              </View>

              <View style={styles.routeContainer}>
                <View style={styles.routePoints}>
                  <View style={[styles.routeDot, { backgroundColor: BRAND.navy }]} />
                  <View style={styles.routeLine} />
                  <View style={[styles.routeDot, { backgroundColor: BRAND.orange }]} />
                </View>
                <View style={styles.routeLabels}>
                  <Text style={styles.routeAddr} numberOfLines={1}>
                    {activeDelivery.pickup?.address || 'Pickup point'}
                  </Text>
                  <Text style={styles.routeAddr} numberOfLines={1}>
                    {activeDelivery.drop?.address || 'Delivery point'}
                  </Text>
                </View>
              </View>

              {activeDelivery.partner && (
                <View style={styles.partnerSnippet}>
                  <Text style={styles.partnerSnippetLabel}>Delivery Partner:</Text>
                  <Text style={styles.partnerSnippetName}>
                    {activeDelivery.partner?.name || 'Assigned Partner'}
                  </Text>
                </View>
              )}

              <View style={styles.activeCardFooter}>
                <View style={styles.activeFooterLeft}>
                  <Clock size={14} color={BRAND.textMuted} />
                  <Text style={styles.activeFooterTime}>
                    {new Date(activeDelivery.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.trackActionBtn}>
                  <Text style={styles.trackActionText}>Track Delivery</Text>
                  <ChevronRight size={15} color={BRAND.navy} />
                </View>
              </View>
            </Press>
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Package size={28} color={BRAND.navy} />
              </View>
              <Text style={styles.emptyTitle}>No deliveries yet</Text>
              <Text style={styles.emptySub}>
                Your sent and received deliveries will appear here.
              </Text>
              <TouchableOpacity
                style={styles.emptyCta}
                onPress={() => router.push('/(customer)/create-delivery')}
              >
                <Plus size={16} color={BRAND.orange} />
                <Text style={styles.emptyCtaText}>Send an Item</Text>
              </TouchableOpacity>
            </View>
          )}
        </Reveal>

        {/* ================================================================= */}
        {/* 7. RECENT DELIVERIES (Top 3)                                      */}
        {/* ================================================================= */}
        {recentDeliveries.length > 0 && !activeDelivery && (
          <Reveal scrollY={scrollY}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Deliveries</Text>
              <TouchableOpacity onPress={() => router.push('/(customer)/deliveries')}>
                <Text style={styles.viewAllLink}>View All</Text>
              </TouchableOpacity>
            </View>

            {deliveriesLoading ? (
              <View style={{ gap: 8 }}>
                {[1, 2].map((i) => (
                  <Skeleton key={i} height={72} borderRadius={16} />
                ))}
              </View>
            ) : (
              recentDeliveries.map((item: any) => (
                <TouchableOpacity
                  key={item._id}
                  style={styles.recentItemCard}
                  onPress={() => router.push(`/(customer)/tracking?id=${item._id}`)}
                >
                  <View style={styles.recentIconWrap}>
                    <Package size={18} color={BRAND.navy} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentItemTitle} numberOfLines={1}>
                      {item.packageDetails?.category || 'Delivery'} • {item.trackingId || item._id?.slice(-6)}
                    </Text>
                    <Text style={styles.recentItemDrop} numberOfLines={1}>
                      To: {item.drop?.address || 'Destination'}
                    </Text>
                  </View>
                  <StatusBadge status={item.status} />
                </TouchableOpacity>
              ))
            )}
          </Reveal>
        )}

        {/* ================================================================= */}
        {/* 8. HOW H2H WORKS (Person-to-Person Steps)                         */}
        {/* ================================================================= */}
        <Reveal scrollY={scrollY}>
          <View style={styles.howItWorksContainer}>
            <View style={styles.howItWorksHeader}>
              <Text style={styles.sectionTitle}>How H2H Works</Text>
              <Text style={styles.sectionSub}>Person-to-person delivery in 3 simple steps</Text>
            </View>

            <View style={styles.stepList}>
              <Item i={0} dx={-32} dy={0} style={styles.stepCard}>
                <View style={[styles.stepNumberBadge, { backgroundColor: BRAND.navy }]}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Book a delivery</Text>
                  <Text style={styles.stepDesc}>
                    Enter the pickup location, recipient drop-off, and package details.
                  </Text>
                </View>
              </Item>

              <Item i={1} dx={-32} dy={0} style={styles.stepCard}>
                <View style={[styles.stepNumberBadge, { backgroundColor: BRAND.orange }]}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Partner collects it</Text>
                  <Text style={styles.stepDesc}>
                    The assigned delivery partner arrives at pickup and verifies pickup OTP.
                  </Text>
                </View>
              </Item>

              <Item i={2} dx={-32} dy={0} style={styles.stepCard}>
                <View style={[styles.stepNumberBadge, { backgroundColor: BRAND.green }]}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Delivered hand to hand</Text>
                  <Text style={styles.stepDesc}>
                    The recipient verifies delivery hand-to-hand using their delivery OTP.
                  </Text>
                </View>
              </Item>
            </View>
          </View>
        </Reveal>

        {/* ================================================================= */}
        {/* 9. TRUST & SAFETY SECTION                                         */}
        {/* ================================================================= */}
        <Reveal scrollY={scrollY}>
          <View style={styles.trustContainer}>
            <View style={styles.trustHeader}>
              <View style={styles.trustHeaderTitleRow}>
                <ShieldCheck size={20} color={BRAND.navy} />
                <Text style={styles.trustSectionTitle}>Safe & Reliable Delivery</Text>
              </View>
              <Text style={styles.trustSectionSubtitle}>Every delivery is protected end to end</Text>
            </View>

            <View style={styles.trustGrid}>
              <Item i={0} style={[styles.trustCard, styles.trustCardNavy]}>
                <View style={[styles.trustIconWrap, { backgroundColor: BRAND.navyLight }]}>
                  <ShieldCheck size={20} color={BRAND.navy} />
                </View>
                <Text style={styles.trustCardTitle}>Verified Partners</Text>
                <Text style={styles.trustCardDesc}>
                  Every delivery partner is verified with full KYC background checks.
                </Text>
              </Item>

              <Item i={1} style={[styles.trustCard, styles.trustCardOrange]}>
                <View style={[styles.trustIconWrap, { backgroundColor: BRAND.orangeLight }]}>
                  <KeyRound size={20} color={BRAND.orange} />
                </View>
                <Text style={styles.trustCardTitle}>Dual OTP Security</Text>
                <Text style={styles.trustCardDesc}>
                  Protected pickup & delivery OTP ensures hand-to-hand authenticity.
                </Text>
              </Item>

              <Item i={2} style={[styles.trustCard, styles.trustCardGreen]}>
                <View style={[styles.trustIconWrap, { backgroundColor: BRAND.greenLight }]}>
                  <Navigation size={20} color={BRAND.green} />
                </View>
                <Text style={styles.trustCardTitle}>Live Tracking</Text>
                <Text style={styles.trustCardDesc}>
                  Real-time status updates from item pickup to doorstep drop-off.
                </Text>
              </Item>

              <Item i={3} style={[styles.trustCard, styles.trustCardPurple]}>
                <View style={[styles.trustIconWrap, { backgroundColor: '#F3E8FF' }]}>
                  <Headphones size={20} color="#7E22CE" />
                </View>
                <Text style={styles.trustCardTitle}>Customer Care</Text>
                <Text style={styles.trustCardDesc}>
                  Dedicated support team ready to assist with any questions.
                </Text>
              </Item>
            </View>
          </View>
        </Reveal>
      </Reanimated.ScrollView>
      <MiniBar scrollY={scrollY} top={insets.top} />

      {/* ================================================================= */}
      {/* 10. LOCATION PICKER MODAL                                         */}
      {/* ================================================================= */}
      <Modal
        visible={locationModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLocationModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Choose Location</Text>
                <Text style={styles.modalSub}>Select where you want deliveries handled</Text>
              </View>
              <TouchableOpacity
                onPress={() => setLocationModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={BRAND.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* GPS Detection Button */}
            <TouchableOpacity
              style={styles.gpsDetectBtn}
              onPress={handleDetectLocation}
              disabled={detectingGps}
            >
              <View style={styles.gpsIconCircle}>
                {detectingGps ? (
                  <ActivityIndicator size="small" color={BRAND.orange} />
                ) : (
                  <Crosshair size={18} color={BRAND.orange} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.gpsDetectTitle}>Use Current Location</Text>
                <Text style={styles.gpsDetectSub}>
                  {detectingGps ? 'Detecting via GPS...' : 'Detect location using your device GPS'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Saved Addresses List */}
            <Text style={styles.modalSectionHeading}>Saved Addresses</Text>
            {savedAddresses.length > 0 ? (
              savedAddresses.map((addr) => (
                <TouchableOpacity
                  key={addr._id}
                  style={styles.savedAddrRow}
                  onPress={() => {
                    setSelectedLocation(`${addr.label || addr.type} - ${addr.city || 'Vellore'}`);
                    setLocationModalOpen(false);
                  }}
                >
                  <View style={styles.savedAddrIcon}>
                    {addr.type === 'Home' ? (
                      <Home size={16} color={BRAND.navy} />
                    ) : addr.type === 'Work' ? (
                      <Briefcase size={16} color={BRAND.navy} />
                    ) : addr.type === 'College' ? (
                      <GraduationCap size={16} color={BRAND.navy} />
                    ) : (
                      <Building size={16} color={BRAND.navy} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.savedAddrLabel}>{addr.label || addr.type}</Text>
                    <Text style={styles.savedAddrText} numberOfLines={1}>{addr.address}</Text>
                  </View>
                  <CheckCircle2
                    size={18}
                    color={selectedLocation.includes(addr.label || addr.type) ? BRAND.green : BRAND.border}
                  />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noSavedAddrBox}>
                <Text style={styles.noSavedAddrText}>No saved addresses yet</Text>
              </View>
            )}

            {/* Manage Addresses Shortcut */}
            <TouchableOpacity
              style={styles.manageAddrBtn}
              onPress={() => {
                setLocationModalOpen(false);
                router.push('/(customer)/profile/addresses');
              }}
            >
              <Text style={styles.manageAddrText}>+ Manage Saved Addresses</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BRAND.bg,
  },
  content: {
    paddingHorizontal: 16,
    gap: 16,
  },

  // 1. Top Header
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BRAND.textPrimary,
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    color: BRAND.textMuted,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BRAND.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: BRAND.orange,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.navy,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Location selector bar
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    gap: 10,
    marginTop: 6,
  },
  locationPinWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BRAND.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: BRAND.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationValue: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND.textPrimary,
  },
  changeAffordance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND.navyLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND.navy,
  },

  // Greeting
  greetingSection: {
    marginTop: 4,
  },
  greetingTime: {
    fontSize: 13,
    color: BRAND.textMuted,
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 22,
    fontWeight: '800',
    color: BRAND.textPrimary,
    letterSpacing: -0.4,
  },

  // 2. Hero Banner
  heroCard: {
    backgroundColor: BRAND.navy,
    borderRadius: 22,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: BRAND.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
  heroCircleDeco: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroCircleDecoSmall: {
    position: 'absolute',
    right: 50,
    bottom: -40,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(251,120,0,0.12)',
  },
  heroContent: {
    zIndex: 1,
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  heroTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  heroHeadline: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  heroDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 8,
  },
  heroCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRAND.orange,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    shadowColor: BRAND.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  heroPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  heroPillBadge: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  heroPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // 3. CMS Banners
  cmsBannersScroll: {
    gap: 12,
    paddingVertical: 2,
  },
  cmsBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BRAND.border,
    minWidth: 220,
    maxWidth: 260,
  },
  cmsBannerBadge: {
    backgroundColor: BRAND.orangeLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  cmsBannerBadgeText: {
    color: BRAND.orangeDark,
    fontSize: 9,
    fontWeight: '800',
  },
  cmsBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND.textPrimary,
  },
  cmsBannerSubtitle: {
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 2,
  },

  // 4. Quick Send
  quickSendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: BRAND.orange,
    shadowColor: BRAND.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  quickSendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    paddingRight: 8,
  },
  quickSendIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: BRAND.orange,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  quickPulseRing: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: BRAND.orange,
  },
  quickSendTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BRAND.textPrimary,
  },
  quickSendSub: {
    fontSize: 12,
    color: BRAND.textSecondary,
    marginTop: 2,
  },
  quickSendPlus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 5. Categories
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: BRAND.textPrimary,
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: (Dimensions.get('window').width - 32 - 20) / 3,
    minHeight: 94,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmoji: {
    fontSize: 26,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND.textPrimary,
    textAlign: 'center',
  },
  categoryHint: {
    fontSize: 10,
    color: BRAND.textMuted,
    textAlign: 'center',
    marginTop: 1,
  },

  // 6. Active Delivery
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: BRAND.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    position: 'relative',
  },
  livePulseRing: {
    position: 'absolute',
    left: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.green,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.green,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND.green,
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND.navy,
  },
  activeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    gap: 12,
  },
  activeCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  activeCategory: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND.textPrimary,
  },
  activeTrackingId: {
    fontSize: 12,
    color: BRAND.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: BRAND.bg,
    padding: 12,
    borderRadius: 12,
  },
  routePoints: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 12,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeLine: {
    width: 1.5,
    height: 18,
    backgroundColor: BRAND.border,
    marginVertical: 2,
  },
  routeLabels: {
    flex: 1,
    gap: 8,
  },
  routeAddr: {
    fontSize: 12,
    color: BRAND.textPrimary,
    fontWeight: '500',
  },
  partnerSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND.navyLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  partnerSnippetLabel: {
    fontSize: 11,
    color: BRAND.navy,
    fontWeight: '500',
  },
  partnerSnippetName: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND.navy,
  },
  activeCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: BRAND.borderLight,
    paddingTop: 10,
  },
  activeFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeFooterTime: {
    fontSize: 12,
    color: BRAND.textMuted,
  },
  trackActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trackActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND.navy,
  },

  // Empty State
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND.navyLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    color: BRAND.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND.orangeLight,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  emptyCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND.orangeDark,
  },

  // 7. Recent Items
  recentItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    gap: 12,
  },
  recentIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: BRAND.navyLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND.textPrimary,
  },
  recentItemDrop: {
    fontSize: 11,
    color: BRAND.textMuted,
    marginTop: 2,
  },

  // 8. How H2H Works
  howItWorksContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BRAND.border,
    gap: 14,
  },
  howItWorksHeader: {},
  stepList: {
    gap: 14,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND.textPrimary,
  },
  stepDesc: {
    fontSize: 12,
    color: BRAND.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },

  // 9. Trust & Safety
  trustContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    gap: 14,
  },
  trustHeader: {
    gap: 4,
  },
  trustHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BRAND.navy,
  },
  trustSectionSubtitle: {
    fontSize: 12,
    color: BRAND.textMuted,
    fontWeight: '500',
  },
  trustGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  trustCard: {
    width: '48%',
    minHeight: 148,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'flex-start',
  },
  trustCardNavy: {
    borderTopColor: BRAND.navy,
  },
  trustCardOrange: {
    borderTopColor: BRAND.orange,
  },
  trustCardGreen: {
    borderTopColor: BRAND.green,
  },
  trustCardPurple: {
    borderTopColor: '#7E22CE',
  },
  trustIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  trustCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND.textPrimary,
    marginBottom: 4,
  },
  trustCardDesc: {
    fontSize: 12,
    color: BRAND.textSecondary,
    lineHeight: 16,
  },

  // 10. Location Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BRAND.textPrimary,
  },
  modalSub: {
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: BRAND.orangeLight,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  gpsIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsDetectTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND.orangeDark,
  },
  gpsDetectSub: {
    fontSize: 11,
    color: BRAND.textSecondary,
    marginTop: 1,
  },
  modalSectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  savedAddrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.borderLight,
  },
  savedAddrIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND.navyLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedAddrLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND.textPrimary,
  },
  savedAddrText: {
    fontSize: 11,
    color: BRAND.textMuted,
    marginTop: 1,
  },
  noSavedAddrBox: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  noSavedAddrText: {
    fontSize: 12,
    color: BRAND.textMuted,
  },
  manageAddrBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageAddrText: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND.navy,
  },
});
