import React, { useState, useEffect } from 'react';

interface RoomImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
}

interface RoomAmenities {
  bathroom?: string[];
  view?: string[];
  facilities?: string[];
  bedding?: string[];
  general?: string[];
}

interface Room {
  id: string;
  branch_id: string;
  room_type: string;
  description: string | null;
  capacity: number;
  size_sqm: number | null;
  bed_types: string | null;
  rating: number | null;
  review_count: number | null;
  price: string;
  currency: string;
  images: RoomImage[];
  amenities: RoomAmenities;
}

interface RoomDetailsModalProps {
  roomId: string | null;
  onClose: () => void;
  onBook: (room: Room) => void;
  canBook?: boolean;
}

const RoomDetailsModal: React.FC<RoomDetailsModalProps> = ({ roomId, onClose, onBook, canBook = true }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setError(null);
      return;
    }

    const fetchRoomDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/v1/rooms/${roomId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch room details');
        }
        const data = await response.json();
        setRoom(data.room);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchRoomDetails();
  }, [roomId]);

  if (!roomId) return null;
  if (loading) return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          padding: '2rem',
          fontFamily: "'Courier New', Courier, monospace",
        }}
      >
        Loading room details...
      </div>
    </div>
  );
  if (error) return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          padding: '2rem',
          color: 'red',
          fontFamily: "'Courier New', Courier, monospace",
        }}
      >
        Error: {error}
      </div>
    </div>
  );
  if (!room) return null;

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? room.images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === room.images.length - 1 ? 0 : prev + 1));
  };

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index);
  };

  const currentImage = room.images[currentImageIndex];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '2rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Left side - Image Gallery */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontSize: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            ×
          </button>
          
          <div style={{ position: 'relative', flex: 1, minHeight: '300px', marginBottom: '1rem' }}>
            {currentImage && (
              <img
                src={currentImage.image_url}
                alt={currentImage.alt_text || room.room_type}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '0.5rem',
                }}
              />
            )}
            {room.images.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  style={{
                    position: 'absolute',
                    left: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    display: 'flex',
                  }}
                >
                  ←
                </button>
                <button
                  onClick={handleNextImage}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    display: 'flex',
                  }}
                >
                  →
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {room.images.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {room.images.map((image, index) => (
                <img
                  key={image.id}
                  src={image.image_url}
                  alt={image.alt_text || `Room image ${index + 1}`}
                  onClick={() => handleImageClick(index)}
                  style={{
                    width: '60px',
                    height: '60px',
                    objectFit: 'cover',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    border: index === currentImageIndex ? '2px solid #3b82f6' : '2px solid transparent',
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right side - Room Details */}
        <div
          style={{
            flex: 1,
            padding: '1.5rem',
            borderLeft: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            maxHeight: '90vh',
          }}
        >
          <h2 style={{ fontFamily: "'Courier New', Courier, monospace", margin: '0 0 1rem 0' }}>
            {room.room_type}
          </h2>

          {/* Feature Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            {room.size_sqm && (
              <span style={{ fontSize: '0.875rem', color: '#666', fontFamily: "'Courier New', Courier, monospace" }}>
                {room.size_sqm} m²
              </span>
            )}
            {room.amenities.facilities?.includes('Balcony') && (
              <span style={{ fontSize: '0.875rem', color: '#666', fontFamily: "'Courier New', Courier, monospace" }}>
                Balcony
              </span>
            )}
            {room.amenities.view && room.amenities.view.length > 0 && room.amenities.view.map((view) => (
              <span key={view} style={{ fontSize: '0.875rem', color: '#666', fontFamily: "'Courier New', Courier, monospace" }}>
                {view}
              </span>
            ))}
            {room.amenities.facilities?.includes('Air conditioning') && (
              <span style={{ fontSize: '0.875rem', color: '#666', fontFamily: "'Courier New', Courier, monospace" }}>
                Air conditioning
              </span>
            )}
            {room.amenities.bathroom && room.amenities.bathroom.length > 0 && (
              <span style={{ fontSize: '0.875rem', color: '#666', fontFamily: "'Courier New', Courier, monospace" }}>
                Private bathroom
              </span>
            )}
            {room.amenities.general?.includes('Free Wifi') && (
              <span style={{ fontSize: '0.875rem', color: '#666', fontFamily: "'Courier New', Courier, monospace" }}>
                Free Wifi
              </span>
            )}
            {room.amenities.facilities?.includes('Flat-screen TV') && (
              <span style={{ fontSize: '0.875rem', color: '#666', fontFamily: "'Courier New', Courier, monospace" }}>
                Flat-screen TV
              </span>
            )}
          </div>

          {/* Size */}
          {room.size_sqm && (
            <p style={{ margin: '0.5rem 0', fontFamily: "'Courier New', Courier, monospace" }}>
              Size {room.size_sqm} m²
            </p>
          )}

          {/* Bed Types */}
          {room.bed_types && (
            <p style={{ margin: '0.5rem 0', color: '#666', fontFamily: "'Courier New', Courier, monospace" }}>
              {room.bed_types}
            </p>
          )}

          {/* Rating */}
          {room.rating && (
            <p style={{ margin: '0.5rem 0', color: '#b45309', fontFamily: "'Courier New', Courier, monospace" }}>
              {room.rating} - Based on {room.review_count || 0} reviews
            </p>
          )}

          {/* Description */}
          {room.description && (
            <p style={{ margin: '1rem 0', color: '#666', lineHeight: '1.5', fontFamily: "'Courier New', Courier, monospace" }}>
              {room.description}
            </p>
          )}

          {/* Grouped Amenities */}
          <div style={{ marginTop: '1.5rem' }}>
            {room.amenities.bathroom && room.amenities.bathroom.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontFamily: "'Courier New', Courier, monospace", margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>
                  In your private bathroom
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                  {room.amenities.bathroom.map((amenity) => (
                    <div key={amenity} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontFamily: "'Courier New', Courier, monospace" }}>
                      <span style={{ color: '#10b981' }}>✓</span> {amenity}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {room.amenities.view && room.amenities.view.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontFamily: "'Courier New', Courier, monospace", margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>
                  View
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                  {room.amenities.view.map((amenity) => (
                    <div key={amenity} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontFamily: "'Courier New', Courier, monospace" }}>
                      <span style={{ color: '#10b981' }}>✓</span> {amenity}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {room.amenities.facilities && room.amenities.facilities.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontFamily: "'Courier New', Courier, monospace", margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>
                  Facilities
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                  {room.amenities.facilities.map((amenity) => (
                    <div key={amenity} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontFamily: "'Courier New', Courier, monospace" }}>
                      <span style={{ color: '#10b981' }}>✓</span> {amenity}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Book Button */}
          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
            <button
              type="button"
              onClick={() => onBook(room)}
              disabled={!canBook}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: canBook ? '#3b82f6' : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: canBook ? 'pointer' : 'not-allowed',
                fontSize: '1rem',
                fontWeight: '600',
                fontFamily: "'Courier New', Courier, monospace",
              }}
            >
              {canBook ? `Book now · ${room.currency} ${room.price}/night` : 'Unavailable for these dates'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomDetailsModal;
