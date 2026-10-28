import React from 'react';

interface BookingFormProps {
  checkIn: string;
  checkOut: string;
  guests: string;
  quantity: string;
  loading?: boolean;
  error?: string | null;
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
  onGuestsChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid #ddd',
  borderRadius: '0.25rem',
  boxSizing: 'border-box',
};

const BookingForm: React.FC<BookingFormProps> = ({
  checkIn,
  checkOut,
  guests,
  quantity,
  loading,
  error,
  onCheckInChange,
  onCheckOutChange,
  onGuestsChange,
  onQuantityChange,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <label>
        Check-in
        <input type="date" required value={checkIn} onChange={(event) => onCheckInChange(event.target.value)} style={fieldStyle} />
      </label>
      <label>
        Check-out
        <input type="date" required value={checkOut} onChange={(event) => onCheckOutChange(event.target.value)} style={fieldStyle} />
      </label>
      <label>
        Guests
        <input type="number" min={1} required value={guests} onChange={(event) => onGuestsChange(event.target.value)} style={fieldStyle} />
      </label>
      <label>
        Rooms
        <input type="number" min={1} required value={quantity} onChange={(event) => onQuantityChange(event.target.value)} style={fieldStyle} />
      </label>
      {error && <div style={{ color: '#991b1b', backgroundColor: '#fee', padding: '0.75rem' }}>{error}</div>}
      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '0.75rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '0.25rem',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Reserving...' : 'Reserve'}
      </button>
    </form>
  );
};

export default BookingForm;
