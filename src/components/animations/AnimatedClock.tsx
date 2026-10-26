import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';

interface AnimatedClockProps {
  size?: number;
  primaryColor?: string;
  secondColor?: string;
  backgroundColor?: string;
  borderColor?: string;
}

export const AnimatedClock: React.FC<AnimatedClockProps> = ({
  size = 68,
  primaryColor = '#ea580c',
  secondColor = '#f97316',
  backgroundColor = '#fff7ed',
  borderColor = '#fed7aa',
}) => {
  const hourAnim = useRef(new Animated.Value(0)).current;
  const minuteAnim = useRef(new Animated.Value(0)).current;
  const secondAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Web: inject CSS keyframes for 100% hardware-accelerated fluid 60fps rotation
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'h2h-clock-animations';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @keyframes h2hClockSecondTick {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes h2hClockMinuteTick {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes h2hClockHourTick {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes h2hClockPulseRing {
            0% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(1.1); opacity: 0.25; }
            100% { transform: scale(1); opacity: 0.7; }
          }
        `;
        document.head.appendChild(style);
      }
    }

    // Native Mobile (iOS / Android) animated loops:
    const isNative = Platform.OS !== 'web';
    const secondLoop = Animated.loop(
      Animated.timing(secondAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: isNative,
      })
    );

    const minuteLoop = Animated.loop(
      Animated.timing(minuteAnim, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: isNative,
      })
    );

    const hourLoop = Animated.loop(
      Animated.timing(hourAnim, {
        toValue: 1,
        duration: 48000,
        easing: Easing.linear,
        useNativeDriver: isNative,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: isNative,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: isNative,
        }),
      ])
    );

    secondLoop.start();
    minuteLoop.start();
    hourLoop.start();
    pulseLoop.start();

    return () => {
      secondLoop.stop();
      minuteLoop.stop();
      hourLoop.stop();
      pulseLoop.stop();
    };
  }, [hourAnim, minuteAnim, secondAnim, pulseAnim]);

  const secondRotate = secondAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const minuteRotate = minuteAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const hourRotate = hourAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const center = size / 2;
  const hourHandLength = size * 0.23;
  const hourHandWidth = 3.5;

  const minuteHandLength = size * 0.33;
  const minuteHandWidth = 2.4;

  const secondHandLength = size * 0.38;
  const secondHandTail = size * 0.1;
  const secondHandWidth = 1.5;

  const pinSize = Math.max(6, Math.round(size * 0.1));

  const isWeb = Platform.OS === 'web';

  return (
    <View style={[styles.outerContainer, { width: size + 16, height: size + 16 }]}>
      {/* Outer breathing aura */}
      <Animated.View
        style={[
          styles.breathingGlow,
          {
            width: size + 12,
            height: size + 12,
            borderRadius: (size + 12) / 2,
            backgroundColor: `${primaryColor}15`,
            ...(isWeb
              ? ({
                  animation: 'h2hClockPulseRing 2.8s ease-in-out infinite',
                  transformOrigin: 'center center',
                } as any)
              : {
                  transform: [{ scale: pulseAnim }],
                }),
          },
        ]}
      />

      {/* Clock Face Dial */}
      <View
        style={[
          styles.clockFace,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor,
            borderColor,
          },
        ]}
      >
        {/* 12 o'clock mark */}
        <View
          style={[
            styles.tickMark,
            {
              top: 3,
              left: center - 1.5,
              width: 3,
              height: 5,
              backgroundColor: primaryColor,
            },
          ]}
        />
        {/* 6 o'clock mark */}
        <View
          style={[
            styles.tickMark,
            {
              bottom: 3,
              left: center - 1.5,
              width: 3,
              height: 5,
              backgroundColor: primaryColor,
            },
          ]}
        />
        {/* 3 o'clock mark */}
        <View
          style={[
            styles.tickMark,
            {
              right: 3,
              top: center - 1.5,
              width: 5,
              height: 3,
              backgroundColor: primaryColor,
            },
          ]}
        />
        {/* 9 o'clock mark */}
        <View
          style={[
            styles.tickMark,
            {
              left: 3,
              top: center - 1.5,
              width: 5,
              height: 3,
              backgroundColor: primaryColor,
            },
          ]}
        />

        {/* 1. Hour Hand Stick */}
        <Animated.View
          style={[
            styles.handContainer,
            {
              width: size,
              height: size,
              ...(isWeb
                ? ({
                    animation: 'h2hClockHourTick 48s linear infinite',
                    transformOrigin: 'center center',
                  } as any)
                : {
                    transform: [{ rotate: hourRotate }],
                  }),
            },
          ]}
        >
          <View
            style={{
              position: 'absolute',
              top: center - hourHandLength,
              left: center - hourHandWidth / 2,
              width: hourHandWidth,
              height: hourHandLength,
              backgroundColor: '#9a3412',
              borderRadius: hourHandWidth / 2,
            }}
          />
        </Animated.View>

        {/* 2. Minute Hand Stick */}
        <Animated.View
          style={[
            styles.handContainer,
            {
              width: size,
              height: size,
              ...(isWeb
                ? ({
                    animation: 'h2hClockMinuteTick 12s linear infinite',
                    transformOrigin: 'center center',
                  } as any)
                : {
                    transform: [{ rotate: minuteRotate }],
                  }),
            },
          ]}
        >
          <View
            style={{
              position: 'absolute',
              top: center - minuteHandLength,
              left: center - minuteHandWidth / 2,
              width: minuteHandWidth,
              height: minuteHandLength,
              backgroundColor: primaryColor,
              borderRadius: minuteHandWidth / 2,
            }}
          />
        </Animated.View>

        {/* 3. Second Hand Stick (Fast & Lively with counter-balance tail) */}
        <Animated.View
          style={[
            styles.handContainer,
            {
              width: size,
              height: size,
              ...(isWeb
                ? ({
                    animation: 'h2hClockSecondTick 3s linear infinite',
                    transformOrigin: 'center center',
                  } as any)
                : {
                    transform: [{ rotate: secondRotate }],
                  }),
            },
          ]}
        >
          <View
            style={{
              position: 'absolute',
              top: center - secondHandLength,
              left: center - secondHandWidth / 2,
              width: secondHandWidth,
              height: secondHandLength + secondHandTail,
              backgroundColor: secondColor,
              borderRadius: secondHandWidth / 2,
            }}
          />
        </Animated.View>

        {/* 4. Center Cap / Pivot Pin */}
        <View
          style={[
            styles.centerPin,
            {
              top: center - pinSize / 2,
              left: center - pinSize / 2,
              width: pinSize,
              height: pinSize,
              borderRadius: pinSize / 2,
              backgroundColor: primaryColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  breathingGlow: {
    position: 'absolute',
  },
  clockFace: {
    borderWidth: 2.5,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  tickMark: {
    position: 'absolute',
    borderRadius: 1,
  },
  handContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPin: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
});
