import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import hotelReducer from './hotelSlice';
import roomReducer from './roomSlice';
import bookingReducer from './bookingSlice';
import paymentReducer from './paymentSlice';
import adminReducer from './adminSlice';
import favouriteReducer from './favouriteSlice';
import notificationReducer from './notificationSlice';
import reviewReducer from './reviewSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    hotels: hotelReducer,
    rooms: roomReducer,
    bookings: bookingReducer,
    payments: paymentReducer,
    admin: adminReducer,
    favourites: favouriteReducer,
    notifications: notificationReducer,
    reviews: reviewReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

