import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { parseApiError, readJson } from '../../services/api';
import Loading from '../../components/Loading';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux/store';

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
  guests: number;
  quantity: number;
  created_at: string;
  branch_name?: string;
  user_name?: string | null;
  user_email?: string | null;
  user_phone?: string | null;
  room_type?: string;
}

const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'] as const;

const ManageBookings: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const isAdmin = user?.role === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();
  const [branches, setBranches] = useState<ManagedBranch[]>([]);
  const [bookings, setBookings] = useState<BranchBooking[]>([]);
  const [branchId, setBranchId] = useState(searchParams.get('branchId') || '');
  const requestedStatus = searchParams.get('status') || '';
  const [statusFilter, setStatusFilter] = useState(
    BOOKING_STATUSES.includes(requestedStatus as (typeof BOOKING_STATUSES)[number]) ? requestedStatus : '',
  );
  const [searchQuery, setSearchQuery] = useState('');
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
      if (!branchId && list[0] && !isAdmin) {
        setBranchId(String(list[0].id));
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('branchId', String(list[0].id));
        setSearchParams(nextParams);
      }
      setLoading(false);
    };
    void loadBranches();
  }, [branchId, isAdmin, searchParams, setSearchParams]);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        let url: string;
        if (isAdmin) {
          const params = new URLSearchParams();
          if (branchId) params.set('branchId', branchId);
          if (statusFilter) params.set('status', statusFilter);
          url = `/api/v1/admin/bookings${params.size ? `?${params.toString()}` : ''}`;
        } else {
          if (!branchId) return;
          url = `/api/v1/branches/${branchId}/bookings`;
        }
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) {
          setError(await parseApiError(response));
          return;
        }
        const data = await readJson<{ bookings: BranchBooking[] }>(response);
        setBookings(data?.bookings || []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load bookings');
      }
    };
    void loadBookings();
  }, [branchId, isAdmin, statusFilter]);

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

  const filteredBookings = bookings.filter((booking) => {
    if (statusFilter && booking.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        booking.booking_reference.toLowerCase().includes(query) ||
        booking.user_name?.toLowerCase().includes(query) ||
        booking.user_email?.toLowerCase().includes(query)
      );
    }
    return true;
  });

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
            const nextParams = new URLSearchParams(searchParams);
            if (event.target.value) nextParams.set('branchId', event.target.value);
            else nextParams.delete('branchId');
            setSearchParams(nextParams);
          }}
          style={{ display: 'block', marginTop: '0.35rem', padding: '0.5rem' }}
        >
          {isAdmin && <option value="">All branches</option>}
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>
      </label>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <label>
          Status
          <select
            value={statusFilter}
            onChange={(e) => {
              const nextStatus = e.target.value;
              setStatusFilter(nextStatus);
              const nextParams = new URLSearchParams(searchParams);
              if (nextStatus) nextParams.set('status', nextStatus);
              else nextParams.delete('status');
              setSearchParams(nextParams);
            }}
            style={{ display: 'block', marginTop: '0.35rem', padding: '0.5rem' }}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label>
          Search
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Reference, name, or email"
            style={{ display: 'block', marginTop: '0.35rem', padding: '0.5rem', minWidth: '200px' }}
          />
        </label>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {filteredBookings.length === 0 ? (
        <p>No bookings match the current filters.</p>
      ) : (
        <ul>
          {filteredBookings.map((booking) => (
            <li key={booking.id} style={{ margin: '1rem 0', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', backgroundColor: 'white' }}>
              <strong>{booking.booking_reference}</strong> · {booking.status}
              {booking.branch_name && <div>Branch: {booking.branch_name}</div>}
              {booking.room_type && <div>Room: {booking.room_type}</div>}
              <div>Guest: {booking.user_name || 'Guest checkout'}</div>
              {booking.user_email && <div>Email: <a href={`mailto:${booking.user_email}`}>{booking.user_email}</a></div>}
              {booking.user_phone && <div>Phone: <a href={`tel:${booking.user_phone}`}>{booking.user_phone}</a></div>}
              <div>Stay: {new Date(`${booking.check_in}T00:00:00`).toLocaleDateString()} → {new Date(`${booking.check_out}T00:00:00`).toLocaleDateString()}</div>
              <div>Guests: {booking.guests} · Rooms: {booking.quantity}</div>
              <div>Total: {booking.currency} {booking.total_amount}</div>
              <div>Booked: {new Date(booking.created_at).toLocaleString()}</div>
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
