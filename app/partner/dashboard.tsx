import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSelector } from '../../src/hooks/useAppSelector';
import { showToast } from '../../src/utils/toast';

export default function PartnerDashboardRedirect() {
  const router = useRouter();
  const { user, isLoading } = useAppSelector(s => s.auth);

  useEffect(() => {
    if (isLoading) return;

    if (!user || user.role !== 'DELIVERY_PARTNER') {
      router.replace('/(auth)/partner-login');
      return;
    }

    const isApproved =
      user.adminApprovalStatus === 'APPROVED' &&
      user.superAdminApprovalStatus === 'APPROVED' &&
      user.accountStatus === 'ACTIVE' &&
      Boolean(user.canWork);

    if (!isApproved) {
      showToast('error', 'Access Denied', 'Your Delivery Partner application is still under verification.');
      router.replace('/(partner)/application-status' as never);
    } else {
      router.replace('/(partner)');
    }
  }, [user, isLoading]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
      <ActivityIndicator size="large" color="#ea580c" />
    </View>
  );
}
