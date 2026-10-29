import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function isoDate(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDateRange(checkIn: string, checkOut: string): string {
  return `${formatDate(checkIn)} - ${formatDate(checkOut)}`;
}

interface SearchBarProps {
  initialDestination?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialRooms?: string;
  initialAdults?: string;
  initialChildren?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  initialDestination = '',
  initialCheckIn,
  initialCheckOut,
  initialRooms = '1',
  initialAdults = '1',
  initialChildren = '0',
}) => {
  const navigate = useNavigate();
  const [destination, setDestination] = useState(initialDestination);
  const [checkIn, setCheckIn] = useState(initialCheckIn || isoDate(1));
  const [checkOut, setCheckOut] = useState(initialCheckOut || isoDate(2));
  const [rooms, setRooms] = useState(initialRooms);
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const guests = String(Number(adults) + Number(children));
    const params = new URLSearchParams({
      destination: destination.trim(),
      checkIn,
      checkOut,
      rooms,
      guests,
    });
    navigate(`/hotels?${params.toString()}`);
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: '1rem',
    borderRadius: '2rem',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    maxWidth: '900px',
    margin: '0 auto',
  };

  const inputGroupStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '1.5rem',
    backgroundColor: 'white',
    flex: 1,
    minWidth: '200px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: '#6b7280',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const inputStyle: React.CSSProperties = {
    border: 'none',
    outline: 'none',
    fontSize: '1rem',
    color: '#111827',
    flex: 1,
    minWidth: '0',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '0.75rem 2rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '1.5rem',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 600,
    transition: 'background-color 0.2s',
  };

  return (
    <form onSubmit={handleSubmit} style={containerStyle}>
      <div style={inputGroupStyle}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={labelStyle}>Destination</span>
          <input
            required
            type="text"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            placeholder="Enter destination"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={inputGroupStyle}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={labelStyle}>Select dates</span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              required
              type="date"
              value={checkIn}
              onChange={(event) => setCheckIn(event.target.value)}
              style={{ ...inputStyle, fontSize: '0.9rem' }}
              min={isoDate(0)}
            />
            <span style={{ color: '#9ca3af' }}>-</span>
            <input
              required
              type="date"
              value={checkOut}
              onChange={(event) => setCheckOut(event.target.value)}
              style={{ ...inputStyle, fontSize: '0.9rem' }}
              min={checkIn}
            />
          </div>
        </div>
      </div>

      <div style={inputGroupStyle}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={labelStyle}>Select occupancy</span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <input
                type="number"
                min={1}
                max={10}
                value={adults}
                onChange={(event) => setAdults(event.target.value)}
                style={{ ...inputStyle, width: '2.5rem', textAlign: 'center' }}
              />
              <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>adults</span>
            </div>
            <span style={{ color: '#9ca3af' }}>-</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <input
                type="number"
                min={0}
                max={10}
                value={children}
                onChange={(event) => setChildren(event.target.value)}
                style={{ ...inputStyle, width: '2.5rem', textAlign: 'center' }}
              />
              <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>children</span>
            </div>
            <span style={{ color: '#9ca3af' }}>-</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <input
                type="number"
                min={1}
                max={10}
                value={rooms}
                onChange={(event) => setRooms(event.target.value)}
                style={{ ...inputStyle, width: '2.5rem', textAlign: 'center' }}
              />
              <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>room</span>
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        style={buttonStyle}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
      >
        Search
      </button>
    </form>
  );
};

export default SearchBar;
