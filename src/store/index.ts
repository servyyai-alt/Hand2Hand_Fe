import { configureStore } from '@reduxjs/toolkit';
import authReducer         from './slices/authSlice';
import appReducer          from './slices/appSlice';
import deliveryReducer     from './slices/deliverySlice';
import locationReducer     from './slices/locationSlice';
import partnerReducer      from './slices/partnerSlice';
import notificationReducer from './slices/notificationSlice';

export const store = configureStore({
  reducer: { auth:authReducer, app:appReducer, delivery:deliveryReducer, location:locationReducer, partner:partnerReducer, notification:notificationReducer },
  middleware: (g) => g({
    serializableCheck: false,
    immutableCheck: false,
  }),
});
export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
