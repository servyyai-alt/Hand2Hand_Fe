import { createSlice, PayloadAction } from '@reduxjs/toolkit';
const partnerSlice = createSlice({ name:'partner', initialState:{isOnline:false,currentDeliveryId:null as string|null,deliveryStep:null as string|null},
  reducers:{
    setOnlineStatus(state,a:PayloadAction<boolean>){state.isOnline=a.payload;},
    setCurrentDelivery(state,a:PayloadAction<string|null>){state.currentDeliveryId=a.payload;},
    setDeliveryStep(state,a:PayloadAction<string|null>){state.deliveryStep=a.payload;},
  } });
export const {setOnlineStatus,setCurrentDelivery,setDeliveryStep}=partnerSlice.actions; export default partnerSlice.reducer;
