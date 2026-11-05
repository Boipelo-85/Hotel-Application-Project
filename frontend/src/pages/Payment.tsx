import React, { useEffect } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBookingById } from '../redux/bookingSlice';
import type { PaymentMethod } from '../redux/paymentSlice';
import type { AppDispatch, RootState } from '../redux/store';
import Loading from '../components/Loading';

const Payment: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { currentBooking, loading: bookingLoading, error: bookingError } = useSelector((state: RootState) => state.bookings);
  const booking = currentBooking?.id === bookingId ? currentBooking : null;
  const returnState = location.state as { paymentMethod?: PaymentMethod } | null;
  const selectedMethod = searchParams.get('method') ?? returnState?.paymentMethod;
  const paymentMethod: PaymentMethod = selectedMethod === 'eft' ? 'eft' : 'card';

  useEffect(() => {
    if (bookingId) {
      void dispatch(fetchBookingById(bookingId));
    }
  }, [dispatch, bookingId]);

  const handleReview = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!bookingId) return;
    navigate(`/bookings/${bookingId}/payment/review?method=${paymentMethod}`);
  };

  if (bookingLoading && !booking) return <Loading message="Loading payment..." />;
  if (!booking && bookingError) {
    return <div style={{ padding: '2rem', color: '#991b1b' }}>{bookingError}</div>;
  }
  if (!booking) return <Loading message="Loading payment..." />;

  if (booking.status !== 'pending') return <Navigate to={`/bookings/${booking.id}`} replace />;

  return (
    <div style={{ padding: '2rem', maxWidth: '640px', margin: '0 auto' }}>
      <h1>Payment</h1>
      <p style={{ color: '#666' }}>Secure payment · Booking is not confirmed yet</p>
      <section style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', margin: '1.25rem 0' }}>
        <strong>{booking.branch_name || 'Hotel booking'} · {booking.room_type || 'Selected room'}</strong>
        <p>{booking.check_in} – {booking.check_out} · {booking.guests} guests · {booking.quantity} room{booking.quantity === 1 ? '' : 's'}</p>
        <strong>Total due: {booking.currency} {booking.total_amount}</strong>
      </section>
      <form onSubmit={handleReview}>
        <fieldset style={{ border: 0, padding: 0, margin: '1.5rem 0' }}>
          <legend style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Choose payment method</legend>
          {([
            ['card', 'Credit or debit card'],
            ['eft', 'Instant EFT / bank payment'],
          ] as const).map(([method, label]) => (
            <label
              key={method}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                border: `1px solid ${paymentMethod === method ? '#2563eb' : '#d1d5db'}`,
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '0.75rem',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={method}
                checked={paymentMethod === method}
                onChange={() => setSearchParams({ method }, { replace: true })}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Payment details are handled by the provider&apos;s secure checkout. This site does not collect card details.
        </p>
        <button type="submit" style={primaryButtonStyle}>Review booking</button>
      </form>
      <p style={{ marginTop: '1.5rem' }}>
        <Link to={`/bookings/${booking.id}`}>Back to booking</Link>
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

export default Payment;
