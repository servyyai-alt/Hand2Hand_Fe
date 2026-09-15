import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
interface Props { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle>; }
export const SlideUp: React.FC<Props> = ({ children, delay = 0, style }) => {
  void delay;
  return <View style={style}>{children}</View>;
};
