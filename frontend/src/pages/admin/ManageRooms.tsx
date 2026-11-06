import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { parseApiError, readJson } from '../../services/api';
import Loading from '../../components/Loading';
import PhotoEditor, { type EditablePhoto } from '../../components/PhotoEditor';

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
  images?: EditablePhoto[];
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
  const branchId = searchParams.get('branchId') || '';
  const [roomType, setRoomType] = useState('Standard');
  const [capacity, setCapacity] = useState('2');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('100');
  const [description, setDescription] = useState('');
  const [roomImageFile, setRoomImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [editingRoom, setEditingRoom] = useState(false);
  const [editForm, setEditForm] = useState({
    roomType: '',
    capacity: '',
    quantity: '',
    price: '',
    description: '',
  });
  const roomImageInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!success) return;
    const timeout = window.setTimeout(() => setSuccess(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [success]);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const response = await fetch('/api/v1/branches/managed', { credentials: 'include' });
        if (!response.ok) {
          setError(await parseApiError(response));
          return;
        }
        const data = await readJson<{ branches: ManagedBranch[] }>(response);
        const list = data?.branches || [];
        setBranches(list);
        if (!branchId && list[0]) {
          setSearchParams({ branchId: String(list[0].id) }, { replace: true });
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load branches');
      } finally {
        setLoading(false);
      }
    };
    void loadBranches();
  }, [branchId, setSearchParams]);

  useEffect(() => {
    if (!branchId) return;
    const loadRooms = async () => {
      try {
        const response = await fetch(`/api/v1/branches/${branchId}/rooms`);
        if (!response.ok) {
          setError(await parseApiError(response));
          return;
        }
        const data = await readJson<{ rooms: Room[] }>(response);
        setRooms(data?.rooms || []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load rooms');
      }
    };
    void loadRooms();
  }, [branchId]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    let createdRoom: Room | null = null;
    let followUpError: string | null = null;

    try {
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

      const data = await readJson<{ room: Room }>(response);
      if (!data?.room?.id) {
        throw new Error('The server did not return the created room');
      }
      const newRoom = data.room;
      createdRoom = newRoom;
      setRooms((currentRooms) => [newRoom, ...currentRooms.filter((room) => room.id !== newRoom.id)]);

      if (roomImageFile) {
        const formData = new FormData();
        formData.append('image', roomImageFile);
        formData.append('altText', `${roomType} room image`);
        formData.append('displayOrder', '0');

        try {
          const imageResponse = await fetch(`/api/v1/admin/rooms/${createdRoom.id}/upload-image`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });
          if (!imageResponse.ok) {
            followUpError = `Room was added, but its image could not be uploaded: ${await parseApiError(imageResponse)}`;
          }
        } catch (uploadError) {
          followUpError = `Room was added, but its image could not be uploaded: ${
            uploadError instanceof Error ? uploadError.message : 'Upload failed'
          }`;
        }
      }

      try {
        const refresh = await fetch(`/api/v1/branches/${branchId}/rooms`);
        if (!refresh.ok) {
          followUpError ??= `Room was added, but the room list could not be refreshed: ${await parseApiError(refresh)}`;
        } else {
          const refreshData = await readJson<{ rooms: Room[] }>(refresh);
          setRooms(refreshData?.rooms || []);
        }
      } catch (refreshError) {
        followUpError ??= `Room was added, but the room list could not be refreshed: ${
          refreshError instanceof Error ? refreshError.message : 'Refresh failed'
        }`;
      }

      setSuccess(`${createdRoom.room_type} room added successfully.`);
      if (followUpError) setError(followUpError);
      setDescription('');
      setRoomImageFile(null);
      if (roomImageInput.current) roomImageInput.current.value = '';
    } catch (createError) {
      setError(
        createdRoom
          ? `${createdRoom.room_type} room was added, but a follow-up step failed: ${
              createError instanceof Error ? createError.message : 'Please refresh the room list'
            }`
          : createError instanceof Error
            ? createError.message
            : 'Failed to add room',
      );
      if (createdRoom) setSuccess(`${createdRoom.room_type} room added successfully.`);
    } finally {
      setSaving(false);
    }
  };

  const startEditingRoom = (room: Room) => {
    setSelectedRoom(room);
    setEditingRoom(true);
    setEditForm({
      roomType: room.room_type,
      capacity: String(room.capacity),
      quantity: String(room.quantity ?? 1),
      price: String(room.price ?? room.price_per_night ?? 0),
      description: room.description ?? '',
    });
    setError(null);
  };

  const handleUpdateRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRoom) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/admin/rooms/${selectedRoom.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomType: editForm.roomType,
          capacity: Number(editForm.capacity),
          quantity: Number(editForm.quantity),
          price: Number(editForm.price),
          description: editForm.description,
        }),
      });
      if (!response.ok) {
        setError(await parseApiError(response));
        return;
      }

      const data = await readJson<{ room: Room }>(response);
      if (!data?.room) throw new Error('The server did not return the updated room');
      const updatedRoom = { ...selectedRoom, ...data.room };
      setRooms((currentRooms) =>
        currentRooms.map((room) => room.id === updatedRoom.id ? updatedRoom : room),
      );
      setSelectedRoom(null);
      setEditingRoom(false);
      setSuccess(`${updatedRoom.room_type} room updated successfully.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update room');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;
    const room = roomToDelete;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/admin/rooms/${room.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        setError(await parseApiError(response));
        return;
      }

      setRooms((currentRooms) => currentRooms.filter((currentRoom) => currentRoom.id !== room.id));
      setSelectedRoom(null);
      setRoomToDelete(null);
      setEditingRoom(false);
      setSuccess(`${room.room_type} room removed successfully.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to remove room');
    } finally {
      setSaving(false);
    }
  };

  const closeRoomModal = () => {
    setSelectedRoom(null);
    setEditingRoom(false);
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
      {success && (
        <p
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            zIndex: 1100,
            margin: 0,
            padding: '1rem 1.25rem',
            borderRadius: '0.5rem',
            backgroundColor: '#065f46',
            color: 'white',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          }}
        >
          {success}
        </p>
      )}

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
                  src={room.images[0].image_url}
                  alt={room.images[0].alt_text || room.room_type}
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
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    startEditingRoom(room);
                  }}
                  style={{ flex: 1, padding: '0.5rem', border: '1px solid #2563eb', borderRadius: '0.25rem', color: '#2563eb', background: 'white', cursor: 'pointer' }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={(event) => {
                    event.stopPropagation();
                    setRoomToDelete(room);
                  }}
                  style={{ flex: 1, padding: '0.5rem', border: '1px solid #dc2626', borderRadius: '0.25rem', color: '#dc2626', background: 'white', cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  Remove
                </button>
              </div>
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
              ref={roomImageInput}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setRoomImageFile(file);
              }}
              style={fieldStyle}
            />
          </label>
          <button type="submit" disabled={saving || !branchId} style={{ padding: '0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: saving || !branchId ? 'not-allowed' : 'pointer', opacity: saving || !branchId ? 0.7 : 1 }}>
            {saving ? 'Adding room...' : 'Add room'}
          </button>
        </form>
      </div>

      {selectedRoom && (
        <div style={modalStyle} onClick={closeRoomModal}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={closeRoomModal}
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
            {error && (
              <p role="alert" style={{ color: '#991b1b', backgroundColor: '#fee2e2', padding: '0.75rem', borderRadius: '0.25rem', marginTop: '2.5rem' }}>
                {error}
              </p>
            )}
            {editingRoom ? (
              <>
                <h2 style={{ marginTop: 0 }}>Edit {selectedRoom.room_type}</h2>
                <form onSubmit={(event) => void handleUpdateRoom(event)} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <label>Type<input required maxLength={120} value={editForm.roomType} onChange={(event) => setEditForm({ ...editForm, roomType: event.target.value })} style={fieldStyle} /></label>
                  <label>Capacity<input required type="number" min={1} max={100} value={editForm.capacity} onChange={(event) => setEditForm({ ...editForm, capacity: event.target.value })} style={fieldStyle} /></label>
                  <label>Quantity<input required type="number" min={1} max={1000} value={editForm.quantity} onChange={(event) => setEditForm({ ...editForm, quantity: event.target.value })} style={fieldStyle} /></label>
                  <label>Price per night<input required type="number" min={0} max={1000000} step="0.01" value={editForm.price} onChange={(event) => setEditForm({ ...editForm, price: event.target.value })} style={fieldStyle} /></label>
                  <label>Description<textarea maxLength={5000} value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} style={fieldStyle} rows={3} /></label>
                  <PhotoEditor
                    key={selectedRoom.id}
                    label="Room"
                    apiPath={`/api/v1/admin/rooms/${selectedRoom.id}`}
                    roomDetailsUrl={`/api/v1/rooms/${selectedRoom.id}`}
                    onChange={(images) => {
                      const roomId = selectedRoom.id;
                      setRooms(current => current.map(room => room.id === roomId ? { ...room, images } : room));
                      setSelectedRoom(current => current?.id === roomId ? { ...current, images } : current);
                    }}
                  />
                  <button type="submit" disabled={saving} style={{ padding: '0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                  <button type="button" disabled={saving} onClick={() => setEditingRoom(false)} style={{ padding: '0.75rem', backgroundColor: '#f3f4f6', color: '#1f2937', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 style={{ marginTop: 0 }}>{selectedRoom.room_type}</h2>
                {selectedRoom.images && selectedRoom.images.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    {selectedRoom.images.map((image) => (
                      <img
                        key={image.id}
                        src={image.image_url}
                        alt={image.alt_text || selectedRoom.room_type}
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
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="button" onClick={() => startEditingRoom(selectedRoom)} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>
                    Edit room
                  </button>
                  <button type="button" disabled={saving} onClick={() => setRoomToDelete(selectedRoom)} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#111827', color: 'white', border: '1px solid #111827', borderRadius: '0.25rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
                    Remove room
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {roomToDelete && (
        <div
          style={{ ...modalStyle, zIndex: 1200, backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
          onClick={() => {
            if (!saving) setRoomToDelete(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-room-title"
            aria-describedby="delete-room-description"
            style={{
              ...modalContentStyle,
              width: 'min(100% - 2rem, 440px)',
              color: '#111827',
              border: '1px solid #111827',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-room-title" style={{ marginTop: 0 }}>Delete room?</h2>
            <p id="delete-room-description" style={{ lineHeight: 1.6 }}>
              Are you sure you want to delete this room?
            </p>
            <p style={{ color: '#4b5563' }}>
              <strong>{roomToDelete.room_type}</strong> will no longer be available for booking.
            </p>
            {error && (
              <p role="alert" style={{ color: '#111827', border: '1px solid #9ca3af', padding: '0.75rem', borderRadius: '0.25rem' }}>
                {error}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                disabled={saving}
                onClick={() => setRoomToDelete(null)}
                style={{ padding: '0.65rem 1rem', color: '#111827', backgroundColor: 'white', border: '1px solid #111827', borderRadius: '0.25rem', cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleDeleteRoom()}
                style={{ padding: '0.65rem 1rem', color: 'white', backgroundColor: '#111827', border: '1px solid #111827', borderRadius: '0.25rem', cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'Deleting...' : 'Yes, delete room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageRooms;
