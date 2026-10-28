import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { fetchBranches, searchAvailability } from '../redux/hotelSlice';
import { fetchFavourites } from '../redux/favouriteSlice';
import type { AppDispatch, RootState } from '../redux/store';
import HotelCard from '../components/HotelCard';
import SearchBar from '../components/SearchBar';
import Loading from '../components/Loading';

const Hotels: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();
  const { branches, searchResults, loading, error } = useSelector((state: RootState) => state.hotels);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  const destination = searchParams.get('destination') || '';
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const rooms = searchParams.get('rooms') || '1';
  const guests = searchParams.get('guests') || '2';
  const isSearch = Boolean(destination && checkIn && checkOut);

  useEffect(() => {
    if (isSearch) {
      void dispatch(searchAvailability({ destination, checkIn, checkOut, rooms, guests }));
    } else {
      void dispatch(fetchBranches());
    }
  }, [dispatch, isSearch, destination, checkIn, checkOut, rooms, guests]);

  useEffect(() => {
    if (isAuthenticated) {
      void dispatch(fetchFavourites());
    }
  }, [dispatch, isAuthenticated]);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>{isSearch ? 'Available stays' : 'Our Branches'}</h1>
      <div style={{ marginBottom: '1.5rem' }}>
        <SearchBar
          initialDestination={destination}
          initialCheckIn={checkIn || undefined}
          initialCheckOut={checkOut || undefined}
          initialRooms={rooms}
          initialGuests={guests}
        />
      </div>
      {loading && <Loading />}
      {error && (
        <div style={{ padding: '1rem', color: '#991b1b', backgroundColor: '#fee' }}>{error}</div>
      )}
      {!loading && !error && isSearch && searchResults.length === 0 && (
        <p>No rooms are available for those dates. Try another destination or stay length.</p>
      )}
      {!loading && !error && !isSearch && branches.length === 0 && <p>No branches available.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {isSearch
          ? searchResults.map((result, index) => (
              <HotelCard
                key={`${result.branch.id}-${result.roomType}-${index}`}
                id={result.branch.id}
                name={result.branch.name}
                city={result.branch.city}
                province={result.branch.province}
                address={result.branch.address}
                starRating={result.branch.starRating}
                price={result.price}
                currency={result.currency}
                subtitle={`${result.roomType} · ${result.availableRooms} room(s) · sleeps ${result.capacity}`}
                imageUrl={result.branch.images?.[0]?.url}
                imageAlt={result.branch.images?.[0]?.altText || `${result.branch.name} accommodation`}
                to={`/hotels/${result.branch.id}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&rooms=${rooms}`}
              />
            ))
          : branches.map((branch) => (
              <HotelCard
                key={branch.id}
                id={branch.id}
                name={branch.name}
                city={branch.city}
                province={branch.province}
                address={branch.address}
                starRating={branch.star_rating}
                price={branch.price_per_night}
                currency={branch.currency}
                imageUrl={branch.images[0]?.url}
                imageAlt={branch.images[0]?.altText || `${branch.name} accommodation`}
              />
            ))}
      </div>
    </div>
  );
};

export default Hotels;
