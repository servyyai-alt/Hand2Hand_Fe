import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../src/theme';
export default function TrackingScreen() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>Live Tracking</Text>
      <Text style={styles.s}>Real-time map tracking coming in Phase 9.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex:1, alignItems:'center', justifyContent:'center', padding:32, backgroundColor:'#f9fafb' },
  t: { fontSize:18, fontWeight:'700', color:colors.neutral[900], textAlign:'center' },
  s: { fontSize:13, color:colors.neutral[400], textAlign:'center', marginTop:8 },
});
