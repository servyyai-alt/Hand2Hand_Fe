import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const statusMap: Record<string, { label: string; bg: string; text: string }> = {
  CREATED:            { label:'Created',            bg:'#f3f4f6', text:'#374151' },
  SEARCHING_PARTNER:  { label:'Finding Partner',    bg:'#fef9c3', text:'#a16207' },
  PARTNER_ASSIGNED:   { label:'Partner Assigned',   bg:'#dbeafe', text:'#1d4ed8' },
  PARTNER_ARRIVING:   { label:'Partner Arriving',   bg:'#ede9fe', text:'#6d28d9' },
  ARRIVED_AT_PICKUP:  { label:'At Pickup',          bg:'#ede9fe', text:'#6d28d9' },
  PICKED_UP:          { label:'Picked Up',          bg:'#fed7aa', text:'#c2410c' },
  IN_TRANSIT:         { label:'In Transit',         bg:'#ddd6fe', text:'#5b21b6' },
  ARRIVED_AT_DROP:    { label:'At Drop',            bg:'#dcfce7', text:'#166534' },
  DELIVERED:          { label:'Delivered',          bg:'#dcfce7', text:'#166534' },
  CANCELLED:          { label:'Cancelled',          bg:'#fee2e2', text:'#991b1b' },
  FAILED:             { label:'Failed',             bg:'#fee2e2', text:'#991b1b' },
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = statusMap[status] ?? { label: status, bg: '#f3f4f6', text: '#374151' };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.label, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { paddingHorizontal:10, paddingVertical:4, borderRadius:20 },
  label: { fontSize:11, fontWeight:'600' },
});
