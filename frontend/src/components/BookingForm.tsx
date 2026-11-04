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
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  address: string;
  specialRequests: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onSpecialRequestsChange: (value: string) => void;
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
  firstName,
  lastName,
  email,
  phone,
  country,
  address,
  specialRequests,
  onFirstNameChange,
  onLastNameChange,
  onPhoneChange,
  onCountryChange,
  onAddressChange,
  onSpecialRequestsChange,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <label>
        Check-in
        <input type="date" required min={new Date().toISOString().slice(0, 10)} value={checkIn} onChange={(event) => onCheckInChange(event.target.value)} style={fieldStyle} />
      </label>
      <label>
        Check-out
        <input type="date" required min={checkIn || new Date().toISOString().slice(0, 10)} value={checkOut} onChange={(event) => onCheckOutChange(event.target.value)} style={fieldStyle} />
      </label>
      <label>
        Guests
        <input type="number" min={1} required value={guests} onChange={(event) => onGuestsChange(event.target.value)} style={fieldStyle} />
      </label>
      <label>
        Rooms
        <input type="number" min={1} required value={quantity} onChange={(event) => onQuantityChange(event.target.value)} style={fieldStyle} />
      </label>
      <fieldset style={{ border: '1px solid #ddd', borderRadius: '0.25rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <legend>Personal information</legend>
        <p style={{ margin: 0, color: '#666' }}>Tell us who will be staying. Booking contact: {email}</p>
        <label>
          First name
          <input autoComplete="given-name" minLength={1} maxLength={60} required value={firstName} onChange={(event) => onFirstNameChange(event.target.value)} style={fieldStyle} />
        </label>
        <label>
          Last name
          <input autoComplete="family-name" minLength={1} maxLength={60} required value={lastName} onChange={(event) => onLastNameChange(event.target.value)} style={fieldStyle} />
        </label>
        <label>
          Phone number
          <input autoComplete="tel" type="tel" maxLength={50} required value={phone} onChange={(event) => onPhoneChange(event.target.value)} style={fieldStyle} />
        </label>
        <label>
          Country / region
          <input autoComplete="country-name" maxLength={100} required value={country} onChange={(event) => onCountryChange(event.target.value)} style={fieldStyle} />
        </label>
        <label>
          Address
          <input autoComplete="street-address" maxLength={250} required value={address} onChange={(event) => onAddressChange(event.target.value)} style={fieldStyle} />
        </label>
        <p style={{ margin: 0, color: '#666' }}>Guests: {guests} · Rooms: {quantity}</p>
        <label>
          Special requests (optional)
          <textarea maxLength={1000} value={specialRequests} onChange={(event) => onSpecialRequestsChange(event.target.value)} style={{ ...fieldStyle, minHeight: '4rem', resize: 'vertical' }} />
        </label>
      </fieldset>
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
        {loading ? 'Preparing payment...' : 'Continue to payment'}
      </button>
    </form>
  );
};

export default BookingForm;
