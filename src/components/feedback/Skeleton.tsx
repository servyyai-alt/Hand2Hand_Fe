import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
interface SkeletonProps { width?: number | string; height?: number; borderRadius?: number; style?: StyleProp<ViewStyle>; }
export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = 16, borderRadius = 8, style: customStyle }) => {
  const opacity = useSharedValue(1);
  useEffect(() => { opacity.value = withRepeat(withTiming(0.4, { duration:900, easing:Easing.ease }), -1, true); }, []);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ width: width as any, height, borderRadius, backgroundColor:'#e5e7eb' }, customStyle, animatedStyle]} />;
};
