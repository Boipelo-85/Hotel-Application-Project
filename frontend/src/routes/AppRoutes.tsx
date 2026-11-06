import React, { lazy, Suspense } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
const Home = lazy(() => import('../pages/Home'));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const AuthCallback = lazy(() => import('../pages/AuthCallback'));
const Hotels = lazy(() => import('../pages/Hotels'));
const HotelDetails = lazy(() => import('../pages/HotelDetails'));
const Booking = lazy(() => import('../pages/Booking'));
const BookingConfirmation = lazy(() => import('../pages/BookingConfirmation'));
const BookingLookup = lazy(() => import('../pages/BookingLookup'));
const Payment = lazy(() => import('../pages/Payment'));
const ReviewBooking = lazy(() => import('../pages/ReviewBooking'));
const PaymentCallback = lazy(() => import('../pages/PaymentCallback'));
const MyBookings = lazy(() => import('../pages/MyBookings'));
const Profile = lazy(() => import('../pages/Profile'));
const Favourites = lazy(() => import('../pages/Favourites'));
const Notifications = lazy(() => import('../pages/Notifications'));
const NotFound = lazy(() => import('../pages/NotFound'));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const ManageHotels = lazy(() => import('../pages/admin/ManageHotels'));
const AddHotel = lazy(() => import('../pages/admin/AddHotel'));
const EditHotel = lazy(() => import('../pages/admin/EditHotel'));
const ManageRooms = lazy(() => import('../pages/admin/ManageRooms'));
const ManageBookings = lazy(() => import('../pages/admin/ManageBookings'));
const AdminFavourites = lazy(() => import('../pages/admin/AdminFavourites'));
import ProtectedRoute from '../components/ProtectedRoute';
import AdminRoute from '../components/AdminRoute';

const GuestBooking = lazy(() => import('../pages/GuestBooking'));

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<p role="status">Loading page...</p>}><Routes>
      <Route path="/guest-bookings/:bookingId" element={<GuestBooking />} />
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      <Route path="/hotels" element={<Hotels />} />
      <Route path="/hotels/:branchId" element={<HotelDetails />} />
      <Route path="/branches/:branchId" element={<HotelDetails />} />
      <Route path="/book" element={<Booking />} />
      <Route path="/booking-confirmation" element={<BookingConfirmation />} />
      <Route path="/booking-lookup" element={<BookingLookup />} />
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
        path="/bookings/:bookingId/payment/review"
        element={
          <ProtectedRoute>
            <ReviewBooking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment/callback"
        element={
          <PaymentCallback />
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
      <Route path="/admin/favourites" element={<AdminRoute adminOnly><AdminFavourites /></AdminRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes></Suspense>
  );
};

export default AppRoutes;
