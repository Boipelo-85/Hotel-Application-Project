import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function isoDate(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

interface SearchBarProps {
  initialDestination?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialRooms?: string;
  initialGuests?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  initialDestination = '',
  initialCheckIn,
  initialCheckOut,
  initialRooms = '1',
  initialGuests = '2',
}) => {
  const navigate = useNavigate();
  const [destination, setDestination] = useState(initialDestination);
  const [checkIn, setCheckIn] = useState(initialCheckIn || isoDate(1));
  const [checkOut, setCheckOut] = useState(initialCheckOut || isoDate(2));
  const [rooms, setRooms] = useState(initialRooms);
  const [guests, setGuests] = useState(initialGuests);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams({
      destination: destination.trim(),
      checkIn,
      checkOut,
      rooms,
      guests,
    });
    navigate(`/hotels?${params.toString()}`);
  };

  const fieldStyle: React.CSSProperties = {
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '0.25rem',
    minWidth: '8rem',
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        alignItems: 'end',
        justifyContent: 'center',
        backgroundColor: 'white',
        padding: '1rem',
        borderRadius: '0.5rem',
        border: '1px solid #e5e7eb',
      }}
    >
      <label>
        <div style={{ marginBottom: '0.25rem', fontSize: '0.85rem' }}>Destination</div>
        <input
          required
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          placeholder="Pretoria"
          style={fieldStyle}
        />
      </label>
      <label>
        <div style={{ marginBottom: '0.25rem', fontSize: '0.85rem' }}>Check-in</div>
        <input type="date" required value={checkIn} onChange={(event) => setCheckIn(event.target.value)} style={fieldStyle} />
      </label>
      <label>
        <div style={{ marginBottom: '0.25rem', fontSize: '0.85rem' }}>Check-out</div>
        <input type="date" required value={checkOut} onChange={(event) => setCheckOut(event.target.value)} style={fieldStyle} />
      </label>
      <label>
        <div style={{ marginBottom: '0.25rem', fontSize: '0.85rem' }}>Rooms</div>
        <input type="number" min={1} required value={rooms} onChange={(event) => setRooms(event.target.value)} style={{ ...fieldStyle, minWidth: '5rem' }} />
      </label>
      <label>
        <div style={{ marginBottom: '0.25rem', fontSize: '0.85rem' }}>Guests</div>
        <input type="number" min={1} required value={guests} onChange={(event) => setGuests(event.target.value)} style={{ ...fieldStyle, minWidth: '5rem' }} />
      </label>
      <button
        type="submit"
        style={{
          padding: '0.6rem 1.5rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '0.25rem',
          cursor: 'pointer',
        }}
      >
        Search
      </button>
    </form>
  );
};

export default SearchBar;
