import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Package, DollarSign, Bell, User } from 'lucide-react-native';
import { colors } from '../../src/theme';
import { useAppSelector } from '../../src/hooks/useAppSelector';
import { Redirect } from 'expo-router';

export default function PartnerLayout() {
  const { user, isLoading } = useAppSelector(s => s.auth);
  if (!isLoading && user?.role !== 'DELIVERY_PARTNER') return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand[600],
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { borderTopWidth:1, borderTopColor:'#f3f4f6', paddingBottom:4, height:58 },
        tabBarLabelStyle: { fontSize:11, fontWeight:'600' },
      }}
    >
      <Tabs.Screen name="index"          options={{ title:'Dashboard', tabBarIcon:({color})=><Home       size={22} color={color}/> }} />
      <Tabs.Screen name="requests"       options={{ title:'Requests',  tabBarIcon:({color})=><Package    size={22} color={color}/> }} />
      <Tabs.Screen name="earnings"       options={{ title:'Earnings',  tabBarIcon:({color})=><DollarSign size={22} color={color}/> }} />
      <Tabs.Screen name="notifications"  options={{ title:'Alerts',    tabBarIcon:({color})=><Bell       size={22} color={color}/> }} />
      <Tabs.Screen name="profile"        options={{ title:'Profile',   tabBarIcon:({color})=><User       size={22} color={color}/> }} />
      <Tabs.Screen name="active-delivery" options={{ href:null }} />
      <Tabs.Screen name="wallet"         options={{ href:null }} />
    </Tabs>
  );
}
