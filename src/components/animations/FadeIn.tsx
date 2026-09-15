import React from 'react';
import { View } from 'react-native';
interface Props { children: React.ReactNode; duration?: number; delay?: number; }
export const FadeIn: React.FC<Props> = ({ children, duration = 300, delay = 0 }) => {
  void duration; void delay;
  return <View>{children}</View>;
};
