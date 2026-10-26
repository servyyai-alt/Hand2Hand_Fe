import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Extrapolation,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Package, ArrowRight, Plus } from 'lucide-react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const BRAND = {
  navy: '#00417E',
  orange: '#FB7800',
  orangeLight: '#FFF2E5',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textMuted: '#94A3B8',
  green: '#008736',
};

// ---------------------------------------------------------------------------
// 1. Reveal: Scroll-triggered section reveal (fade, slide up, scale in)
// ---------------------------------------------------------------------------
export interface RevealProps {
  scrollY: SharedValue<number>;
  immediate?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export const Reveal: React.FC<RevealProps> = ({ scrollY, immediate, style, children }) => {
  const windowHeight = Dimensions.get('window').height;
  const layoutY = useSharedValue(0);
  const isRevealed = useSharedValue(immediate ? 1 : 0);

  useEffect(() => {
    if (immediate) {
      isRevealed.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) });
    }
  }, [immediate]);

  useAnimatedReaction(
    () => scrollY.value,
    (currentScroll) => {
      if (isRevealed.value >= 1) return;
      if (immediate) {
        isRevealed.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) });
        return;
      }
      const triggerThreshold = layoutY.value - windowHeight * 0.92;
      if (layoutY.value > 0 && currentScroll >= triggerThreshold) {
        isRevealed.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
      }
    }
  );

  const animatedStyle = useAnimatedStyle(() => {
    const p = isRevealed.value;
    return {
      opacity: interpolate(p, [0, 1], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(p, [0, 1], [32, 0], Extrapolation.CLAMP) },
        { scale: interpolate(p, [0, 1], [0.95, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View
      onLayout={(e) => {
        const y = e.nativeEvent.layout.y;
        layoutY.value = y;
        // If element is already in the upper viewport on initial render
        if (!immediate && y > 0 && y < windowHeight * 0.85) {
          isRevealed.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
        }
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// 2. Parallax: Hero parallax (slower scroll, fades, stretches on pull-down)
// ---------------------------------------------------------------------------
export interface ParallaxProps {
  scrollY: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export const Parallax: React.FC<ParallaxProps> = ({ scrollY, style, children }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const y = scrollY.value;
    // Stretch on pull-down (y < 0)
    if (y < 0) {
      return {
        transform: [
          { translateY: y * 0.4 },
          { scale: interpolate(y, [-150, 0], [1.14, 1], Extrapolation.CLAMP) },
        ],
      };
    }
    // Slower move & subtle fade on scroll down (y > 0)
    return {
      opacity: interpolate(y, [0, 260], [1, 0.76], Extrapolation.CLAMP),
      transform: [
        { translateY: y * 0.32 },
        { scale: interpolate(y, [0, 260], [1, 0.96], Extrapolation.CLAMP) },
      ],
    };
  });

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};

// ---------------------------------------------------------------------------
// 3. FloatView: Floating decorative background elements
// ---------------------------------------------------------------------------
export interface FloatViewProps {
  style?: StyleProp<ViewStyle>;
  amp?: number;
  duration?: number;
  children?: React.ReactNode;
}

export const FloatView: React.FC<FloatViewProps> = ({ style, amp = 10, duration = 2400, children }) => {
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.value = withRepeat(
      withSequence(
        withTiming(-amp, { duration: duration / 2, easing: Easing.inOut(Easing.quad) }),
        withTiming(amp, { duration: duration / 2, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [amp, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};

// ---------------------------------------------------------------------------
// 4. WordReveal: Word-by-word headline reveal
// ---------------------------------------------------------------------------
export interface WordRevealProps {
  text: string;
  style?: StyleProp<TextStyle>;
}

const WordItem: React.FC<{ word: string; index: number; style?: StyleProp<TextStyle> }> = ({
  word,
  index,
  style,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      100 + index * 80,
      withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [14, 0], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Animated.Text style={[style, animatedStyle, { marginRight: 6 }]}>
      {word}
    </Animated.Text>
  );
};

export const WordReveal: React.FC<WordRevealProps> = ({ text, style }) => {
  const words = text.split(' ');
  return (
    <View style={styles.wordRevealWrap}>
      {words.map((w, idx) => (
        <WordItem key={`${w}-${idx}`} word={w} index={idx} style={style} />
      ))}
    </View>
  );
};

// ---------------------------------------------------------------------------
// 5. RouteTrack: Looping "package travels from pickup to drop-off" strip
// ---------------------------------------------------------------------------
export const RouteTrack: React.FC = () => {
  const [trackWidth, setTrackWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.quad) }),
      -1,
      false
    );
  }, []);

  const packageAnimStyle = useAnimatedStyle(() => {
    const maxMove = Math.max(trackWidth - 30, 0);
    return {
      transform: [
        { translateX: interpolate(progress.value, [0, 1], [0, maxMove], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <View
      style={styles.routeTrackWrap}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      {/* Background Track Line */}
      <View style={styles.trackLine}>
        <View style={styles.dashedTrack} />
      </View>

      {/* Pickup Node */}
      <View style={styles.nodeLeft}>
        <View style={styles.nodeDotPickup} />
        <Text style={styles.nodeLabel}>Pickup</Text>
      </View>

      {/* Moving Package Icon */}
      {trackWidth > 0 && (
        <Animated.View style={[styles.movingPackagePill, packageAnimStyle]}>
          <Package size={13} color="#FFFFFF" />
        </Animated.View>
      )}

      {/* Drop-off Node */}
      <View style={styles.nodeRight}>
        <View style={styles.nodeDotDrop} />
        <Text style={styles.nodeLabel}>Handover</Text>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// 6. Press: Spring press-scale on buttons and cards (+ optional entrance stagger)
// ---------------------------------------------------------------------------
export interface PressProps {
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  children: React.ReactNode;
  i?: number;
}

export const Press: React.FC<PressProps> = ({ style, onPress, children, i }) => {
  const scale = useSharedValue(1);
  const entrance = useSharedValue(i !== undefined ? 0 : 1);

  useEffect(() => {
    if (i !== undefined) {
      entrance.value = withDelay(
        i * 65,
        withSpring(1, { damping: 14, stiffness: 120 })
      );
    }
  }, [i]);

  const animatedStyle = useAnimatedStyle(() => {
    const s = scale.value;
    const e = entrance.value;
    return {
      opacity: i !== undefined ? e : 1,
      transform: [
        { scale: s * (i !== undefined ? interpolate(e, [0, 1], [0.84, 1], Extrapolation.CLAMP) : 1) },
      ],
    };
  });

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
};

// ---------------------------------------------------------------------------
// 7. Item: Staggered card entrances (dx / dy offset + fade + scale)
// ---------------------------------------------------------------------------
export interface ItemProps {
  i?: number;
  dx?: number;
  dy?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export const Item: React.FC<ItemProps> = ({ i = 0, dx = 0, dy = 20, style, children }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      i * 85,
      withSpring(1, { damping: 16, stiffness: 110 })
    );
  }, [i]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 1], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(p, [0, 1], [dx, 0], Extrapolation.CLAMP) },
        { translateY: interpolate(p, [0, 1], [dy, 0], Extrapolation.CLAMP) },
        { scale: interpolate(p, [0, 1], [0.94, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};

// ---------------------------------------------------------------------------
// 8. MiniBar: Compact brand bar fading in after scrolling past header
// ---------------------------------------------------------------------------
export interface MiniBarProps {
  scrollY: SharedValue<number>;
  top: number;
}

export const MiniBar: React.FC<MiniBarProps> = ({ scrollY, top }) => {
  const router = useRouter();

  const animatedStyle = useAnimatedStyle(() => {
    const y = scrollY.value;
    const opacity = interpolate(y, [95, 145], [0, 1], Extrapolation.CLAMP);
    const translateY = interpolate(y, [95, 145], [-16, 0], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.miniBarContainer,
        { paddingTop: Math.max(top, 12) + 6 },
        animatedStyle,
      ]}
    >
      <View style={styles.miniBarContent}>
        {/* Left: Mini H2H Monogram & Title */}
        <View style={styles.miniBarBrand}>
          <Image
            source={require('../../../assets/images/logo.png')}
            style={styles.miniBarLogo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.miniBarTitle}>Hand2Hand</Text>
            <Text style={styles.miniBarSub}>Direct P2P Delivery</Text>
          </View>
        </View>

        {/* Right: Quick "Send" CTA shortcut */}
        <Pressable
          style={styles.miniBarSendBtn}
          onPress={() => router.push('/(customer)/create-delivery')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Plus size={14} color="#FFFFFF" />
          <Text style={styles.miniBarSendText}>Send</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  wordRevealWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },

  // RouteTrack
  routeTrackWrap: {
    height: 38,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginVertical: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  trackLine: {
    position: 'absolute',
    left: 24,
    right: 24,
    height: 2,
    justifyContent: 'center',
  },
  dashedTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 1,
  },
  nodeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 1,
  },
  nodeDotPickup: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8CFA94',
  },
  nodeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 1,
  },
  nodeDotDrop: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.orange,
  },
  nodeLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '600',
  },
  movingPackagePill: {
    position: 'absolute',
    left: 12,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: BRAND.orange,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: BRAND.orange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },

  // MiniBar
  miniBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    paddingHorizontal: 16,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  miniBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniBarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniBarLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  miniBarTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: BRAND.textPrimary,
  },
  miniBarSub: {
    fontSize: 10,
    color: BRAND.textMuted,
  },
  miniBarSendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND.orange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: BRAND.orange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  miniBarSendText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
