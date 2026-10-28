import React, { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBookingById } from '../redux/bookingSlice';
import type { Booking } from '../redux/bookingSlice';
import type { AppDispatch, RootState } from '../redux/store';
import Loading from '../components/Loading';

interface ConfirmationLocationState {
  booking?: Booking;
}

const BookingConfirmation: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { currentBooking, loading, error } = useSelector((state: RootState) => state.bookings);
  const guestBooking = (location.state as ConfirmationLocationState | null)?.booking;
  const booking = bookingId
    ? currentBooking?.id === bookingId ? currentBooking : null
    : guestBooking || null;

  useEffect(() => {
    if (bookingId) {
      void dispatch(fetchBookingById(bookingId));
    }
  }, [dispatch, bookingId]);

  if (bookingId && loading && !booking) return <Loading message="Loading booking..." />;
  if (bookingId && error) return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;
  if (!booking) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>Booking details are not available in this session.</p>
        <Link to="/hotels">Browse branches</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '640px', margin: '0 auto' }}>
      <h1>{bookingId ? 'Booking' : 'Reservation received'} {booking.booking_reference}</h1>
      {!bookingId && <p>Keep this reference for your records.</p>}
      <p>Status: {booking.status}</p>
      <p>
        {new Date(booking.check_in).toLocaleDateString()} → {new Date(booking.check_out).toLocaleDateString()}
      </p>
      <p>Guests: {booking.guests} · Rooms: {booking.quantity}</p>
      <p>
        Total: {booking.currency} {booking.total_amount}
      </p>
      {booking.status === 'pending' && (
        <p>This hold expires if payment is not completed in time.</p>
      )}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        {bookingId && booking.status === 'pending' && (
          <Link
            to={`/bookings/${booking.id}/payment`}
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: '#10b981',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '0.25rem',
            }}
          >
            Continue to payment
          </Link>
        )}
        {bookingId ? <Link to="/bookings">My bookings</Link> : <Link to="/hotels">Browse branches</Link>}
      </div>
    </div>
  );
};

export default BookingConfirmation;
