import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { parseApiError } from '../../services/api';

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid #ddd',
  borderRadius: '0.25rem',
  boxSizing: 'border-box',
};

const AddHotel: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [address, setAddress] = useState('');
  const [pricePerNight, setPricePerNight] = useState('100');
  const [currency, setCurrency] = useState('USD');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch('/api/v1/admin/branches', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        city,
        province,
        address,
        pricePerNight: Number(pricePerNight),
        currency: currency.toUpperCase(),
      }),
    });
    setLoading(false);
    if (!response.ok) {
      setError(await parseApiError(response));
      return;
    }
    navigate('/admin/hotels');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '520px', margin: '0 auto' }}>
      <p><Link to="/admin/hotels">← Branches</Link></p>
      <h1>Add branch</h1>
      <form onSubmit={(event) => void handleSubmit(event)} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <label>Name<input required value={name} onChange={(event) => setName(event.target.value)} style={fieldStyle} /></label>
        <label>City<input required value={city} onChange={(event) => setCity(event.target.value)} style={fieldStyle} /></label>
        <label>Province<input required value={province} onChange={(event) => setProvince(event.target.value)} style={fieldStyle} /></label>
        <label>Address<input required value={address} onChange={(event) => setAddress(event.target.value)} style={fieldStyle} /></label>
        <label>Price per night<input required type="number" min={0} step="0.01" value={pricePerNight} onChange={(event) => setPricePerNight(event.target.value)} style={fieldStyle} /></label>
        <label>Currency<input required maxLength={3} value={currency} onChange={(event) => setCurrency(event.target.value)} style={fieldStyle} /></label>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: '0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem' }}>
          {loading ? 'Saving...' : 'Create branch'}
        </button>
      </form>
    </div>
  );
};

export default AddHotel;
