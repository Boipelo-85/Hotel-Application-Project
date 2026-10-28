import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { createBooking } from '../redux/bookingSlice';
import { fetchRoomById } from '../redux/roomSlice';
import type { AppDispatch, RootState } from '../redux/store';
import BookingForm from '../components/BookingForm';

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
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const rooms = useSelector((state: RootState) => state.rooms.rooms);

  const roomId = searchParams.get('roomId') || '';
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || isoDate(1));
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || isoDate(2));
  const [guests, setGuests] = useState(searchParams.get('guests') || '2');
  const [quantity, setQuantity] = useState(searchParams.get('quantity') || '1');

  const room = rooms.find((item) => String(item.id) === roomId);

  useEffect(() => {
    if (roomId) {
      void dispatch(fetchRoomById(roomId));
    }
  }, [dispatch, roomId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await dispatch(
      createBooking({
        roomId,
        checkIn,
        checkOut,
        guests: Number(guests),
        quantity: Number(quantity),
      }),
    );
    if (createBooking.fulfilled.match(result)) {
      const booking = result.payload;
      if (booking?.id) {
        if (isAuthenticated) {
          navigate(`/bookings/${booking.id}`);
        } else {
          navigate('/booking-confirmation', { state: { booking } });
        }
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

  return (
    <div style={{ padding: '2rem', maxWidth: '520px', margin: '0 auto' }}>
      <h1>Complete your booking</h1>
      {room && (
        <p style={{ color: '#666' }}>
          {room.room_type} · {room.currency} {room.price || room.price_per_night}/night
        </p>
      )}
      {!isAuthenticated && (
        <p style={{ backgroundColor: '#fef3c7', padding: '0.75rem', borderRadius: '0.25rem' }}>
          You can book as a guest. <Link to="/login">Sign in</Link> if you want this stay on your account.
        </p>
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
        onSubmit={(event) => void handleSubmit(event)}
      />
    </div>
  );
};

export default Booking;
