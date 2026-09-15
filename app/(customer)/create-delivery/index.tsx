import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../src/theme';
export default function CreateDeliveryScreen() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>Create Delivery</Text>
      <Text style={styles.s}>Multi-step delivery creation coming in Phase 7.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex:1, alignItems:'center', justifyContent:'center', padding:32, backgroundColor:'#f9fafb' },
  t: { fontSize:18, fontWeight:'700', color:colors.neutral[900], textAlign:'center' },
  s: { fontSize:13, color:colors.neutral[400], textAlign:'center', marginTop:8 },
});
