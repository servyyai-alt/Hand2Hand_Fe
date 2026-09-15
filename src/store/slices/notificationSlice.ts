import { createSlice, PayloadAction } from '@reduxjs/toolkit';
const notificationSlice = createSlice({ name:'notification', initialState:{unreadCount:0,fcmToken:null as string|null},
  reducers:{setUnreadCount(state,a:PayloadAction<number>){state.unreadCount=a.payload;}, setFcmToken(state,a:PayloadAction<string>){state.fcmToken=a.payload;}} });
export const {setUnreadCount,setFcmToken}=notificationSlice.actions; export default notificationSlice.reducer;
