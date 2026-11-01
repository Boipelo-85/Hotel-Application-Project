import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBranchById } from '../redux/hotelSlice';
import { fetchRooms } from '../redux/roomSlice';
import { fetchBranchReviews } from '../redux/reviewSlice';
import type { AppDispatch, RootState } from '../redux/store';
import Loading from '../components/Loading';
import FavouriteButton from '../components/FavouriteButton';
import ReviewList from '../components/ReviewList';
import ImageGallery from '../components/ImageGallery';
import Map from '../components/Map';
import ShareButton from '../components/ShareButton';
import RoomDetailsModal from '../components/RoomDetailsModal';

const HotelDetails: React.FC = () => {
  const { branchId } = useParams<{ branchId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { currentBranch, loading, error } = useSelector((state: RootState) => state.hotels);
  const rooms = useSelector((state: RootState) => state.rooms.rooms);
  const reviews = useSelector((state: RootState) => state.reviews.reviews);
  const roomsLoading = useSelector((state: RootState) => state.rooms.loading);
  const roomsError = useSelector((state: RootState) => state.rooms.error);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [localCheckIn, setLocalCheckIn] = useState('');
  const [localCheckOut, setLocalCheckOut] = useState('');
  const [localGuests, setLocalGuests] = useState('2');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const checkIn = searchParams.get('checkIn') || localCheckIn;
  const checkOut = searchParams.get('checkOut') || localCheckOut;
  const guests = searchParams.get('guests') || localGuests;
  const quantity = searchParams.get('rooms') || '1';

  useEffect(() => {
    if (!branchId) return;
    void dispatch(fetchBranchById(branchId));
    void dispatch(fetchBranchReviews(branchId));
  }, [dispatch, branchId]);

  useEffect(() => {
    if (!branchId) return;
    const params: Record<string, string> = {};
    if (checkIn) params.checkIn = checkIn;
    if (checkOut) params.checkOut = checkOut;
    if (guests) params.guests = guests;
    console.log('Fetching rooms for branch:', branchId, 'with params:', params);
    void dispatch(fetchRooms({ branchId, params }));
  }, [dispatch, branchId, checkIn, checkOut, guests]);

  const handleDateChange = () => {
    const newParams: Record<string, string> = {};
    if (localCheckIn) newParams.checkIn = localCheckIn;
    if (localCheckOut) newParams.checkOut = localCheckOut;
    if (localGuests) newParams.guests = localGuests;
    setSearchParams(newParams);
  };

  if (loading && !currentBranch) return <Loading message="Loading branch..." />;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;
  if (!currentBranch) return <div style={{ padding: '2rem' }}>Branch not found.</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
      <p>
        <Link 
          to={searchParams.toString() ? `/hotels?${searchParams.toString()}` : '/hotels'}
          style={{ color: '#3b82f6', textDecoration: 'none', fontFamily: "'Courier New', Courier, monospace" }}
        >
          ← Back to results
        </Link>
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'start' }}>
        <div>
          <h1>{currentBranch.name}</h1>
          {currentBranch.star_rating != null && (
            <p aria-label={`${currentBranch.star_rating} out of 5 stars`} style={{ color: '#b45309' }}>
              {'★'.repeat(Math.floor(Number(currentBranch.star_rating)))} {currentBranch.star_rating}/5
            </p>
          )}
          <p style={{ color: '#666' }}>
            {currentBranch.city}, {currentBranch.province}
          </p>
          <p style={{ color: '#666' }}>{currentBranch.address}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <ShareButton title={currentBranch.name} text={`Take a look at ${currentBranch.name} in ${currentBranch.city}.`} />
          {branchId && <FavouriteButton branchId={branchId} />}
        </div>
      </div>
      {currentBranch.description && <p style={{ marginTop: '1rem' }}>{currentBranch.description}</p>}
      <p style={{ fontWeight: 'bold', color: '#047857' }}>
        From {currentBranch.currency} {currentBranch.price_per_night}/night
      </p>
      {currentBranch.contact_email && (
        <p style={{ color: '#666' }}>
          {currentBranch.contact_email}
          {currentBranch.contact_phone ? ` · ${currentBranch.contact_phone}` : ''}
        </p>
      )}

      <ImageGallery images={currentBranch.images} name={currentBranch.name} />

      <h2 style={{ marginTop: '2rem' }}>Facilities</h2>
      {currentBranch.amenities.length > 0 ? (
        <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 2rem', paddingLeft: '1.25rem' }}>
          {currentBranch.amenities.map((amenity) => (
            <li key={amenity.id}>
              {amenity.name}{amenity.category ? ` · ${amenity.category}` : ''}
            </li>
          ))}
        </ul>
      ) : (
        <p>Facilities have not been listed yet.</p>
      )}

      <h2 style={{ marginTop: '2rem' }}>Policies</h2>
      {Object.keys(currentBranch.policies).length > 0 ? (
        <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem 1.5rem' }}>
          {Object.entries(currentBranch.policies).map(([name, value]) => (
            <div key={name}>
              <dt style={{ fontWeight: 600, textTransform: 'capitalize' }}>{name.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ')}</dt>
              <dd style={{ margin: '0.25rem 0 0', color: '#4b5563' }}>{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p>Policies have not been listed yet. Contact the branch for details.</p>
      )}

      <h2 style={{ marginTop: '2rem' }}>Location</h2>
      <Map
        name={currentBranch.name}
        address={`${currentBranch.address}, ${currentBranch.city}, ${currentBranch.province}`}
        latitude={currentBranch.latitude}
        longitude={currentBranch.longitude}
      />

      <h2 style={{ marginTop: '2rem', fontFamily: "'Courier New', Courier, monospace" }}>Available Rooms</h2>
      
      {roomsError && (
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '0.5rem', marginBottom: '1rem', fontFamily: "'Courier New', Courier, monospace" }}>
          Error loading rooms: {roomsError}
        </div>
      )}
      
      {roomsLoading && (
        <div style={{ padding: '1rem', color: '#666', fontFamily: "'Courier New', Courier, monospace" }}>
          Loading rooms...
        </div>
      )}
      
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '1.5rem', 
        flexWrap: 'wrap',
        padding: '1rem',
        backgroundColor: '#f9fafb',
        borderRadius: '0.5rem',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: "'Courier New', Courier, monospace" }}>Check-in</label>
          <input
            type="date"
            value={localCheckIn}
            onChange={(e) => setLocalCheckIn(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              fontFamily: "'Courier New', Courier, monospace",
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: "'Courier New', Courier, monospace" }}>Check-out</label>
          <input
            type="date"
            value={localCheckOut}
            onChange={(e) => setLocalCheckOut(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              fontFamily: "'Courier New', Courier, monospace",
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: "'Courier New', Courier, monospace" }}>Guests</label>
          <input
            type="number"
            min="1"
            value={localGuests}
            onChange={(e) => setLocalGuests(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              width: '80px',
              fontFamily: "'Courier New', Courier, monospace",
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleDateChange}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            alignSelf: 'flex-end',
            fontFamily: "'Courier New', Courier, monospace",
          }}
        >
          Update
        </button>
      </div>

      {rooms.length === 0 ? (
        <p style={{ fontFamily: "'Courier New', Courier, monospace" }}>No rooms listed for this branch yet.</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: viewMode === 'list' ? '#3b82f6' : '#e5e7eb',
                color: viewMode === 'list' ? 'white' : '#000',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontFamily: "'Courier New', Courier, monospace",
              }}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: viewMode === 'grid' ? '#3b82f6' : '#e5e7eb',
                color: viewMode === 'grid' ? 'white' : '#000',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontFamily: "'Courier New', Courier, monospace",
              }}
            >
              Grid
            </button>
          </div>
          <div
            style={{
              display: viewMode === 'grid' ? 'grid' : 'flex',
              gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'auto',
              gap: '1rem',
              flexDirection: viewMode === 'list' ? 'column' : 'row',
            }}
          >
            {rooms.map((room) => {
              const price = room.price || room.price_per_night;
              const totalPrice = room.total_price || (price ? parseFloat(price) * 1 : 0);
              const isAvailable = room.is_available !== false && (room.quantity_available ?? room.quantity ?? 1) > 0;
              const canAccommodate = room.can_accommodate_guests !== false;
              const quantityAvailable = room.quantity_available ?? room.quantity ?? 1;
              
              const params = new URLSearchParams({
                roomId: String(room.id),
                branchId: String(room.branch_id),
                guests,
                quantity,
              });
              if (checkIn) params.set('checkIn', checkIn);
              if (checkOut) params.set('checkOut', checkOut);
              
              // Get room amenities if available and group by category
              const amenitiesArray = room.amenities || [];
              const amenitiesByCategory = amenitiesArray.reduce((acc: any, amenity: any) => {
                if (!acc[amenity.category]) {
                  acc[amenity.category] = [];
                }
                acc[amenity.category].push(amenity.amenity_name);
                return acc;
              }, {});
              
              const features = [
                ...(amenitiesByCategory.facilities || []),
                ...(amenitiesByCategory.view || []),
                ...(amenitiesByCategory.general || [])
              ];
              const keyFeatures = features.slice(0, 4);
              
              return (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoomId(String(room.id))}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: isAvailable && canAccommodate ? 'white' : '#f9fafb',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                    {room.images && room.images.length > 0 ? (
                      <img
                        src={room.images[0].image_url}
                        alt={room.images[0].alt_text || room.room_type}
                        style={{
                          width: '120px',
                          height: '90px',
                          objectFit: 'cover',
                          borderRadius: '0.25rem',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '120px',
                          height: '90px',
                          backgroundColor: '#e5e7eb',
                          borderRadius: '0.25rem',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#6b7280',
                          fontSize: '0.75rem',
                          fontFamily: "'Courier New', Courier, monospace",
                        }}
                      >
                        No image
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontFamily: "'Courier New', Courier, monospace", margin: '0 0 0.25rem 0', fontSize: '1rem' }}>{room.room_type}</h3>
                      {room.size_sqm && (
                        <p style={{ color: '#666', fontSize: '0.875rem', margin: '0', fontFamily: "'Courier New', Courier, monospace" }}>
                          {room.size_sqm} m²
                        </p>
                      )}
                      {room.bed_types && (
                        <p style={{ color: '#666', fontSize: '0.875rem', margin: '0', fontFamily: "'Courier New', Courier, monospace" }}>
                          {room.bed_types}
                        </p>
                      )}
                      <p style={{ color: '#666', fontSize: '0.875rem', margin: '0.25rem 0 0', fontFamily: "'Courier New', Courier, monospace" }}>
                        Capacity: {room.capacity} guests
                      </p>
                    </div>
                  </div>
                  
                  {/* Key Features */}
                  {keyFeatures.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem' }}>
                      {keyFeatures.map((feature, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            backgroundColor: '#f3f4f6',
                            padding: '0.125rem 0.375rem',
                            borderRadius: '0.125rem',
                            fontFamily: "'Courier New', Courier, monospace",
                          }}
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div>
                        <p style={{ fontWeight: 'bold', color: '#10b981', margin: '0', fontFamily: "'Courier New', Courier, monospace" }}>
                          {room.currency} {price}/night
                        </p>
                        {checkIn && checkOut && (
                          <p style={{ fontWeight: 'bold', color: '#059669', margin: '0', fontSize: '0.875rem', fontFamily: "'Courier New', Courier, monospace" }}>
                            Total: {room.currency} {totalPrice.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <p style={{ 
                        color: quantityAvailable <= 2 ? '#dc2626' : '#10b981', 
                        fontSize: '0.875rem', 
                        margin: '0',
                        fontFamily: "'Courier New', Courier, monospace",
                        fontWeight: quantityAvailable <= 2 ? '600' : 'normal'
                      }}>
                        {quantityAvailable <= 2 ? `Only ${quantityAvailable} left` : `${quantityAvailable} available`}
                      </p>
                    </div>
                    
                    {!isAvailable && (
                      <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.5rem', fontFamily: "'Courier New', Courier, monospace" }}>
                        Not available for these dates
                      </p>
                    )}
                    {!canAccommodate && (
                      <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.5rem', fontFamily: "'Courier New', Courier, monospace" }}>
                        Cannot accommodate {guests} guests
                      </p>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isAvailable && canAccommodate) {
                          window.location.href = `/book?${params.toString()}`;
                        }
                      }}
                      disabled={!isAvailable || !canAccommodate}
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: isAvailable && canAccommodate ? '#3b82f6' : '#9ca3af',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: isAvailable && canAccommodate ? 'pointer' : 'not-allowed',
                        fontFamily: "'Courier New', Courier, monospace",
                        width: '100%',
                      }}
                    >
                      {isAvailable && canAccommodate ? 'Book now' : 'Not available'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <h2 style={{ marginTop: '2rem' }}>Reviews</h2>
      <ReviewList reviews={reviews || []} />

      {selectedRoomId && (
        <RoomDetailsModal
          roomId={selectedRoomId}
          onClose={() => setSelectedRoomId(null)}
          onBook={(room) => {
            const params = new URLSearchParams({
              roomId: String(room.id),
              branchId: branchId || String((room as any).branch_id),
              guests,
              quantity,
            });
            if (checkIn) params.set('checkIn', checkIn);
            if (checkOut) params.set('checkOut', checkOut);
            window.location.href = `/book?${params.toString()}`;
          }}
        />
      )}
    </div>
  );
};

export default HotelDetails;
