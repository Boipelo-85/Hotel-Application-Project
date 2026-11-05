import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { createBooking } from '../redux/bookingSlice';
import { fetchRoomById } from '../redux/roomSlice';
import type { AppDispatch, RootState } from '../redux/store';
import BookingForm from '../components/BookingForm';
import Loading from '../components/Loading';

function isoDate(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

const Booking: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.bookings);
  const { isAuthenticated, loading: authLoading, user } = useSelector((state: RootState) => state.auth);
  const rooms = useSelector((state: RootState) => state.rooms.rooms);

  const roomId = searchParams.get('roomId') || '';
  const bookingPath = `/book?${searchParams.toString()}`;
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || isoDate(1));
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || isoDate(2));
  const [guests, setGuests] = useState(searchParams.get('guests') || '2');
  const [quantity, setQuantity] = useState(searchParams.get('quantity') || '1');
  const [firstName, setFirstName] = useState(() => user?.name.trim().split(/\s+/)[0] || '');
  const [lastName, setLastName] = useState(() => user?.name.trim().split(/\s+/).slice(1).join(' ') || '');
  const [guestMode, setGuestMode] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  useEffect(() => {
    setCheckIn(searchParams.get('checkIn') || isoDate(1));
    setCheckOut(searchParams.get('checkOut') || isoDate(2));
    setGuests(searchParams.get('guests') || '2');
    setQuantity(searchParams.get('quantity') || '1');
  }, [searchParams]);

  const room = rooms.find((item) => String(item.id) === roomId);
  const stayNights = (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000;
  const nights = Number.isFinite(stayNights) && stayNights > 0 ? stayNights : 0;
  const total = room
    ? Number(room.price || room.price_per_night || 0) * nights * Number(quantity)
    : null;

  useEffect(() => {
    if (roomId) {
      void dispatch(fetchRoomById(roomId));
    }
  }, [dispatch, roomId]);

  useEffect(() => {
    if (user?.name && !firstName && !lastName) {
      const [givenName = '', ...familyNames] = user.name.trim().split(/\s+/);
      setFirstName(givenName);
      setLastName(familyNames.join(' '));
    }
    if (user?.phone && !phone) setPhone(user.phone);
  }, [user, firstName, lastName, phone]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await dispatch(
      createBooking({
        roomId,
        checkIn,
        checkOut,
        guests: Number(guests),
        quantity: Number(quantity),
        guestName: `${firstName.trim()} ${lastName.trim()}`,
        guestEmail: user?.email ?? email.trim(),
        guestPhone: phone.trim(),
        guestCountry: country.trim(),
        guestAddress: address.trim(),
        specialRequests: specialRequests.trim(),
      }),
    );
    if (createBooking.fulfilled.match(result)) {
      const booking = result.payload;
      if (booking?.id) {
        navigate(booking.user_id === null ? `/guest-bookings/${booking.id}` : `/bookings/${booking.id}/payment`);
      }
    }
  };

  if (!roomId) {
    return (
      <div style={{ padding: '2rem' }}>
        Choose a room from a <Link to="/hotels">branch page</Link> to start a booking.
      </div>
    );
  }

  if (authLoading && !isAuthenticated) return <Loading message="Checking your session..." />;

  if (!isAuthenticated && !guestMode) {
    return (
      <div style={{ padding: '2rem', maxWidth: '520px', margin: '0 auto' }}>
        <h1>Choose how to continue</h1>
        {room && (
          <p style={{ color: '#666' }}>
            {room.room_type} · {room.currency} {room.price || room.price_per_night}/night
          </p>
        )}
        <p>Sign in, create an account, or continue as a guest.</p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <button type="button" onClick={() => setGuestMode(true)}>Continue as guest</button>
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem('auth:returnTo', bookingPath);
              window.location.href = '/api/v1/auth/google';
            }}
            style={{ padding: '0.75rem', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '0.25rem', cursor: 'pointer' }}
          >
            Continue with Google
          </button>
          <Link
            to="/login"
            state={{ from: bookingPath }}
            style={{ padding: '0.75rem', textAlign: 'center', backgroundColor: '#3b82f6', color: 'white', textDecoration: 'none', borderRadius: '0.25rem' }}
          >
            Sign in
          </Link>
          <Link
            to="/register"
            state={{ from: bookingPath }}
            style={{ padding: '0.75rem', textAlign: 'center', border: '1px solid #3b82f6', color: '#1d4ed8', textDecoration: 'none', borderRadius: '0.25rem' }}
          >
            Create an account
          </Link>
        </div>
        <p style={{ marginTop: '1rem', color: '#666' }}>
          Your room and stay details will be kept if you sign in or register and return to the booking.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '520px', margin: '0 auto' }}>
      <h1>Complete your booking</h1>
      {room && (
        <p style={{ color: '#666' }}>
          {room.room_type} · {room.currency} {room.price || room.price_per_night}/night
        </p>
      )}
      {room && total !== null && nights > 0 && (
        <section aria-label="Price summary" style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem' }}>
          <strong>Price summary</strong>
          <p>{nights} night{nights === 1 ? '' : 's'} × {quantity} room{Number(quantity) === 1 ? '' : 's'}</p>
          <p style={{ marginBottom: 0, fontWeight: 700 }}>Estimated total: {room.currency} {total.toFixed(2)}</p>
        </section>
      )}
      <BookingForm
        checkIn={checkIn}
        checkOut={checkOut}
        guests={guests}
        quantity={quantity}
        loading={loading}
        error={error}
        onCheckInChange={setCheckIn}
        onCheckOutChange={setCheckOut}
        onGuestsChange={setGuests}
        onQuantityChange={setQuantity}
        firstName={firstName}
        lastName={lastName}
        email={user?.email ?? email}
        onEmailChange={user ? undefined : setEmail}
        phone={phone}
        country={country}
        address={address}
        specialRequests={specialRequests}
        onFirstNameChange={setFirstName}
        onLastNameChange={setLastName}
        onPhoneChange={setPhone}
        onCountryChange={setCountry}
        onAddressChange={setAddress}
        onSpecialRequestsChange={setSpecialRequests}
        onSubmit={(event) => void handleSubmit(event)}
      />
    </div>
  );
};

export default Booking;
