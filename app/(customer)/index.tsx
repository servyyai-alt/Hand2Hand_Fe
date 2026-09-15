import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Animated,
  Easing,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Package, Plus, MapPin, Clock, ChevronRight, ArrowUpRight, Sparkles } from 'lucide-react-native';
import { apiClient } from '../../src/services/api.service';
import { useAppSelector } from '../../src/hooks/useAppSelector';
import { FadeIn } from '../../src/components/animations/FadeIn';
import { SlideUp } from '../../src/components/animations/SlideUp';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { Skeleton } from '../../src/components/feedback/Skeleton';
import { spacing } from '../../src/theme';

// ---------------------------------------------------------------------------
// Premium palette — white base, orange accent, soft glass surfaces
// ---------------------------------------------------------------------------
const palette = {
  bg: '#FFFFFF',
  bgSoft: '#FFF9F5',
  glass: 'rgba(255,255,255,0.55)',
  glassBorder: 'rgba(255,255,255,0.8)',
  orange: '#FF6A1A',
  orangeDeep: '#E8540A',
  orangeSoft: '#FFA95C',
  orangeTint: '#FFF1E6',
  ink: '#1A1410',
  inkSoft: '#6B615B',
  inkFaint: '#B3A99F',
  line: 'rgba(255,106,26,0.12)',
  shadow: '#FF6A1A',
};

const CATEGORIES = [
  { icon: '📄', label: 'Documents', hint: 'Papers & files', border: '#FF9B62' },
  { icon: '🍔', label: 'Food', hint: 'Fresh & packed', border: '#F4C84A' },
  { icon: '👕', label: 'Clothes', hint: 'Wear & care', border: '#72B7F2' },
  { icon: '🎁', label: 'Gifts', hint: 'Send a surprise', border: '#B993EE' },
  { icon: '📦', label: 'Parcel', hint: 'Boxes & goods', border: '#63C995' },
  { icon: '📚', label: 'Books', hint: 'Read & share', border: '#F28BA1' },
];

const FALLBACK_HOME_CARDS = [
  { title: 'Need it there fast?', subtitle: 'We deliver across Vellore', emoji: '⚡', accent: '#FFF5D9', actionCategory: 'PARCEL' },
  { title: 'Send a little joy', subtitle: 'Make someone smile today', emoji: '💛', accent: '#F5EDFF', actionCategory: 'GIFTS' },
  { title: 'Good food is closer', subtitle: 'Hot meals, right on time', emoji: '🍔', accent: '#FFF0E7', actionCategory: 'FOOD' },
  { title: 'Your time matters', subtitle: 'Simple, quick local delivery', emoji: '🕒', accent: '#E8FAF1', actionCategory: 'DOCUMENTS' },
];

// ---------------------------------------------------------------------------
// Small animation helpers (no extra deps beyond RN Animated)
// ---------------------------------------------------------------------------

/** Gentle continuous pulse used behind the CTA icon + active-delivery dot */
function usePulse(duration = 1600) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, duration]);
  return pulse;
}

/** Press scale feedback for tappable glass surfaces */
function usePressScale(to = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return { scale, onPressIn, onPressOut };
}

/** Reusable frosted-glass surface */
function GlassSurface({
  children,
  style,
  intensity = 40,
}: {
  children: React.ReactNode;
  style?: any;
  intensity?: number;
}) {
  return (
    <View style={[styles.glassWrap, style]}>
      <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.glassOverlay} pointerEvents="none" />
      <View style={styles.glassContent}>{children}</View>
    </View>
  );
}

export default function CustomerHome() {
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const pulse = usePulse();
  const ctaPress = usePressScale(0.96);
  const activePress = usePressScale(0.98);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['customer', 'deliveries', 'recent'],
    queryFn: () => apiClient.get('/deliveries/my?page=1&limit=5').then((r) => r.data.data),
  });
  const { data: homeCards = [] } = useQuery({
    queryKey: ['home-cards', 'active'],
    queryFn: () => apiClient.get('/home-cards/active').then((r) => shuffleCards(r.data.data)),
    staleTime: 60_000,
  });
  const marqueeCards = homeCards.length ? homeCards : shuffleCards(FALLBACK_HOME_CARDS);
  const { data: banners = [] } = useQuery({
    queryKey: ['home-banners', 'active'],
    queryFn: () => apiClient.get('/home-banners/active').then((r) => r.data.data),
    staleTime: 60_000,
  });

  const active = data?.data?.find(
    (d: { status: string }) => !['DELIVERED', 'CANCELLED', 'FAILED'].includes(d.status)
  );

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <View style={styles.screen}>
      {/* soft ambient orange glow blobs behind everything */}
      <View pointerEvents="none" style={styles.blobTopRight} />
      <View pointerEvents="none" style={styles.blobLeft} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={palette.orange} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <FadeIn>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Good {getTimeOfDay()},</Text>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{user?.name?.split(' ')[0] ?? 'there'}</Text>
                <Text style={styles.wave}>👋</Text>
              </View>
            </View>
            <View style={styles.avatarBox}>
              <LinearGradient
                colors={[palette.orangeSoft, palette.orange]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.avatarLetter}>{user?.name?.[0]?.toUpperCase() ?? 'U'}</Text>
            </View>
          </View>
        </FadeIn>

        <BannerCarousel banners={banners} onPress={(category) => router.push(`/(customer)/create-delivery?category=${category}`)} />

        {/* Create delivery CTA */}
        <SlideUp delay={80}>
          <Animated.View style={{ transform: [{ scale: ctaPress.scale }] }}>
            <TouchableOpacity
              activeOpacity={1}
              onPressIn={ctaPress.onPressIn}
              onPressOut={ctaPress.onPressOut}
              onPress={() => router.push('/(customer)/create-delivery')}
              style={styles.ctaShadowWrap}
            >
              <LinearGradient
                colors={[palette.orange, palette.orangeDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaCard}
              >
                <View style={styles.ctaLeft}>
                  <View style={styles.ctaIconWrap}>
                    <Animated.View
                      style={[
                        styles.ctaPulseRing,
                        { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
                      ]}
                    />
                    <Package size={22} color="#fff" />
                  </View>
                  <View>
                    <Text style={styles.ctaTitle}>Send something</Text>
                    <Text style={styles.ctaSub}>Fast delivery across Vellore</Text>
                  </View>
                </View>
                <View style={styles.ctaPlus}>
                  <Plus size={20} color={palette.orangeDeep} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </SlideUp>

        <HomeCardMarquee cards={marqueeCards} onPress={(category) => router.push(`/(customer)/create-delivery?category=${category}`)} />

        {/* Active delivery */}
        {active && (
          <SlideUp delay={140}>
            <Animated.View style={{ transform: [{ scale: activePress.scale }] }}>
              <TouchableOpacity
                activeOpacity={1}
                onPressIn={activePress.onPressIn}
                onPressOut={activePress.onPressOut}
                onPress={() => router.push(`/(customer)/tracking?id=${active._id}`)}
              >
                <GlassSurface style={styles.activeCard} intensity={55}>
                  <View style={styles.activeHeader}>
                    <View style={styles.activeHeaderLeft}>
                      <View style={styles.liveDotWrap}>
                        <Animated.View
                          style={[
                            styles.liveDotPulse,
                            { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
                          ]}
                        />
                        <View style={styles.liveDot} />
                      </View>
                      <Text style={styles.sectionTitle}>Active delivery</Text>
                    </View>
                    <StatusBadge status={active.status} />
                  </View>
                  <View style={styles.activeRow}>
                    <MapPin size={14} color={palette.orange} />
                    <Text style={styles.activeAddr} numberOfLines={1}>
                      {active.drop?.address}
                    </Text>
                    <ChevronRight size={14} color={palette.inkFaint} />
                  </View>
                  <View style={styles.trackingRow}>
                    <Text style={styles.trackingId}>{active.trackingId}</Text>
                    <View style={styles.trackingDivider} />
                    <Clock size={11} color={palette.inkFaint} />
                    <Text style={styles.trackingEta}>On the way</Text>
                  </View>
                </GlassSurface>
              </TouchableOpacity>
            </Animated.View>
          </SlideUp>
        )}

        {/* Categories */}
        <SlideUp delay={180}>
          <View style={styles.categoryHeading}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.headingAccent} />
              <View>
                <Text style={styles.sectionTitle}>What are you sending?</Text>
                <Text style={styles.sectionSubtitle}>Choose a category to get started</Text>
              </View>
            </View>
            <View style={styles.sparkleBadge}><Sparkles size={15} color={palette.orange} /></View>
          </View>
          <View style={styles.catGrid}>
            {CATEGORIES.map((c, i) => (
              <CategoryItem
                key={c.label}
                icon={c.icon}
                label={c.label}
                hint={c.hint}
                border={c.border}
                delay={200 + i * 40}
                onPress={() => router.push(`/(customer)/create-delivery?category=${c.label.toUpperCase()}`)}
              />
            ))}
          </View>
        </SlideUp>

        {/* Recent deliveries */}
        <SlideUp delay={240}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>Recent deliveries</Text>
            <TouchableOpacity onPress={() => router.push('/(customer)/deliveries')}>
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={{ gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height={76} borderRadius={18} />
              ))}
            </View>
          ) : (
            (data?.data?.slice(0, 3) || []).map((d: Record<string, unknown>, i: number) => (
              <DeliveryRow key={d._id as string} d={d} delay={260 + i * 50} router={router} />
            ))
          )}

          {!isLoading && (data?.data?.length ?? 0) === 0 && (
            <GlassSurface style={styles.emptyState} intensity={35}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyTitle}>No deliveries yet</Text>
              <Text style={styles.emptySub}>Your sent and received parcels will show up here</Text>
            </GlassSurface>
          )}
        </SlideUp>
      </ScrollView>
    </View>
  );
}

function HomeCardMarquee({ cards, onPress }: { cards: Array<{ title: string; subtitle: string; emoji: string; accent: string; actionCategory: string }>; onPress: (category: string) => void }) {
  const offset = useRef(new Animated.Value(0)).current;
  const cardWidth = 222;
  const gap = 12;
  const distance = (cardWidth + gap) * cards.length;

  useEffect(() => {
    offset.setValue(0);
    const loop = Animated.loop(Animated.timing(offset, { toValue: -distance, duration: Math.max(cards.length * 5200, 18000), easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [cards.length, distance, offset]);

  return (
    <View style={styles.marqueeSection}>
      <View style={styles.marqueeHeading}><Text style={styles.marqueeTitle}>A little something for you</Text><Text style={styles.marqueeLive}>SPOTLIGHT</Text></View>
      <View style={styles.marqueeViewport}>
        <Animated.View style={[styles.marqueeTrack, { transform: [{ translateX: offset }] }]}>
          {[...cards, ...cards].map((card, index) => (
            <TouchableOpacity key={`${card.title}-${index}`} activeOpacity={0.9} style={styles.marqueeCard} onPress={() => onPress(card.actionCategory)}>
              <View style={[styles.marqueeIcon, { backgroundColor: card.accent }]}><Text style={styles.marqueeEmoji}>{card.emoji}</Text></View>
              <View style={styles.marqueeCopy}><Text style={styles.marqueeCardTitle} numberOfLines={1}>{card.title}</Text><Text style={styles.marqueeCardSubtitle} numberOfLines={1}>{card.subtitle}</Text></View>
              <ArrowUpRight size={17} color={palette.orange} />
            </TouchableOpacity>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

function BannerCarousel({ banners, onPress }: { banners: Array<{ _id: string; title: string; subtitle: string; imageUrl: string; actionCategory: string }>; onPress: (category: string) => void }) {
  const [index, setIndex] = React.useState(0);
  const list = banners.length ? banners : [{ _id: 'fallback', title: 'Deliver more, worry less', subtitle: 'Fast local delivery at your fingertips', imageUrl: '', actionCategory: 'PARCEL' }];
  const origin = (process.env.EXPO_PUBLIC_API_URL || '').replace('/api/v1', '');
  const scrollRef = React.useRef<ScrollView>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setIndex(0);
    if (list.length < 2) return;
    timerRef.current = setInterval(() => setIndex((current) => {
      const next = (current + 1) % list.length;
      scrollRef.current?.scrollTo({ x: next * 360, animated: true });
      return next;
    }), 3000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [banners.length, list.length]);

  return (
    <View style={styles.bannerSection}>
      <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEnabled={list.length > 1} contentContainerStyle={styles.bannerTrack} onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / 360))}>
        {list.map((banner) => {
          const image = banner.imageUrl ? banner.imageUrl.replace('http://localhost:5000', origin) : '';
          return <TouchableOpacity key={banner._id} activeOpacity={0.92} onPress={() => onPress(banner.actionCategory)} style={styles.bannerCard}>
            {image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <LinearGradient colors={[palette.orange, palette.orangeDeep]} style={StyleSheet.absoluteFill} />}
            <View style={styles.bannerShade} />
            <View style={styles.bannerCopy}><Text style={styles.bannerEyebrow}>HYPERLOCAL DELIVERY</Text><Text style={styles.bannerTitle}>{banner.title}</Text>{banner.subtitle ? <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text> : null}</View>
            <View style={styles.bannerArrow}><ArrowUpRight size={18} color={palette.orangeDark} /></View>
          </TouchableOpacity>;
        })}
      </ScrollView>
      <View style={styles.bannerDots}>{list.map((banner, dotIndex) => <View key={`${banner._id}-dot`} style={[styles.bannerDot, dotIndex === index && styles.bannerDotActive]} />)}</View>
    </View>
  );
}

function shuffleCards<T>(cards: T[]) {
  return [...cards].sort(() => Math.random() - 0.5);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CategoryItem({
  icon,
  label,
  hint,
  border,
  delay,
  onPress,
}: {
  icon: string;
  label: string;
  hint: string;
  border: string;
  delay: number;
  onPress: () => void;
}) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.92);
  return (
    <SlideUp delay={delay} style={{ width: '48.3%' }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onPress={onPress}
        >
          <GlassSurface style={[styles.catItem, { borderColor: border, shadowColor: border }]} intensity={30}>
            <View style={styles.categoryTop}>
              <View style={[styles.categoryIcon, { borderColor: border }]}>
                <Text style={styles.categoryEmoji}>{icon}</Text>
              </View>
              <View style={styles.categoryArrow}><ArrowUpRight size={16} color={palette.orange} /></View>
            </View>
            <Text style={styles.catLabel}>{label}</Text>
            <Text style={styles.categoryHint}>{hint}</Text>
          </GlassSurface>
        </TouchableOpacity>
      </Animated.View>
    </SlideUp>
  );
}

function DeliveryRow({ d, delay, router }: { d: Record<string, unknown>; delay: number; router: any }) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.98);
  return (
    <SlideUp delay={delay}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onPress={() => router.push(`/(customer)/deliveries?id=${d._id}`)}
        >
          <GlassSurface style={styles.deliveryRow} intensity={30}>
            <View style={styles.deliveryInner}>
              <View style={styles.deliveryIconWrap}>
                <Package size={16} color={palette.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.trackId}>{d.trackingId as string}</Text>
                <Text style={styles.dropAddr} numberOfLines={1}>
                  {(d.drop as { address: string })?.address}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <StatusBadge status={d.status as string} />
                <Text style={styles.fare}>₹{(d.fare as { total: number })?.total}</Text>
              </View>
            </View>
          </GlassSurface>
        </TouchableOpacity>
      </Animated.View>
    </SlideUp>
  );
}

const getTimeOfDay = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },

  blobTopRight: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: palette.orangeTint,
  },
  blobLeft: {
    position: 'absolute',
    top: 260,
    left: -100,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: palette.orangeTint,
    opacity: 0.7,
  },

  // Leave room for the floating tab bar and the phone's navigation inset.
  content: { padding: spacing.base, paddingTop: spacing['4xl'], paddingBottom: 136 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { fontSize: 14, color: palette.inkSoft, fontWeight: '500' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  name: { fontSize: 24, fontWeight: '800', color: palette.ink, letterSpacing: -0.3 },
  wave: { fontSize: 20 },
  avatarBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: palette.orange,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  avatarLetter: { fontSize: 18, fontWeight: '700', color: '#fff' },

  // Glass base
  glassWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.glassBorder,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.glass,
  },
  glassContent: { padding: 16 },

  // CTA
  ctaShadowWrap: {
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: palette.shadow,
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  ctaCard: {
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ctaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPulseRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  ctaTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  ctaSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  ctaPlus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Active delivery card
  bannerSection: { marginBottom: 20 },
  bannerTrack: { gap: 12 },
  bannerCard: { width: 348, height: 178, borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-end', padding: 20, shadowColor: palette.orangeDark, shadowOpacity: 0.20, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  bannerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(22,12,7,0.25)' },
  bannerCopy: { zIndex: 1, maxWidth: '82%' },
  bannerEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2, color: 'rgba(255,255,255,0.78)', marginBottom: 7 },
  bannerTitle: { fontSize: 24, lineHeight: 29, fontWeight: '800', color: '#fff' },
  bannerSubtitle: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.86)', marginTop: 6 },
  bannerArrow: { position: 'absolute', right: 18, top: 18, width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  bannerDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 9 },
  bannerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E7D8D0' },
  bannerDotActive: { width: 20, backgroundColor: palette.orange },
  activeCard: { marginBottom: 20, borderColor: palette.line },
  activeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  activeHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDotWrap: { width: 8, height: 8, alignItems: 'center', justifyContent: 'center' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.orange },
  liveDotPulse: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: palette.orange },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeAddr: { flex: 1, fontSize: 13, color: palette.ink, fontWeight: '500' },
  marqueeSection: { marginBottom: 24 },
  marqueeHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  marqueeTitle: { fontSize: 13, fontWeight: '800', color: palette.ink },
  marqueeLive: { fontSize: 9, fontWeight: '800', color: palette.orange, letterSpacing: 1, backgroundColor: palette.orangeTint, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  marqueeViewport: { overflow: 'hidden', marginHorizontal: -spacing.base },
  marqueeTrack: { flexDirection: 'row', gap: 12, paddingHorizontal: spacing.base },
  marqueeCard: { width: 222, height: 78, borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(255,106,26,0.10)', shadowColor: '#3A2417', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  marqueeIcon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  marqueeEmoji: { fontSize: 26 },
  marqueeCopy: { flex: 1, marginLeft: 10, marginRight: 5 },
  marqueeCardTitle: { fontSize: 13, fontWeight: '800', color: palette.ink },
  marqueeCardSubtitle: { fontSize: 10, fontWeight: '600', color: palette.inkSoft, marginTop: 4 },
  trackingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  trackingId: { fontSize: 11, color: palette.inkFaint, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) },
  trackingDivider: { width: 3, height: 3, borderRadius: 2, backgroundColor: palette.inkFaint },
  trackingEta: { fontSize: 11, color: palette.inkFaint, fontWeight: '500' },

  // Sections
  categoryHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headingAccent: { width: 4, height: 36, borderRadius: 3, backgroundColor: palette.orange },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: palette.ink, letterSpacing: -0.2 },
  sectionSubtitle: { fontSize: 12, color: palette.inkSoft, marginTop: 3 },
  sparkleBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.orangeTint },

  // Categories
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginBottom: 28 },
  catItem: { minHeight: 142, alignItems: 'stretch', justifyContent: 'space-between', padding: 14, borderRadius: 20, borderWidth: 1.5, backgroundColor: '#FFFFFF', shadowOpacity: 0.10, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  categoryTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  categoryIcon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1.5 },
  categoryEmoji: { fontSize: 27 },
  catLabel: { fontSize: 15, fontWeight: '800', color: palette.ink, marginTop: 10 },
  categoryHint: { fontSize: 11, fontWeight: '600', color: palette.inkSoft, marginTop: 2 },
  categoryArrow: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: palette.orange },

  // Recent deliveries
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewAll: { fontSize: 13, color: palette.orange, fontWeight: '700' },
  deliveryRow: { marginBottom: 10, padding: 0 },
  deliveryInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  deliveryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: palette.orangeTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackId: { fontSize: 11, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }), color: palette.inkFaint },
  dropAddr: { fontSize: 13, fontWeight: '600', color: palette.ink, marginTop: 2 },
  fare: { fontSize: 12, fontWeight: '700', color: palette.orangeDeep },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 28 },
  emptyEmoji: { fontSize: 30, marginBottom: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: palette.ink },
  emptySub: { fontSize: 12, color: palette.inkSoft, marginTop: 4, textAlign: 'center' },
});
