import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { parseApiError, readJson } from '../services/api';
import type { Booking } from '../redux/bookingSlice';

const BookingLookup: React.FC = () => {
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBooking(null);
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/v1/bookings/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: reference.trim(), email: email.trim() }),
      });
      if (!response.ok) {
        setError(await parseApiError(response));
        return;
      }
      const data = await readJson<{ booking: Booking }>(response);
      if (!data?.booking) throw new Error('The server did not return booking details.');
      setBooking(data.booking);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : 'Unable to look up this booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '640px', margin: '0 auto' }}>
      <h1>Find a guest booking</h1>
      <p>Enter the booking reference and the email address used when reserving.</p>
      <form onSubmit={(event) => void handleSubmit(event)} style={{ display: 'grid', gap: '1rem' }}>
        <label>
          Booking reference
          <input required maxLength={40} autoComplete="off" value={reference} onChange={(event) => setReference(event.target.value)} />
        </label>
        <label>
          Email address
          <input required type="email" maxLength={320} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        {error && <p role="alert" style={{ color: '#991b1b' }}>{error}</p>}
        <button type="submit" disabled={loading}>{loading ? 'Looking up...' : 'Find booking'}</button>
      </form>
      {booking && (
        <section aria-label="Guest booking details" style={{ marginTop: '2rem', border: '1px solid #ddd', borderRadius: '0.5rem', padding: '1rem' }}>
          <h2>{booking.booking_reference}</h2>
          <p>{booking.branch_name} · {booking.room_type}</p>
          <p>{booking.check_in} → {booking.check_out}</p>
          <p>Guests: {booking.guests} · Rooms: {booking.quantity}</p>
          <p>Total: {booking.currency} {booking.total_amount}</p>
          <p>Status: {booking.status}</p>
          <Link to={`/guest-bookings/${booking.id}`}>Manage booking, pay or cancel</Link>
          {booking.status === 'pending' && (
            <p role="status">This reservation is pending. Continue to manage payment or cancel your booking.</p>
          )}
        </section>
      )}
      <p style={{ marginTop: '1.5rem' }}><Link to="/hotels">Browse stays</Link></p>
    </div>
  );
};

export default BookingLookup;
