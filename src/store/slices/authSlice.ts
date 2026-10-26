import { createSlice, PayloadAction } from '@reduxjs/toolkit';
export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  role: 'CUSTOMER' | 'DELIVERY_PARTNER' | 'ADMIN' | 'SUPER_ADMIN';
  status?: string;
  adminApprovalStatus?: string;
  superAdminApprovalStatus?: string;
  approvalStatus?: string;
  accountStatus?: string;
  isActive?: boolean;
  canWork?: boolean;
  canAcceptDeliveries?: boolean;
  rejectionReason?: string;
  rejectedBy?: string;
  partnerId?: string;
  applicationRef?: string;
}
interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isGuest: boolean;
}
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
    isGuest: false,
  } as AuthState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: AuthUser; accessToken: string; refreshToken: string }>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.isGuest = false;
    },
    updateUser(state, action: PayloadAction<Partial<AuthUser>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setLoading(state, action: PayloadAction<boolean>) { state.isLoading = action.payload; },
    updateAccessToken(state, action: PayloadAction<string>) { state.accessToken = action.payload; },
    setGuestMode(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isGuest = true;
      state.isLoading = false;
    },
    clearGuestMode(state) {
      state.isGuest = false;
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isGuest = false;
      state.isLoading = false;
    },
  },
});
export const {
  setCredentials,
  updateUser,
  logout,
  setLoading,
  updateAccessToken,
  setGuestMode,
  clearGuestMode,
} = authSlice.actions;
export default authSlice.reducer;
