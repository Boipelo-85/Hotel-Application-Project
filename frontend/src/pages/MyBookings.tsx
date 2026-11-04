import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { cancelBooking, fetchBookings, modifyBooking, type Booking } from '../redux/bookingSlice';
import type { AppDispatch, RootState } from '../redux/store';
import Loading from '../components/Loading';

const MyBookings: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { bookings, loading, error } = useSelector((state: RootState) => state.bookings);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [savingBookingId, setSavingBookingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ checkIn: '', checkOut: '', guests: '1', quantity: '1' });

  useEffect(() => {
    void dispatch(fetchBookings());
  }, [dispatch]);

  const startEditing = (booking: Booking) => {
    setActionError(null);
    setEditingBookingId(booking.id);
    setDraft({
      checkIn: booking.check_in.slice(0, 10),
      checkOut: booking.check_out.slice(0, 10),
      guests: String(booking.guests),
      quantity: String(booking.quantity),
    });
  };

  const saveChanges = async (bookingId: string) => {
    setActionError(null);
    setSavingBookingId(bookingId);
    const result = await dispatch(modifyBooking({
      bookingId,
      changes: {
        checkIn: draft.checkIn,
        checkOut: draft.checkOut,
        guests: Number(draft.guests),
        quantity: Number(draft.quantity),
      },
    }));
    setSavingBookingId(null);
    if (modifyBooking.fulfilled.match(result)) {
      setEditingBookingId(null);
    } else {
      setActionError(result.error.message || 'Unable to update this booking.');
    }
  };

  if (loading && bookings.length === 0) {
    return <Loading message="Loading bookings..." />;
  }

  if (error) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>My Bookings</h1>
      {actionError && <p role="alert" style={{ color: '#991b1b' }}>{actionError}</p>}
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
                {booking.status === 'pending' && (
                  <button type="button" onClick={() => startEditing(booking)}>Modify stay</button>
                )}
                {booking.status === 'pending' && (
                  <button
                    type="button"
                    onClick={async () => {
                      setActionError(null);
                      const result = await dispatch(cancelBooking(String(booking.id)));
                      if (cancelBooking.rejected.match(result)) {
                        setActionError(result.error.message || 'Unable to cancel this booking.');
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', padding: 0 }}
                  >
                    Cancel
                  </button>
                )}
              </div>
              {editingBookingId === booking.id && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveChanges(booking.id);
                  }}
                  style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem', padding: '1rem', background: '#f9fafb' }}
                >
                  <strong>Modify pending reservation</strong>
                  <label>Check-in<input type="date" required min={new Date().toISOString().slice(0, 10)} value={draft.checkIn} onChange={(event) => setDraft({ ...draft, checkIn: event.target.value })} /></label>
                  <label>Check-out<input type="date" required min={draft.checkIn} value={draft.checkOut} onChange={(event) => setDraft({ ...draft, checkOut: event.target.value })} /></label>
                  <label>Guests<input type="number" min={1} required value={draft.guests} onChange={(event) => setDraft({ ...draft, guests: event.target.value })} /></label>
                  <label>Rooms<input type="number" min={1} required value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} /></label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="submit" disabled={savingBookingId === booking.id}>{savingBookingId === booking.id ? 'Saving...' : 'Save changes'}</button>
                    <button type="button" disabled={savingBookingId === booking.id} onClick={() => setEditingBookingId(null)}>Close</button>
                  </div>
                </form>
              )}
              {booking.status === 'confirmed' && (
                <p style={{ color: '#6b7280' }}>Changes and cancellations for confirmed stays are not available online.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
