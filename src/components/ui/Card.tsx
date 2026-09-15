import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { shadows } from '../../theme';
interface CardProps { children: React.ReactNode; style?: StyleProp<ViewStyle>; }
export const Card: React.FC<CardProps> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);
const styles = StyleSheet.create({
  card: { backgroundColor:'#fff', borderRadius:16, padding:16, ...shadows.md },
});
