import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAppSelector } from '../../src/hooks/useAppSelector';

export default function AdminLayout() {
  const { user, isLoading, isAuthenticated } = useAppSelector((s) => s.auth);

  if (isLoading) return null;

  if (!isAuthenticated || !['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '')) {
    return <Redirect href="/(auth)/admin-login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
