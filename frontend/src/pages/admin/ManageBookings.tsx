import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { parseApiError, readJson } from '../../services/api';
import Loading from '../../components/Loading';

interface ManagedBranch {
  id: string;
  name: string;
}

interface BranchBooking {
  id: string;
  booking_reference: string;
  check_in: string;
  check_out: string;
  status: string;
  total_amount: string;
  currency: string;
}

const ManageBookings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [branches, setBranches] = useState<ManagedBranch[]>([]);
  const [bookings, setBookings] = useState<BranchBooking[]>([]);
  const [branchId, setBranchId] = useState(searchParams.get('branchId') || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBranches = async () => {
      const response = await fetch('/api/v1/branches/managed', { credentials: 'include' });
      if (!response.ok) {
        setError(await parseApiError(response));
        setLoading(false);
        return;
      }
      const data = await readJson<{ branches: ManagedBranch[] }>(response);
      const list = data?.branches || [];
      setBranches(list);
      if (!branchId && list[0]) {
        setBranchId(String(list[0].id));
        setSearchParams({ branchId: String(list[0].id) });
      }
      setLoading(false);
    };
    void loadBranches();
  }, [branchId, setSearchParams]);

  useEffect(() => {
    if (!branchId) return;
    const loadBookings = async () => {
      const response = await fetch(`/api/v1/branches/${branchId}/bookings`, { credentials: 'include' });
      if (!response.ok) {
        setError(await parseApiError(response));
        return;
      }
      const data = await readJson<{ bookings: BranchBooking[] }>(response);
      setBookings(data?.bookings || []);
    };
    void loadBookings();
  }, [branchId]);

  const updateStatus = async (bookingId: string, status: 'confirmed' | 'cancelled' | 'completed') => {
    setError(null);
    const response = await fetch(`/api/v1/admin/bookings/${bookingId}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      setError(await parseApiError(response));
      return;
    }
    setBookings((current) => current.map((booking) => (
      booking.id === bookingId ? { ...booking, status } : booking
    )));
  };

  if (loading) return <Loading message="Loading bookings..." />;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <p><Link to="/admin">← Dashboard</Link></p>
      <h1>Manage bookings</h1>
      <label>
        Branch
        <select
          value={branchId}
          onChange={(event) => {
            setBranchId(event.target.value);
            setSearchParams({ branchId: event.target.value });
          }}
          style={{ display: 'block', marginTop: '0.35rem', padding: '0.5rem' }}
        >
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>
      </label>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {bookings.length === 0 ? (
        <p>No bookings for this branch.</p>
      ) : (
        <ul>
          {bookings.map((booking) => (
            <li key={booking.id} style={{ margin: '1rem 0', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', backgroundColor: 'white' }}>
              <strong>{booking.booking_reference}</strong> · {booking.status}
              <div>{new Date(booking.check_in).toLocaleDateString()} → {new Date(booking.check_out).toLocaleDateString()}</div>
              <div>{booking.currency} {booking.total_amount}</div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => void updateStatus(booking.id, 'confirmed')}>Confirm</button>
                <button type="button" onClick={() => void updateStatus(booking.id, 'completed')}>Complete</button>
                <button type="button" onClick={() => void updateStatus(booking.id, 'cancelled')}>Cancel</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ManageBookings;
