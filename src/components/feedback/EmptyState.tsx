import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';
interface Props { title: string; message: string; action?: React.ReactNode; }
export const EmptyState: React.FC<Props> = ({ title, message, action }) => (
  <View style={styles.container}>
    <View style={styles.icon}><Text style={{ fontSize:32 }}>📦</Text></View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.message}>{message}</Text>
    {action && <View style={{ marginTop:16 }}>{action}</View>}
  </View>
);
const styles = StyleSheet.create({
  container: { flex:1, alignItems:'center', justifyContent:'center', padding:32 },
  icon:      { width:72, height:72, borderRadius:36, backgroundColor:colors.brand[50], alignItems:'center', justifyContent:'center', marginBottom:16 },
  title:     { fontSize:17, fontWeight:'600', color:'#111827', textAlign:'center' },
  message:   { fontSize:14, color:'#6b7280', textAlign:'center', marginTop:6, lineHeight:20 },
});
