import Toast from 'react-native-toast-message';

export function showToast(type: 'success' | 'error' | 'info', title: string, message?: string) {
  Toast.show({ type, text1: title, text2: message, visibilityTime: 3500 });
}

export function getApiError(error: unknown, fallback = 'Please try again.') {
  const e = error as { response?: { data?: { error?: { message?: string } } } };
  return e.response?.data?.error?.message || fallback;
}
