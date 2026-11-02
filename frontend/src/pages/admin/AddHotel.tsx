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

const PROVINCES = [
  'Gauteng',
  'Limpopo',
  'Western Cape',
  'Eastern Cape',
  'KwaZulu-Natal',
  'Mpumalanga',
] as const;

const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
];

const AddHotel: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [address, setAddress] = useState('');
  const [pricePerNight, setPricePerNight] = useState('100');
  const [currency, setCurrency] = useState('USD');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageAltText, setImageAltText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fillSampleData = () => {
    const sampleCities = ['Johannesburg', 'Pretoria', 'Cape Town', 'Durban', 'Port Elizabeth', 'Nelspruit'];
    const randomCity = sampleCities[Math.floor(Math.random() * sampleCities.length)];
    const randomProvince = PROVINCES[Math.floor(Math.random() * PROVINCES.length)];

    setName(`Grand-Rest ${randomCity}`);
    setCity(randomCity);
    setProvince(randomProvince);
    setAddress(`${Math.floor(Math.random() * 999) + 1} Main Street, ${randomCity}`);
    setPricePerNight(String(Math.floor(Math.random() * 500) + 100));
    setCurrency('ZAR');
    setImageAltText(`Beautiful hotel in ${randomCity}, ${randomProvince}`);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!imageFile) {
      setError('Image file is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
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

      if (!response.ok) {
        setError(await parseApiError(response));
        return;
      }

      const data = await response.json();
      const branchId = data.branch.id;

      if (branchId && imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('altText', imageAltText.trim() || `${name} hotel image`);
        formData.append('displayOrder', '0');

        const imageResponse = await fetch(`/api/v1/admin/branches/${branchId}/upload-image`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!imageResponse.ok) {
          setError('Branch created but image upload failed: ' + await parseApiError(imageResponse));
          return;
        }
      }

      setSuccess(`Branch "${name}" created successfully! Redirecting to branches list...`);

      setTimeout(() => {
        navigate('/admin/hotels');
      }, 2000);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '520px', margin: '0 auto' }}>
      <p><Link to="/admin/hotels">← Branches</Link></p>
      <h1>Add branch</h1>
      <form onSubmit={(event) => void handleSubmit(event)} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <label>Name<input required value={name} onChange={(event) => setName(event.target.value)} style={fieldStyle} /></label>
        <label>City<input required value={city} onChange={(event) => setCity(event.target.value)} style={fieldStyle} /></label>
        <label>Province
          <select required value={province} onChange={(event) => setProvince(event.target.value)} style={fieldStyle}>
            <option value="">Select a province</option>
            {PROVINCES.map((prov) => (
              <option key={prov} value={prov}>{prov}</option>
            ))}
          </select>
        </label>
        <label>Address<input required value={address} onChange={(event) => setAddress(event.target.value)} style={fieldStyle} /></label>
        <label>Price per night<input required type="number" min={0} step="0.01" value={pricePerNight} onChange={(event) => setPricePerNight(event.target.value)} style={fieldStyle} /></label>
        <label>Currency<input required maxLength={3} value={currency} onChange={(event) => setCurrency(event.target.value)} style={fieldStyle} /></label>
        <label>Image (required)
          <input
            required
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              setImageFile(file);
            }}
            style={fieldStyle}
          />
        </label>
        <label>Image Alt Text<input value={imageAltText} onChange={(event) => setImageAltText(event.target.value)} placeholder="Description of the image" style={fieldStyle} /></label>
        {error && <p style={{ color: 'red', backgroundColor: '#fee', padding: '0.75rem', borderRadius: '0.25rem' }}>{error}</p>}
        {success && <p style={{ color: '#065f46', backgroundColor: '#d1fae5', padding: '0.75rem', borderRadius: '0.25rem' }}>{success}</p>}
        <button
          type="button"
          onClick={fillSampleData}
          style={{ padding: '0.5rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
        >
          Fill Sample Data
        </button>
        <button type="submit" disabled={loading} style={{ padding: '0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem',cursor: 'pointer'}}>
          {loading ? 'Saving...' : 'Create branch'}
        </button>
      </form>
    </div>
  );
};

export default AddHotel;
