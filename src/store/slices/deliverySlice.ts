import { createSlice, PayloadAction } from '@reduxjs/toolkit';
interface DeliveryDraft { pickup?:any; drop?:any; category?:string; description?:string; weight?:number; }
interface DeliveryState { activeDeliveryId:string|null; draft:DeliveryDraft; }
const deliverySlice = createSlice({ name:'delivery', initialState:{activeDeliveryId:null,draft:{}} as DeliveryState,
  reducers:{
    setActiveDelivery(state,a:PayloadAction<string|null>){state.activeDeliveryId=a.payload;},
    updateDraft(state,a:PayloadAction<Partial<DeliveryDraft>>){state.draft={...state.draft,...a.payload};},
    clearDraft(state){state.draft={};},
  } });
export const {setActiveDelivery,updateDraft,clearDraft}=deliverySlice.actions; export default deliverySlice.reducer;
