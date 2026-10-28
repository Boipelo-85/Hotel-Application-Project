import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { cancelBooking, fetchBookings } from '../redux/bookingSlice';
import type { AppDispatch, RootState } from '../redux/store';
import Loading from '../components/Loading';

const MyBookings: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { bookings, loading, error } = useSelector((state: RootState) => state.bookings);

  useEffect(() => {
    void dispatch(fetchBookings());
  }, [dispatch]);

  if (loading && bookings.length === 0) {
    return <Loading message="Loading bookings..." />;
  }

  if (error) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>My Bookings</h1>
      {bookings.length === 0 ? (
        <p>
          No bookings found. <Link to="/hotels">Find a branch</Link>
        </p>
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
              {booking.branch_name && <p style={{ color: '#666' }}>{booking.branch_name} · {booking.room_type}</p>}
              <p style={{ color: '#666' }}>
                Check-in: {new Date(booking.check_in).toLocaleDateString()}
              </p>
              <p style={{ color: '#666' }}>
                Check-out: {new Date(booking.check_out).toLocaleDateString()}
              </p>
              <p style={{ color: '#666' }}>Guests: {booking.guests}</p>
              <p style={{ color: '#666' }}>
                Total: {booking.currency} {booking.total_amount}
              </p>
              <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>{booking.status.toUpperCase()}</p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link to={`/bookings/${booking.id}`}>View</Link>
                {booking.status === 'pending' && (
                  <Link to={`/bookings/${booking.id}/payment`}>Pay</Link>
                )}
                {(booking.status === 'pending' || booking.status === 'confirmed') && (
                  <button
                    type="button"
                    onClick={() => void dispatch(cancelBooking(String(booking.id)))}
                    style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', padding: 0 }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
