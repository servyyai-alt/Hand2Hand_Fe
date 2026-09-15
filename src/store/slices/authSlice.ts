import { createSlice, PayloadAction } from '@reduxjs/toolkit';
export interface AuthUser { id:string; name:string; phone:string; role:'CUSTOMER'|'DELIVERY_PARTNER'|'ADMIN'|'SUPER_ADMIN'; }
interface AuthState { user:AuthUser|null; accessToken:string|null; refreshToken:string|null; isAuthenticated:boolean; isLoading:boolean; }
const authSlice = createSlice({
  name:'auth', initialState:{user:null,accessToken:null,refreshToken:null,isAuthenticated:false,isLoading:true} as AuthState,
  reducers:{
    setCredentials(state,action:PayloadAction<{user:AuthUser;accessToken:string;refreshToken:string}>){
      state.user=action.payload.user; state.accessToken=action.payload.accessToken;
      state.refreshToken=action.payload.refreshToken; state.isAuthenticated=true; state.isLoading=false;
    },
    setLoading(state,action:PayloadAction<boolean>){state.isLoading=action.payload;},
    updateAccessToken(state,action:PayloadAction<string>){state.accessToken=action.payload;},
    logout(state){state.user=null;state.accessToken=null;state.refreshToken=null;state.isAuthenticated=false;state.isLoading=false;},
  },
});
export const {setCredentials,logout,setLoading,updateAccessToken}=authSlice.actions;
export default authSlice.reducer;
