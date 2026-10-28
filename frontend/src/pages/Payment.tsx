import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBookingById } from '../redux/bookingSlice';
import { initiatePayment } from '../redux/paymentSlice';
import type { AppDispatch, RootState } from '../redux/store';
import Loading from '../components/Loading';

const Payment: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const booking = useSelector((state: RootState) => state.bookings.currentBooking);
  const { loading, error, currentPayment } = useSelector((state: RootState) => state.payments);

  useEffect(() => {
    if (bookingId) {
      void dispatch(fetchBookingById(bookingId));
    }
  }, [dispatch, bookingId]);

  const handlePay = () => {
    if (bookingId) {
      void dispatch(initiatePayment(bookingId));
    }
  };

  if (!booking && !error) return <Loading message="Loading payment..." />;

  return (
    <div style={{ padding: '2rem', maxWidth: '640px', margin: '0 auto' }}>
      <h1>Payment</h1>
      {booking && (
        <p>
          Booking {booking.booking_reference} · {booking.currency} {booking.total_amount}
        </p>
      )}
      <p>
        Card checkout is not live yet. The API returns an unavailable response until a payment provider is configured.
        Do not enter card numbers here.
      </p>
      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        style={{
          padding: '0.75rem 1.25rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '0.25rem',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Contacting payment...' : 'Try checkout'}
      </button>
      {error && (
        <div style={{ marginTop: '1rem', backgroundColor: '#fef3c7', padding: '0.75rem', borderRadius: '0.25rem' }}>
          {error}
        </div>
      )}
      {currentPayment && (
        <p style={{ marginTop: '1rem' }}>Payment status: {currentPayment.status}</p>
      )}
      <p style={{ marginTop: '1.5rem' }}>
        <Link to={bookingId ? `/bookings/${bookingId}` : '/bookings'}>Back to booking</Link>
      </p>
    </div>
  );
};

export default Payment;
