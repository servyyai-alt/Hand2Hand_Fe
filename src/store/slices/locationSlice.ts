import { createSlice, PayloadAction } from '@reduxjs/toolkit';
const locationSlice = createSlice({ name:'location', initialState:{coords:null as {lat:number;lng:number}|null, permission:'undetermined' as 'granted'|'denied'|'undetermined'},
  reducers:{ setCoords(state,a:PayloadAction<{lat:number;lng:number}>){state.coords=a.payload;}, setPermission(state,a:PayloadAction<'granted'|'denied'|'undetermined'>){state.permission=a.payload;} } });
export const {setCoords,setPermission}=locationSlice.actions; export default locationSlice.reducer;
