import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import { Footer } from './components/Footer';
import AppRoutes from './routes/AppRoutes';
import { getCurrentUser } from './redux/authSlice';
import type { RootState, AppDispatch } from './redux/store';

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const isAdminPage = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
  const currentBooking = useSelector((state: RootState) => state.bookings.currentBooking);
  const confirmedBooking = currentBooking?.status === 'confirmed' && location.pathname === '/bookings/' + currentBooking.id;
  const guestConfirmation = location.pathname === '/booking-confirmation' && location.state?.booking?.status === 'confirmed';
  const isConfirmation = confirmedBooking || guestConfirmation;

  useEffect(() => {
    void dispatch(getCurrentUser());
  }, [dispatch]);

  return (
    <div className="app-shell">
      {!isConfirmation && <Navbar />}
      <main className={isConfirmation ? "app-main app-main--confirmation" : isAdminPage ? "app-main app-main--admin" : "app-main"}>
        <AppRoutes />
      </main>
      {!isConfirmation && <Footer />}
    </div>
  );
}

export default App;
