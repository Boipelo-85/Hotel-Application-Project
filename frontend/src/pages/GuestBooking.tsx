import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { Booking } from '../redux/bookingSlice';
import { parseApiError } from '../services/api';

export default function GuestBooking() {
  const { bookingId } = useParams();
  const [params] = useSearchParams();
  const reference = params.get('reference') ?? params.get('trxref');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState('card');
  const [accepted, setAccepted] = useState(false);
  const checkoutKey = useRef(crypto.randomUUID());
  const base = `/api/v1/guest-bookings/${bookingId}`;
  const load = useCallback(async () => {
    const response = await fetch(base, { credentials: 'include' });
    if (!response.ok) throw new Error(await parseApiError(response));
    setBooking((await response.json()).booking);
  }, [base]);
  const verify = useCallback(async () => {
    if (!reference) return;
    const response = await fetch(`${base}/verify`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference }),
    });
    if (!response.ok) throw new Error(await parseApiError(response));
    const result = await response.json();
    setMessage(result.status === 'successful'
      ? result.bookingStatus === 'confirmed' ? 'Payment received. Your booking is confirmed.' : 'Payment received after the hold ended. Contact the hotel about your refund.'
      : result.status === 'refunded' ? 'Your payment has been refunded.'
      : result.status === 'failed' ? 'Payment failed. You may try again while your reservation is pending.'
      : 'Payment is still pending. Check again before making another payment.');
  }, [base, reference]);
  useEffect(() => {
    let active = true;
    void (async () => {
      setBusy(true);
      try { await verify(); await load(); }
      catch (err) { if (active) setError(err instanceof Error ? err.message : 'Unable to load booking'); }
      finally { if (active) setBusy(false); }
    })();
    return () => { active = false; };
  }, [load, verify]);

  async function act(action: 'checkout' | 'cancel' | 'refresh') {
    setBusy(true); setError('');
    try {
      if (action === 'refresh') { await verify(); await load(); return; }
      const response = await fetch(`${base}/${action}`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': checkoutKey.current },
        body: JSON.stringify(action === 'checkout' ? { paymentMethod: method } : {}),
      });
      if (!response.ok) throw new Error(await parseApiError(response));
      const data = await response.json();
      if (action === 'checkout') { window.location.assign(data.checkoutUrl); return; }
      setMessage(data.status === 'refund_requested' ? 'Cancellation requested. Your booking will be cancelled when the provider confirms the refund.' : 'Your booking has been cancelled.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to complete this action'); }
    finally { setBusy(false); }
  }
  const canPay = booking?.status === 'pending' && !!booking.expires_at && Date.parse(booking.expires_at) > Date.now();
  return <main style={{ padding: '2rem', maxWidth: 640, margin: 'auto' }}>
    <h1>Manage your guest booking</h1>
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {booking && <>
      <h2>{booking.booking_reference}</h2>
      <p>{booking.branch_name} · {booking.room_type}</p>
      <p>{booking.check_in} → {booking.check_out}</p>
      <p>{booking.quantity} rooms · {booking.guests} guests</p>
      <p>Total: {booking.currency} {booking.total_amount}</p>
      <p>Status: {booking.status}</p>
      {booking.refund_pending && <p role="status">Your cancellation and refund request is being processed. Contact the hotel if you need help.</p>}
      <p>Keep your reference and booking email to retrieve this reservation on another device.</p>
      {canPay && <form onSubmit={event => { event.preventDefault(); void act('checkout'); }}>
        <p>Your room hold expires at {new Date(booking.expires_at!).toLocaleString()}.</p>
        <label>Payment method <select value={method} onChange={event => setMethod(event.target.value)}>
          <option value="card">Credit or debit card</option><option value="eft">Instant EFT</option>
        </select></label>
        <p>Unpaid reservations can be cancelled. Paid stays may be cancelled before check-in with a full refund; processing depends on the payment provider.</p>
        <label><input type="checkbox" required checked={accepted} onChange={event => setAccepted(event.target.checked)} /> I accept these booking and cancellation terms.</label>
        <p><button disabled={busy || !accepted}>Continue to secure payment</button></p>
      </form>}
      {booking.status === 'pending' && !canPay && <p>The payment hold has expired. Please make a new reservation.</p>}
      {!booking.refund_pending && (booking.status === 'pending' || booking.status === 'confirmed') && <button disabled={busy} onClick={() => {
        if (window.confirm(booking.status === 'confirmed' ? 'Cancel this stay and request a full refund?' : 'Cancel this reservation?')) void act('cancel');
      }}>{booking.status === 'confirmed' ? 'Cancel and request refund' : 'Cancel booking'}</button>}
      <p><button disabled={busy} onClick={() => void act('refresh')}>Check booking status</button></p>
    </>}
    {!booking && busy && <p>Loading booking...</p>}
    <p><Link to="/booking-lookup">Find a guest booking</Link> · <Link to="/hotels">Browse stays</Link></p>
  </main>;
}
