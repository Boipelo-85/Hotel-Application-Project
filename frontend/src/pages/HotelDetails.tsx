import React, { useEffect } from 'react';
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

const HotelDetails: React.FC = () => {
  const { branchId } = useParams<{ branchId: string }>();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { currentBranch, loading, error } = useSelector((state: RootState) => state.hotels);
  const rooms = useSelector((state: RootState) => state.rooms.rooms);
  const reviews = useSelector((state: RootState) => state.reviews.reviews);

  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const guests = searchParams.get('guests') || '2';
  const quantity = searchParams.get('rooms') || '1';

  useEffect(() => {
    if (!branchId) return;
    void dispatch(fetchBranchById(branchId));
    void dispatch(fetchRooms(branchId));
    void dispatch(fetchBranchReviews(branchId));
  }, [dispatch, branchId]);

  if (loading && !currentBranch) return <Loading message="Loading branch..." />;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;
  if (!currentBranch) return <div style={{ padding: '2rem' }}>Branch not found.</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
      <p>
        <Link to="/hotels">← All branches</Link>
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

      <h2 style={{ marginTop: '2rem' }}>Rooms</h2>
      {rooms.length === 0 ? (
        <p>No rooms listed for this branch yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {rooms.map((room) => {
            const price = room.price || room.price_per_night;
            const params = new URLSearchParams({
              roomId: String(room.id),
              branchId: String(room.branch_id),
              guests,
              quantity,
            });
            if (checkIn) params.set('checkIn', checkIn);
            if (checkOut) params.set('checkOut', checkOut);
            return (
              <div key={room.id} style={{ border: '1px solid #ddd', borderRadius: '0.5rem', padding: '1rem' }}>
                <h3>{room.room_type}</h3>
                {room.description && <p style={{ color: '#666' }}>{room.description}</p>}
                <p>Sleeps {room.capacity} · {room.quantity ?? room.quantity_available ?? 1} available</p>
                <p style={{ fontWeight: 'bold', color: '#10b981' }}>
                  {room.currency} {price}/night
                </p>
                <Link
                  to={`/book?${params.toString()}`}
                  style={{
                    display: 'inline-block',
                    marginTop: '0.75rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '0.25rem',
                  }}
                >
                  Book this room
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <h2 style={{ marginTop: '2rem' }}>Reviews</h2>
      <ReviewList reviews={reviews || []} />
    </div>
  );
};

export default HotelDetails;
