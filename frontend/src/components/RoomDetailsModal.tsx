import React, { useState, useEffect } from 'react';
import bed_1 from '../assets/hotelPictures/bed_1.jpg';
import bed_2 from '../assets/hotelPictures/bed_2.jpg';
import bed_3 from '../assets/hotelPictures/bed_3.jpg';
import bed_4 from '../assets/hotelPictures/bed_4.jpg';
import est_2 from '../assets/hotelPictures/est_2.jpg';
import est_3 from '../assets/hotelPictures/est_3.jpg';
import est_4 from '../assets/hotelPictures/est_4.jpg';
import feature_1 from '../assets/hotelPictures/feature_1.jpg';
import feature_2 from '../assets/hotelPictures/feature_2.jpg';
import feature_3 from '../assets/hotelPictures/feature_3.jpg';
import feature_4 from '../assets/hotelPictures/feature_4.jpg';
import bath_2 from '../assets/hotelPictures/bath_2.jpg';
import bath_3 from '../assets/hotelPictures/bath_3.jpg';

const samplePhotos = [
  [bed_1, 'Bedroom 1'],
  [bed_2, 'Bedroom 2'],
  [bed_3, 'Bedroom 3'],
  [bed_4, 'Bedroom 4'],
  [est_2, 'Room interior 2'],
  [est_3, 'Room interior 3'],
  [est_4, 'Room interior 4'],
  [feature_1, 'Room feature 1'],
  [feature_2, 'Room feature 2'],
  [feature_3, 'Room feature 3'],
  [feature_4, 'Room feature 4'],
  [bath_2, 'Bathroom 2'],
  [bath_3, 'Bathroom 3'],
].map(([url, label]) => ({ url, label: `Example photo: ${label}` }));

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

  const photos = [
    ...(room.images ?? []).filter(image => image.image_url).map(image => ({
      url: image.image_url,
      label: image.alt_text || room.room_type,
    })),
    ...samplePhotos,
  ];

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev + photos.length - 1) % photos.length);
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % photos.length);
  };

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index);
  };

  const currentImage = photos[currentImageIndex] ?? photos[0];

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
        role="dialog"
        aria-modal="true"
        aria-label={room.room_type}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '85dvh',
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 310px), 1fr))',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Left side - Image Gallery */}
        <div style={{ minWidth: 0, padding: '1rem' }}>
          <button
            type="button"
            aria-label="Close room details"
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
          
          <div style={{ position: 'relative', height: 'clamp(160px, 34dvh, 300px)', marginBottom: '0.5rem' }}>
            {currentImage && (
              <img
                src={currentImage.url}
                alt={currentImage.label}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '0.5rem',
                }}
              />
            )}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
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
                  type="button"
                  aria-label="Next photo"
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
          {photos.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {photos.map((photo, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Show photo ${index + 1}: ${photo.label}`}
                  aria-pressed={index === currentImageIndex}
                  onClick={() => handleImageClick(index)}
                  style={{
                    width: '48px',
                    height: '48px',
                    padding: 0,
                    overflow: 'hidden',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    border: index === currentImageIndex ? '2px solid #3b82f6' : '2px solid transparent',
                    flexShrink: 0,
                  }}
                >
                  <img src={photo.url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
          <small>{currentImage.label}</small>
        </div>

        {/* Right side - Room Details */}
        <div
          style={{
            flex: 1,
            padding: '1rem',
            paddingTop: '2.75rem',
            borderLeft: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            maxHeight: '430px',
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
