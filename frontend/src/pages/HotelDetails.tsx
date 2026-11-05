import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBranchById } from '../redux/hotelSlice';
import { fetchRooms } from '../redux/roomSlice';
import { fetchBranchReviews } from '../redux/reviewSlice';
import type { AppDispatch, RootState } from '../redux/store';
import Loading from '../components/Loading';
import { safeReturnPath } from '../utils/navigation';
import FavouriteButton from '../components/FavouriteButton';
import ReviewList from '../components/ReviewList';
import ImageGallery from '../components/ImageGallery';
import Map from '../components/Map';
import ShareButton from '../components/ShareButton';
import RoomDetailsModal from '../components/RoomDetailsModal';

function nightsBetween(checkIn: string, checkOut: string): number {
  const nights = (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000;
  return Number.isFinite(nights) && nights > 0 ? nights : 0;
}

const HotelDetails: React.FC = () => {
  const { branchId } = useParams<{ branchId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { currentBranch, loading, error } = useSelector((state: RootState) => state.hotels);
  const rooms = useSelector((state: RootState) => state.rooms.rooms);
  const reviews = useSelector((state: RootState) => state.reviews.reviews);
  const roomsLoading = useSelector((state: RootState) => state.rooms.loading);
  const roomsError = useSelector((state: RootState) => state.rooms.error);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [localCheckIn, setLocalCheckIn] = useState(searchParams.get('checkIn') || '');
  const [localCheckOut, setLocalCheckOut] = useState(searchParams.get('checkOut') || '');
  const [localGuests, setLocalGuests] = useState(searchParams.get('guests') || '2');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const checkIn = searchParams.get('checkIn') || localCheckIn;
  const checkOut = searchParams.get('checkOut') || localCheckOut;
  const guests = searchParams.get('guests') || localGuests;
  const quantity = searchParams.get('rooms') || '1';
  const requestedReturnTo = searchParams.get('returnTo') ?? (location.state as { returnTo?: unknown } | null)?.returnTo;
  const safeReturnTo = safeReturnPath(requestedReturnTo);
  const backToResults = typeof requestedReturnTo === 'string' && safeReturnTo === requestedReturnTo &&
    ['/', '/hotels', '/favourites'].includes(safeReturnTo.split('?')[0])
    ? safeReturnTo
    : '/hotels';
  const hasRequestedStay = Boolean(checkIn && checkOut);
  const noMatchingRooms = !roomsLoading && hasRequestedStay && rooms.length > 0 &&
    rooms.every((room) => room.is_available === false || room.can_accommodate_guests === false);

  useEffect(() => {
    if (!branchId) return;
    void dispatch(fetchBranchById(branchId));
    void dispatch(fetchBranchReviews(branchId));
  }, [dispatch, branchId]);

  useEffect(() => {
    setLocalCheckIn(searchParams.get('checkIn') || '');
    setLocalCheckOut(searchParams.get('checkOut') || '');
    setLocalGuests(searchParams.get('guests') || '2');
  }, [searchParams]);

  useEffect(() => {
    if (!branchId) return;
    const params: Record<string, string> = {};
    if (checkIn) params.checkIn = checkIn;
    if (checkOut) params.checkOut = checkOut;
    if (guests) params.guests = guests;
    params.quantity = quantity;
    console.log('Fetching rooms for branch:', branchId, 'with params:', params);
    void dispatch(fetchRooms({ branchId, params }));
  }, [dispatch, branchId, checkIn, checkOut, guests, quantity]);

  const handleDateChange = () => {
    if (Boolean(localCheckIn) !== Boolean(localCheckOut)) {
      setDateError('Choose both check-in and check-out dates, or clear both.');
      return;
    }
    if (localCheckIn && localCheckOut && localCheckOut <= localCheckIn) {
      setDateError('Check-out must be after check-in.');
      return;
    }
    setDateError(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('checkIn');
    newParams.delete('checkOut');
    newParams.delete('guests');
    if (localCheckIn) newParams.set('checkIn', localCheckIn);
    if (localCheckOut) newParams.set('checkOut', localCheckOut);
    if (localGuests) newParams.set('guests', localGuests);
    setSearchParams(newParams);
  };

  if (loading && !currentBranch) return <Loading message="Loading branch..." />;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;
  if (!currentBranch) return <div style={{ padding: '2rem' }}>Branch not found.</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
      <p>
        <Link 
          to={backToResults}
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
      {currentBranch.contact_email && (
        <p style={{ color: '#666' }}>
          {currentBranch.contact_email}
          {currentBranch.contact_phone ? ` · ${currentBranch.contact_phone}` : ''}
        </p>
      )}

      <ImageGallery images={currentBranch.images} name={currentBranch.name} />

      {Object.keys(currentBranch.policies || {}).length > 0 && (
        <>
          <h2 style={{ marginTop: '2rem' }}>Policies</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '0.5rem 1rem' }}>
            {Object.entries(currentBranch.policies).map(([name, policy]) => (
              <React.Fragment key={name}>
                <dt style={{ fontWeight: 700 }}>{name}</dt>
                <dd style={{ margin: 0 }}>{policy}</dd>
              </React.Fragment>
            ))}
          </dl>
        </>
      )}

      <h2 style={{ marginTop: '2rem' }}>Location</h2>
      <Map
        showExternalLink={false}
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
            min={new Date().toISOString().slice(0, 10)}
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
            min={localCheckIn || new Date().toISOString().slice(0, 10)}
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

      {dateError && <p role="alert" style={{ color: '#b91c1c' }}>{dateError}</p>}
      {noMatchingRooms && (
        <div role="status" style={{ padding: '1rem', marginBottom: '1rem', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '0.5rem' }}>
          <p style={{ marginTop: 0 }}>No rooms at this branch can fit your party for these dates.</p>
          <p>Try changing your dates or guest count above, or <Link to={backToResults}>choose another branch</Link>.</p>
        </div>
      )}

      {!roomsLoading && rooms.length === 0 ? (
        <p style={{ fontFamily: "'Courier New', Courier, monospace" }}>
          {hasRequestedStay
            ? 'No rooms are available for this stay. Change your dates or choose another branch.'
            : 'No rooms listed for this branch yet.'}
        </p>
      ) : rooms.length > 0 ? (
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
              const totalPrice = price && nightsBetween(checkIn, checkOut) > 0
                ? Number(price) * nightsBetween(checkIn, checkOut) * Number(quantity)
                : 0;
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
                          navigate(`/book?${params.toString()}`);
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
      ) : null}

      <h2 style={{ marginTop: '2rem' }}>Reviews</h2>
      <ReviewList reviews={reviews || []} />

      {selectedRoomId && (
        <RoomDetailsModal
          roomId={selectedRoomId}
          onClose={() => setSelectedRoomId(null)}
          canBook={(() => {
            const selected = rooms.find((room) => String(room.id) === selectedRoomId);
            return Boolean(selected && selected.is_available !== false && selected.can_accommodate_guests !== false);
          })()}
          onBook={(room) => {
            const selected = rooms.find((listedRoom) => String(listedRoom.id) === String(room.id));
            if (!selected || selected.is_available === false || selected.can_accommodate_guests === false) return;
            const params = new URLSearchParams({
              roomId: String(room.id),
              branchId: branchId || String((room as any).branch_id),
              guests,
              quantity,
            });
            if (checkIn) params.set('checkIn', checkIn);
            if (checkOut) params.set('checkOut', checkOut);
            navigate(`/book?${params.toString()}`);
          }}
        />
      )}
    </div>
  );
};

export default HotelDetails;
