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

  if (booking.status === 'confirmed') {
    const formatDate = (value: string) => new Intl.DateTimeFormat('en-ZA', {
      day: 'numeric', month: 'short', timeZone: 'UTC',
    }).format(new Date(value));
    const nights = Math.round((Date.parse(booking.check_out) - Date.parse(booking.check_in)) / 86_400_000);
    return (
      <div className="booking-success">
        <header className="booking-success__header">
          <Link to="/" className="booking-success__brand">GRAND-REST</Link>
          <Link to="/bookings" className="booking-success__back" aria-label="Back to my bookings">‹</Link>
        </header>
        <section className="booking-success__content" aria-labelledby="booking-success-title">
          <h1 id="booking-success-title">Booking confirmed!</h1>
          <p className="booking-success__subtitle">Your Grand-Rest stay is reserved.</p>
          <div className="booking-success__check" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="32" height="32" fill="none"><path d="m7 16 6 6L25 10" stroke="currentColor" strokeWidth="4" strokeLinecap="square" /></svg>
          </div>
          <p className="booking-success__thanks">Thank you for booking with Grand-Rest.</p>
          <div className="booking-success__reference">
            <span>Booking reference</span>
            <strong>{booking.booking_reference}</strong>
          </div>
          <div className="booking-success__details">
            {booking.branch_name && <h2>{booking.branch_name}</h2>}
            <p>{formatDate(booking.check_in)} – {formatDate(booking.check_out)} · {nights} {nights === 1 ? 'night' : 'nights'}</p>
            <p>{booking.room_type || 'Room'} · {booking.guests} {booking.guests === 1 ? 'guest' : 'guests'}{booking.quantity > 1 && <> · {booking.quantity} rooms</>}</p>
            <p>Payment status: Successful</p>
          </div>
          <p className="booking-success__note">Your reservation is confirmed. Keep your booking reference for your stay.</p>
          <div className="booking-success__actions">
            <Link className="booking-success__primary" to={bookingId ? '/bookings' : '/booking-lookup'}>{bookingId ? 'View my bookings' : 'Find my booking'}</Link>
            <Link className="booking-success__secondary" to="/">Back to home</Link>
          </div>
        </section>
        <nav className="booking-success__nav" aria-label="Main navigation">
          <Link to="/">Home</Link>
          <Link to="/hotels">Explore</Link>
          <Link to="/favourites">Favourites</Link>
          <Link to="/profile">Profile</Link>
        </nav>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '640px', margin: '0 auto' }}>
      <h1>
        {bookingId ? 'Booking details' : 'Reservation request received'}
      </h1>
      <p>Booking reference: <strong>{booking.booking_reference}</strong></p>
      {!bookingId && (
        <>
          <p>Keep this reference and the email you used to find this reservation later.</p>
          {booking.guest_email && <p>Traveler email: {booking.guest_email}</p>}
        </>
      )}
      <p>Status: {booking.status}</p>
      {booking.branch_name && <p>Branch: {booking.branch_name}</p>}
      {booking.room_type && <p>Room: {booking.room_type}</p>}
      <p>
        {new Date(booking.check_in).toLocaleDateString()} → {new Date(booking.check_out).toLocaleDateString()}
      </p>
      <p>Guests: {booking.guests} · Rooms: {booking.quantity}</p>
      <p>
        Total: {booking.currency} {booking.total_amount}
      </p>
      {booking.status === 'pending' && (
        <p>This reservation is not confirmed yet and the hold expires if payment is not completed in time.</p>
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
        {bookingId ? (
          <Link to="/bookings">My bookings</Link>
        ) : (
          <><Link to="/booking-lookup">Find this booking later</Link><Link to="/hotels">Browse branches</Link></>
        )}
      </div>
    </div>
  );
};

export default BookingConfirmation;
