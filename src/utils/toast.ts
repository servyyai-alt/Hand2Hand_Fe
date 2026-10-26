import Toast from 'react-native-toast-message';

export function showToast(type: 'success' | 'error' | 'info', title: string, message?: string) {
  Toast.show({ type, text1: title, text2: message, visibilityTime: 3500 });
}

export function getApiError(error: unknown, fallback = 'Please try again.') {
  const e = error as {
    response?: {
      data?: {
        error?: {
          message?: string;
          details?: Array<{ message?: string; path?: string[] }> | any;
        };
        message?: string;
      };
    };
    code?: string;
    message?: string;
  };

  const errData = e?.response?.data?.error;
  if (errData?.details && Array.isArray(errData.details) && errData.details.length > 0) {
    const detailsMsgs = errData.details
      .map((d: any) => d.message)
      .filter(Boolean);
    if (detailsMsgs.length > 0) {
      return detailsMsgs.join('. ');
    }
  }

  if (errData?.message && errData.message !== 'Invalid input') {
    return errData.message;
  }
  if (e?.response?.data?.message) {
    return e.response.data.message;
  }
  if (errData?.message) {
    return errData.message;
  }
  if (e?.code === 'ERR_NETWORK' || e?.message === 'Network Error') {
    return 'Unable to connect to backend server. Please verify the backend is running on port 5000.';
  }
  return e?.message || fallback;
}
