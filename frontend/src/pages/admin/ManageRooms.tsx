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
  description?: string;
  images?: Array<{ id: string; url: string; altText?: string }>;
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
  const [description, setDescription] = useState('');
  const [roomImageFile, setRoomImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

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
        description,
      }),
    });
    if (!response.ok) {
      setError(await parseApiError(response));
      return;
    }

    const data = await response.json();
    const roomId = data.room.id;

    if (roomId && roomImageFile) {
      const formData = new FormData();
      formData.append('image', roomImageFile);
      formData.append('altText', `${roomType} room image`);
      formData.append('displayOrder', '0');

      const imageResponse = await fetch(`/api/v1/admin/rooms/${roomId}/upload-image`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!imageResponse.ok) {
        setError('Room created but image upload failed: ' + await parseApiError(imageResponse));
        return;
      }
    }

    const refresh = await fetch(`/api/v1/branches/${branchId}/rooms`);
    const refreshData = await readJson<{ rooms: Room[] }>(refresh);
    setRooms(refreshData?.rooms || []);
    setDescription('');
    setRoomImageFile(null);
  };

  if (loading) return <Loading message="Loading rooms..." />;

  const roomCardStyle: React.CSSProperties = {
    border: '1px solid #e5e7eb',
    borderRadius: '0.75rem',
    overflow: 'hidden',
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: 'box-shadow 0.2s',
    cursor: 'pointer',
  };

  const roomImageStyle: React.CSSProperties = {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    backgroundColor: '#f3f4f6',
  };

  const roomContentStyle: React.CSSProperties = {
    padding: '1rem',
  };

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalContentStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '0.75rem',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    padding: '2rem',
    position: 'relative',
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
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
      {error && <p style={{ color: 'red', backgroundColor: '#fee', padding: '0.75rem', borderRadius: '0.25rem' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
        {rooms.map((room) => (
          <div
            key={room.id}
            style={roomCardStyle}
            onClick={() => setSelectedRoom(room)}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.15)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'}
          >
            <div style={roomImageStyle}>
              {room.images && room.images.length > 0 ? (
                <img
                  src={room.images[0].url}
                  alt={room.images[0].altText || room.room_type}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                  No image
                </div>
              )}
            </div>
            <div style={roomContentStyle}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#1f2937' }}>{room.room_type}</h3>
              <p style={{ margin: '0.25rem 0', color: '#6b7280', fontSize: '0.9rem' }}>
                Sleeps {room.capacity} guests
              </p>
              <p style={{ margin: '0.25rem 0', color: '#6b7280', fontSize: '0.9rem' }}>
                {room.quantity || 1} available
              </p>
              <p style={{ margin: '0.5rem 0 0 0', color: '#059669', fontSize: '1.2rem', fontWeight: 'bold' }}>
                {room.currency} {room.price || room.price_per_night}
                <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#6b7280' }}> / night</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {rooms.length === 0 && (
        <p style={{ color: '#6b7280', marginTop: '2rem' }}>No rooms found for this branch.</p>
      )}

      <div style={{ marginTop: '3rem', borderTop: '1px solid #e5e7eb', paddingTop: '2rem' }}>
        <h2>Add room type</h2>
        <form onSubmit={(event) => void handleCreate(event)} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '500px' }}>
          <label>Type<input required value={roomType} onChange={(event) => setRoomType(event.target.value)} style={fieldStyle} /></label>
          <label>Capacity<input required type="number" min={1} value={capacity} onChange={(event) => setCapacity(event.target.value)} style={fieldStyle} /></label>
          <label>Quantity<input required type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} style={fieldStyle} /></label>
          <label>Price<input required type="number" min={0} step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} style={fieldStyle} /></label>
          <label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} style={fieldStyle} rows={3} placeholder="Room amenities, appliances, and features..." /></label>
          <label>Room Image
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setRoomImageFile(file);
              }}
              style={fieldStyle}
            />
          </label>
          <button type="submit" style={{ padding: '0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>
            Add room
          </button>
        </form>
      </div>

      {selectedRoom && (
        <div style={modalStyle} onClick={() => setSelectedRoom(null)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedRoom(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '0.25rem',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
            <h2 style={{ marginTop: 0 }}>{selectedRoom.room_type}</h2>
            {selectedRoom.images && selectedRoom.images.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {selectedRoom.images.map((image) => (
                  <img
                    key={image.id}
                    src={image.url}
                    alt={image.altText || selectedRoom.room_type}
                    style={{ width: '100%', borderRadius: '0.5rem' }}
                  />
                ))}
              </div>
            )}
            <p><strong>Capacity:</strong> {selectedRoom.capacity} guests</p>
            <p><strong>Quantity:</strong> {selectedRoom.quantity || 1}</p>
            <p><strong>Price:</strong> {selectedRoom.currency} {selectedRoom.price || selectedRoom.price_per_night} / night</p>
            {selectedRoom.description && (
              <div style={{ marginTop: '1rem' }}>
                <strong>Description:</strong>
                <p style={{ marginTop: '0.5rem', lineHeight: '1.6' }}>{selectedRoom.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageRooms;
