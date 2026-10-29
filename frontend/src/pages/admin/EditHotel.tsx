import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { parseApiError, readJson } from '../../services/api';
import Loading from '../../components/Loading';

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid #ddd',
  borderRadius: '0.25rem',
  boxSizing: 'border-box',
};

interface ManagedBranch {
  id: string;
  name: string;
  city: string;
  province: string;
  address: string;
  description: string | null;
  price_per_night: string;
  currency: string;
  publication_status?: string;
}

const EditHotel: React.FC = () => {
  const { branchId } = useParams<{ branchId: string }>();
  const [branch, setBranch] = useState<ManagedBranch | null>(null);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [pricePerNight, setPricePerNight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/v1/branches/managed', { credentials: 'include' });
      if (!response.ok) {
        setError(await parseApiError(response));
        setLoading(false);
        return;
      }
      const data = await readJson<{ branches: ManagedBranch[] }>(response);
      const match = (data?.branches || []).find((item) => String(item.id) === String(branchId));
      if (!match) {
        setError('Branch not found or you cannot manage it.');
        setLoading(false);
        return;
      }
      setBranch(match);
      setName(match.name);
      setCity(match.city);
      setProvince(match.province);
      setAddress(match.address);
      setDescription(match.description || '');
      setPricePerNight(String(match.price_per_night));
      setLoading(false);
    };
    void load();
  }, [branchId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!branchId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/v1/branches/${branchId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        city,
        province,
        address,
        description: description || null,
        pricePerNight: Number(pricePerNight),
      }),
    });
    setSaving(false);
    if (!response.ok) {
      setError(await parseApiError(response));
      return;
    }
    setMessage('Branch updated.');
  };

  if (loading) return <Loading message="Loading branch..." />;

  return (
    <div style={{ padding: '2rem', maxWidth: '520px', margin: '0 auto' }}>
      <p><Link to="/admin/hotels">← Branches</Link></p>
      <h1>Edit branch</h1>
      {branch?.publication_status && <p style={{ color: '#666' }}>Status: {branch.publication_status}</p>}
      <form onSubmit={(event) => void handleSubmit(event)} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <label>Name<input required value={name} onChange={(event) => setName(event.target.value)} style={fieldStyle} /></label>
        <label>City<input required value={city} onChange={(event) => setCity(event.target.value)} style={fieldStyle} /></label>
        <label>Province<input required value={province} onChange={(event) => setProvince(event.target.value)} style={fieldStyle} /></label>
        <label>Address<input required value={address} onChange={(event) => setAddress(event.target.value)} style={fieldStyle} /></label>
        <label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} style={{ ...fieldStyle, minHeight: '6rem' }} /></label>
        <label>Price per night<input required type="number" min={0} step="0.01" value={pricePerNight} onChange={(event) => setPricePerNight(event.target.value)} style={fieldStyle} /></label>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {message && <p style={{ color: '#047857' }}>{message}</p>}
        <button type="submit" disabled={saving} style={{ padding: '0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem' }}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </div>
  );
};

export default EditHotel;
