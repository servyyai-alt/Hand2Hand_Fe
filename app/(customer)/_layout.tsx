import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs, Redirect, usePathname, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Home, Package, Plus, User } from 'lucide-react-native';
import { useAppSelector } from '../../src/hooks/useAppSelector';

const palette = {
  orange: '#FF6A1A',
  orangeDark: '#E8540A',
  orangeSoft: '#FFB36B',
  ink: '#211914',
  muted: '#A89E96',
  glass: 'rgba(255,255,255,0.88)',
  border: 'rgba(255,255,255,0.98)',
};

const tabs = [
  { name: 'index', label: 'Home', Icon: Home },
  { name: 'deliveries', label: 'Orders', Icon: Package },
  { name: 'notifications', label: 'Alerts', Icon: Bell },
  { name: 'profile', label: 'Profile', Icon: User },
];

export default function CustomerLayout() {
  const { user, isLoading } = useAppSelector((s) => s.auth);
  if (!isLoading && user?.role !== 'CUSTOMER') return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="deliveries" options={{ title: 'Orders' }} />
      <Tabs.Screen name="create-delivery" options={{ title: 'Send' }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="addresses" options={{ href: null }} />
      <Tabs.Screen name="tracking" options={{ href: null }} />
      <Tabs.Screen name="payments" options={{ href: null }} />
    </Tabs>
  );
}

function FloatingTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const isCurrent = (name: string) => {
    if (name === 'index') return pathname === '/' || pathname === '';
    return pathname.endsWith(`/${name}`) || pathname.includes(`/${name}/`);
  };
  const createFocused = isCurrent('create-delivery');

  const navigate = (name: string) => {
    const paths: Record<string, string> = {
      index: '/(customer)',
      deliveries: '/(customer)/deliveries',
      notifications: '/(customer)/notifications',
      profile: '/(customer)/profile',
      'create-delivery': '/(customer)/create-delivery',
    };
    const path = paths[name];
    if (path) {
      router.replace(path as never);
      return;
    }

    // Keep a navigation fallback for any future tab added to this layout.
    const route = state.routes.find((item: any) => item.name === name);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented && state.index !== state.routes.indexOf(route)) {
      navigation.navigate(name);
    }
  };

  return (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={styles.capsule}>
        <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.capsuleTint} pointerEvents="none" />
        <View style={styles.tabRow}>
          <TabButton tab={tabs[0]} focused={isCurrent(tabs[0].name)} onPress={() => navigate(tabs[0].name)} />
          <TabButton tab={tabs[1]} focused={isCurrent(tabs[1].name)} onPress={() => navigate(tabs[1].name)} />
          <View style={styles.centerSpace} />
          <TabButton tab={tabs[2]} focused={isCurrent(tabs[2].name)} onPress={() => navigate(tabs[2].name)} />
          <TabButton tab={tabs[3]} focused={isCurrent(tabs[3].name)} onPress={() => navigate(tabs[3].name)} />
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Send a parcel" onPress={() => navigate('create-delivery')} style={styles.sendButtonWrap}>
        <LinearGradient colors={[palette.orangeSoft, palette.orange, palette.orangeDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sendButton}>
          <Plus size={27} color="#fff" strokeWidth={2.8} />
        </LinearGradient>
        <Text style={[styles.sendLabel, createFocused && styles.sendLabelActive]}>{createFocused ? 'Creating' : 'Send'}</Text>
      </Pressable>
    </View>
  );
}

function TabButton({ tab, focused, onPress }: { tab: typeof tabs[number]; focused: boolean; onPress: () => void }) {
  const Icon = tab.Icon;
  return (
    <Pressable onPress={onPress} style={styles.tabButton} accessibilityRole="tab" accessibilityState={{ selected: focused }}>
      <View style={[styles.iconSlot, focused && styles.iconSlotActive]}>
        <Icon size={21} color={focused ? palette.orange : palette.muted} strokeWidth={focused ? 2.5 : 2} />
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{tab.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingTop: 20 },
  capsule: {
    width: '92%', maxWidth: 520, height: 70, borderRadius: 26, overflow: 'hidden',
    borderWidth: 1, borderColor: palette.border, backgroundColor: palette.glass,
    shadowColor: '#3A2417', shadowOpacity: 0.16, shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  capsuleTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.52)' },
  tabRow: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7 },
  centerSpace: { width: 72 },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 64, gap: 2 },
  iconSlot: { width: 34, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  iconSlotActive: { backgroundColor: 'rgba(255,106,26,0.12)' },
  tabLabel: { fontSize: 10, fontWeight: '600', color: palette.muted },
  tabLabelActive: { color: palette.orange, fontWeight: '800' },
  sendButtonWrap: { position: 'absolute', top: 0, alignItems: 'center' },
  sendButton: {
    width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: '#fff', shadowColor: palette.orangeDark,
    shadowOpacity: 0.35, shadowRadius: 13, shadowOffset: { width: 0, height: 7 }, elevation: 14,
  },
  sendLabel: { marginTop: 3, fontSize: 10, fontWeight: '800', color: palette.orangeDark },
  sendLabelActive: { color: palette.ink },
});
