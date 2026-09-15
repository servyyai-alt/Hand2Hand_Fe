import React from 'react';
import { Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { PressableScale } from '../animations/PressableScale';
import { colors, radius, typography } from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string; onPress?: () => void; variant?: Variant;
  loading?: boolean; disabled?: boolean; fullWidth?: boolean; icon?: React.ReactNode;
}

const styles = StyleSheet.create({
  base:      { flexDirection:'row', alignItems:'center', justifyContent:'center', paddingVertical:14, paddingHorizontal:20, borderRadius:radius.lg },
  primary:   { backgroundColor: colors.brand[600] },
  secondary: { backgroundColor: '#fff', borderWidth:1, borderColor: colors.neutral[200] },
  ghost:     { backgroundColor: 'transparent' },
  danger:    { backgroundColor: '#dc2626' },
  label:     { fontSize:typography.size.md, fontWeight:typography.weight.semibold as any },
  labelPrimary:   { color: '#fff' },
  labelSecondary: { color: colors.neutral[700] },
  labelGhost:     { color: colors.brand[600] },
  labelDanger:    { color: '#fff' },
  disabled:  { opacity: 0.5 },
  fullWidth: { width: '100%' },
});

export const Button: React.FC<ButtonProps> = ({
  label, onPress, variant = 'primary', loading, disabled, fullWidth, icon
}) => (
  <PressableScale
    onPress={!disabled && !loading ? onPress : undefined}
    style={[styles.base, styles[variant], disabled && styles.disabled, fullWidth && styles.fullWidth]}
  >
    {loading ? (
      <ActivityIndicator size="small" color={variant === 'secondary' ? colors.brand[600] : '#fff'} />
    ) : (
      <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
        {icon}
        <Text style={[styles.label, styles[`label${variant.charAt(0).toUpperCase() + variant.slice(1)}` as keyof typeof styles] as any]}>{label}</Text>
      </View>
    )}
  </PressableScale>
);
