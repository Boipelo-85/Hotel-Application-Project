import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBookings } from '../redux/bookingSlice';
import type { RootState } from '../redux/store';

const MyBookings: React.FC = () => {
  const dispatch = useDispatch();
  const { bookings, loading, error } = useSelector((state: RootState) => state.bookings);

  useEffect(() => {
    dispatch(fetchBookings() as any);
  }, [dispatch]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading bookings...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>My Bookings</h1>
      {bookings.length === 0 ? (
        <p>No bookings found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {bookings.map((booking) => (
            <div
              key={booking.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '0.5rem',
                padding: '1rem',
                backgroundColor: 'white',
              }}
            >
              <h3 style={{ marginBottom: '0.5rem' }}>Booking #{booking.booking_reference}</h3>
              <p style={{ color: '#666', marginBottom: '0.5rem' }}>
                Check-in: {new Date(booking.check_in).toLocaleDateString()}
              </p>
              <p style={{ color: '#666', marginBottom: '0.5rem' }}>
                Check-out: {new Date(booking.check_out).toLocaleDateString()}
              </p>
              <p style={{ color: '#666', marginBottom: '0.5rem' }}>Guests: {booking.guests}</p>
              <p style={{ color: '#666', marginBottom: '0.5rem' }}>
                Total: ${booking.total_amount} {booking.currency}
              </p>
              <div
                style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '0.25rem',
                  backgroundColor:
                    booking.status === 'confirmed'
                      ? '#d1fae5'
                      : booking.status === 'pending'
                      ? '#fef3c7'
                      : booking.status === 'cancelled'
                      ? '#fee'
                      : '#dbeafe',
                  color:
                    booking.status === 'confirmed'
                      ? '#065f46'
                      : booking.status === 'pending'
                      ? '#92400e'
                      : booking.status === 'cancelled'
                      ? '#991b1b'
                      : '#1e40af',
                  marginBottom: '0.5rem',
                }}
              >
                {booking.status.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;

