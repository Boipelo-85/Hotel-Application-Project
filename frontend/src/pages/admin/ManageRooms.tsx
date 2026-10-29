import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { parseApiError, readJson } from '../../services/api';
import Loading from '../../components/Loading';

interface ManagedBranch {
  id: string;
  name: string;
}

interface Room {
  id: string;
  room_type: string;
  capacity: number;
  quantity?: number;
  price?: string;
  price_per_night?: string;
  currency: string;
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid #ddd',
  borderRadius: '0.25rem',
  boxSizing: 'border-box',
};

const ManageRooms: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [branches, setBranches] = useState<ManagedBranch[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [branchId, setBranchId] = useState(searchParams.get('branchId') || '');
  const [roomType, setRoomType] = useState('Standard');
  const [capacity, setCapacity] = useState('2');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('100');
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
    const loadRooms = async () => {
      const response = await fetch(`/api/v1/branches/${branchId}/rooms`);
      if (!response.ok) {
        setError(await parseApiError(response));
        return;
      }
      const data = await readJson<{ rooms: Room[] }>(response);
      setRooms(data?.rooms || []);
    };
    void loadRooms();
  }, [branchId]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const response = await fetch(`/api/v1/admin/branches/${branchId}/rooms`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomType,
        capacity: Number(capacity),
        quantity: Number(quantity),
        price: Number(price),
      }),
    });
    if (!response.ok) {
      setError(await parseApiError(response));
      return;
    }
    const refresh = await fetch(`/api/v1/branches/${branchId}/rooms`);
    const data = await readJson<{ rooms: Room[] }>(refresh);
    setRooms(data?.rooms || []);
  };

  if (loading) return <Loading message="Loading rooms..." />;

  return (
    <div style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
      <p><Link to="/admin">← Dashboard</Link></p>
      <h1>Manage rooms</h1>
      <label>
        Branch
        <select
          value={branchId}
          onChange={(event) => {
            setBranchId(event.target.value);
            setSearchParams({ branchId: event.target.value });
          }}
          style={fieldStyle}
        >
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>
      </label>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {rooms.map((room) => (
          <li key={room.id} style={{ marginBottom: '0.5rem' }}>
            {room.room_type} · sleeps {room.capacity} · {room.currency} {room.price || room.price_per_night}
          </li>
        ))}
      </ul>
      <h2>Add room type</h2>
      <form onSubmit={(event) => void handleCreate(event)} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <label>Type<input required value={roomType} onChange={(event) => setRoomType(event.target.value)} style={fieldStyle} /></label>
        <label>Capacity<input required type="number" min={1} value={capacity} onChange={(event) => setCapacity(event.target.value)} style={fieldStyle} /></label>
        <label>Quantity<input required type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} style={fieldStyle} /></label>
        <label>Price<input required type="number" min={0} step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} style={fieldStyle} /></label>
        <button type="submit" style={{ padding: '0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem' }}>
          Add room
        </button>
      </form>
    </div>
  );
};

export default ManageRooms;
