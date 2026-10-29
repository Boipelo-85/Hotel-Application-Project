import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import AuthCallback from '../pages/AuthCallback';
import Hotels from '../pages/Hotels';
import HotelDetails from '../pages/HotelDetails';
import Booking from '../pages/Booking';
import BookingConfirmation from '../pages/BookingConfirmation';
import Payment from '../pages/Payment';
import MyBookings from '../pages/MyBookings';
import Profile from '../pages/Profile';
import Favourites from '../pages/Favourites';
import Notifications from '../pages/Notifications';
import NotFound from '../pages/NotFound';
import AdminDashboard from '../pages/admin/AdminDashboard';
import ManageHotels from '../pages/admin/ManageHotels';
import AddHotel from '../pages/admin/AddHotel';
import EditHotel from '../pages/admin/EditHotel';
import ManageRooms from '../pages/admin/ManageRooms';
import ManageBookings from '../pages/admin/ManageBookings';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminRoute from '../components/AdminRoute';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/hotels" element={<Hotels />} />
      <Route path="/hotels/:branchId" element={<HotelDetails />} />
      <Route path="/book" element={<Booking />} />
      <Route path="/booking-confirmation" element={<BookingConfirmation />} />
      <Route
        path="/bookings"
        element={
          <ProtectedRoute>
            <MyBookings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookings/:bookingId"
        element={
          <ProtectedRoute>
            <BookingConfirmation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookings/:bookingId/payment"
        element={
          <ProtectedRoute>
            <Payment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/favourites"
        element={
          <ProtectedRoute>
            <Favourites />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/hotels"
        element={
          <AdminRoute>
            <ManageHotels />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/hotels/new"
        element={
          <AdminRoute>
            <AddHotel />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/hotels/:branchId/edit"
        element={
          <AdminRoute>
            <EditHotel />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/rooms"
        element={
          <AdminRoute>
            <ManageRooms />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/bookings"
        element={
          <AdminRoute>
            <ManageBookings />
          </AdminRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
