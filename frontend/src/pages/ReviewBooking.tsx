import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBookingById } from '../redux/bookingSlice';
import { initiatePayment, type PaymentMethod } from '../redux/paymentSlice';
import type { AppDispatch, RootState } from '../redux/store';
import Loading from '../components/Loading';

interface ReviewLocationState {
  paymentMethod?: PaymentMethod;
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === 'card' || value === 'eft';
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const nights = (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000;
  return Number.isInteger(nights) && nights > 0 ? nights : 0;
}

const ReviewBooking: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { currentBooking, loading: bookingLoading, error: bookingError } = useSelector((state: RootState) => state.bookings);
  const { loading: paymentLoading, error: paymentError } = useSelector((state: RootState) => state.payments);
  const booking = currentBooking?.id === bookingId ? currentBooking : null;
  const state = location.state as ReviewLocationState | null;
  const requestedMethod = searchParams.get('method') ?? state?.paymentMethod;
  const paymentMethod = isPaymentMethod(requestedMethod) ? requestedMethod : 'card';
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (bookingId) {
      void dispatch(fetchBookingById(bookingId));
    }
  }, [bookingId, dispatch]);

  const handleConfirm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!bookingId || !acceptedTerms) return;

    const result = await dispatch(initiatePayment({ bookingId, paymentMethod }));
    if (initiatePayment.fulfilled.match(result)) {
      window.location.assign(result.payload.checkoutUrl);
    }
  };

  if (bookingLoading && !booking) return <Loading message="Loading booking review..." />;
  if (!booking && bookingError) {
    return <div style={{ padding: '2rem', color: '#991b1b' }}>{bookingError}</div>;
  }
  if (!booking) return <Loading message="Loading booking review..." />;

  if (booking.status !== 'pending') return <Navigate to={`/bookings/${booking.id}`} replace />;

  const nights = nightsBetween(booking.check_in, booking.check_out);
  const paymentLabel = paymentMethod === 'card' ? 'Credit or debit card' : 'Instant EFT / bank payment';

  return (
    <div style={{ padding: '2rem', maxWidth: '640px', margin: '0 auto' }}>
      <h1>Review your booking</h1>
      <p style={{ color: '#666' }}>Check your details before confirming.</p>
      <section style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', margin: '1.25rem 0' }}>
        <strong>{booking.branch_name || 'Hotel booking'}</strong>
        {booking.branch_name && <p>{booking.room_type || 'Selected room'}</p>}
        <p>{booking.check_in} – {booking.check_out} · {nights} night{nights === 1 ? '' : 's'}</p>
        <p>{booking.room_type || 'Room'} · {booking.guests} guests · {booking.quantity} room{booking.quantity === 1 ? '' : 's'}</p>
        {(booking.guest_name || booking.guest_email) && (
          <p>Guest: {booking.guest_name || 'Account holder'}{booking.guest_email ? ` · ${booking.guest_email}` : ''}</p>
        )}
        {booking.guest_phone && <p>Phone: {booking.guest_phone}</p>}
        {booking.guest_country && <p>Country: {booking.guest_country}</p>}
        {booking.guest_address && <p>Address: {booking.guest_address}</p>}
        {booking.special_requests && <p>Special requests: {booking.special_requests}</p>}
      </section>

      <section aria-label="Price breakdown" style={{ borderBottom: '1px solid #d1d5db', paddingBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Price breakdown</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <span>{nights} night{nights === 1 ? '' : 's'} × {booking.quantity} room{booking.quantity === 1 ? '' : 's'}</span>
          <span>{booking.currency} {booking.total_amount}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '0.75rem' }}>
          <strong>Total</strong>
          <strong>{booking.currency} {booking.total_amount}</strong>
        </div>
        <p>Payment method: {paymentLabel}</p>
      </section>

      <form onSubmit={(event) => void handleConfirm(event)} style={{ marginTop: '1.25rem' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '1rem' }}>
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            required
          />
          <span>I accept the booking and cancellation terms.</span>
        </label>
        {paymentError && (
          <div role="alert" style={{ color: '#92400e', background: '#fffbeb', padding: '0.9rem', marginBottom: '1rem' }}>
            {paymentError}
          </div>
        )}
        <button type="submit" disabled={!acceptedTerms || paymentLoading} style={primaryButtonStyle}>
          {paymentLoading ? 'Connecting to payment gateway...' : `Confirm and pay ${booking.currency} ${booking.total_amount}`}
        </button>
      </form>
      <p style={{ marginTop: '1.25rem' }}>
        <Link to={`/bookings/${booking.id}/payment?method=${paymentMethod}`}>Change payment method</Link>
      </p>
      <p>
        <button type="button" onClick={() => navigate(`/bookings/${booking.id}`)} style={textButtonStyle}>Back to booking</button>
      </p>
    </div>
  );
};

const primaryButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.9rem',
  backgroundColor: '#111',
  color: 'white',
  border: 0,
  borderRadius: '0.5rem',
  cursor: 'pointer',
};

const textButtonStyle: React.CSSProperties = {
  border: 0,
  background: 'none',
  color: '#2563eb',
  padding: 0,
  cursor: 'pointer',
};

export default ReviewBooking;
