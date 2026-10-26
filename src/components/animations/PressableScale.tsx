import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
interface Props { children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; scale?: number; disabled?: boolean; }
export const PressableScale: React.FC<Props> = ({ children, onPress, style, scale = 0.96, disabled }) => {
  void scale;
  return <Pressable onPress={onPress} style={style} disabled={disabled}>{children}</Pressable>;
};
