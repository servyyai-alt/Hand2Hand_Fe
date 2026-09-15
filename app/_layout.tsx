import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { store } from '../src/store';
import { setCredentials, setLoading } from '../src/store/slices/authSlice';
import { storageService } from '../src/services/storage.service';
import { apiClient } from '../src/services/api.service';
import { useAppSelector } from '../src/hooks/useAppSelector';
import Toast from 'react-native-toast-message';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry:1, staleTime:30_000 } },
});

// Keep native render errors visible in Expo Go instead of leaving the app on a blank screen.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={errorStyles.container}>
      <Text style={errorStyles.title}>Something went wrong</Text>
      <Text style={errorStyles.message}>{error.message || 'Please try again.'}</Text>
      <Pressable style={errorStyles.button} onPress={retry}>
        <Text style={errorStyles.buttonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

function RootNavigator() {
  const router      = useRouter();
  const segments    = useSegments();
  const auth        = useAppSelector(s => s.auth);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [accessToken, refreshToken, user] = await Promise.all([
          storageService.getAccessToken(),
          storageService.getRefreshToken(),
          storageService.getUser(),
        ]);

        if (accessToken && user) {
          // Validate token with backend
          const res = await apiClient.get('/auth/me');
          const freshUser = res.data.data;
          store.dispatch(setCredentials({
            user: freshUser,
            accessToken,
            refreshToken: refreshToken || '',
          }));
        } else {
          store.dispatch(setLoading(false));
        }
      } catch {
        await storageService.clearAll();
        store.dispatch(setLoading(false));
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (auth.isLoading) return;
    const inAuth = segments[0] === '(auth)';

    if (!auth.isAuthenticated) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    const { role } = auth.user!;
    if (role === 'CUSTOMER' && segments[0] !== '(customer)') {
      router.replace('/(customer)');
    } else if (role === 'DELIVERY_PARTNER' && segments[0] !== '(partner)') {
      router.replace('/(partner)');
    } else if (['ADMIN','SUPER_ADMIN'].includes(role)) {
      // Admin uses web — redirect gracefully
      router.replace('/(auth)/login');
    }
  }, [auth.isAuthenticated, auth.isLoading, auth.user?.role]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex:1 }}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <RootNavigator />
          <Toast />
        </QueryClientProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

const errorStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 10 },
  message: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 22 },
  button: { backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 13 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});