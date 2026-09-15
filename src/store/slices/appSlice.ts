import { createSlice, PayloadAction } from '@reduxjs/toolkit';
const appSlice = createSlice({ name:'app', initialState:{isNetworkOnline:true,cityId:'VLR'},
  reducers:{setNetworkStatus(state,a:PayloadAction<boolean>){state.isNetworkOnline=a.payload;}} });
export const {setNetworkStatus}=appSlice.actions; export default appSlice.reducer;
