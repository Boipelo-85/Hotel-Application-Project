import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { fetchBranches, searchAvailability } from '../redux/hotelSlice';
import { fetchFavourites } from '../redux/favouriteSlice';
import type { AppDispatch, RootState } from '../redux/store';
import HotelCard from '../components/HotelCard';
import SearchBar from '../components/SearchBar';
import Filter, { type FilterOptions } from '../components/Filter';
import SidebarMapCard from '../components/SidebarMapCard';
import FullMapView from '../components/FullMapView';
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
  // Convert guests to adults/children (default to all adults for backward compatibility)
  const adults = searchParams.get('adults') || guests;
  const children = searchParams.get('children') || '0';
  const isSearch = Boolean(destination && checkIn && checkOut);

  const [filters, setFilters] = useState<FilterOptions>({});
  const [showFullMap, setShowFullMap] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

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

  // Filter branches based on selected filters
  const filteredBranches = useMemo(() => {
    return branches.filter((branch) => {
      const pricePerNight = Number(branch.price_per_night);
      if (filters.minPrice && pricePerNight < filters.minPrice) return false;
      if (filters.maxPrice && pricePerNight > filters.maxPrice) return false;
      if (filters.minStarRating && (branch.star_rating || 0) < filters.minStarRating) return false;
      if (filters.amenities && filters.amenities.length > 0) {
        const branchAmenityIds = branch.amenities.map((a: { id: string }) => a.id);
        const hasAllAmenities = filters.amenities.every((amenityId) =>
          branchAmenityIds.includes(amenityId)
        );
        if (!hasAllAmenities) return false;
      }
      return true;
    });
  }, [branches, filters]);

  // Filter search results based on selected filters
  const filteredSearchResults = useMemo(() => {
    return searchResults.filter((result) => {
      const price = Number(result.price);
      if (filters.minPrice && price < filters.minPrice) return false;
      if (filters.maxPrice && price > filters.maxPrice) return false;
      if (filters.minStarRating && (result.branch.starRating || 0) < filters.minStarRating) return false;
      if (filters.amenities && filters.amenities.length > 0) {
        const branchAmenities = result.branch.amenities || [];
        const branchAmenityIds = branchAmenities.map((a: { id: string }) => a.id);
        const hasAllAmenities = filters.amenities.every((amenityId) =>
          branchAmenityIds.includes(amenityId)
        );
        if (!hasAllAmenities) return false;
      }
      return true;
    });
  }, [searchResults, filters]);

  // Collect all unique amenities from branches
  const allAmenities = useMemo(() => {
    const amenityMap = new Map<string, { id: string; name: string; category?: string }>();
    branches.forEach((branch) => {
      branch.amenities.forEach((amenity) => {
        if (!amenityMap.has(amenity.id)) {
          amenityMap.set(amenity.id, {
            id: amenity.id,
            name: amenity.name,
            category: amenity.category || undefined,
          });
        }
      });
    });
    return Array.from(amenityMap.values());
  }, [branches]);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>{isSearch ? 'Available stays' : 'Our Branches'}</h1>
      <div style={{ marginBottom: '1.5rem' }}>
        <SearchBar
          initialDestination={destination}
          initialCheckIn={checkIn || undefined}
          initialCheckOut={checkOut || undefined}
          initialRooms={rooms}
          initialAdults={adults}
          initialChildren={children}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
        <aside>
          <SidebarMapCard
            branches={filteredBranches}
            searchResults={filteredSearchResults}
            onShowFullMap={() => setShowFullMap(true)}
            onMarkerHover={setHoveredCardId}
            hoveredCardId={hoveredCardId}
          />
          <Filter
            onFilterChange={setFilters}
            availableAmenities={allAmenities}
          />
        </aside>
        <main>
          {loading && <Loading />}
          {error && (
            <div style={{ padding: '1rem', color: '#991b1b', backgroundColor: '#fee' }}>{error}</div>
          )}
          {!loading && !error && isSearch && filteredSearchResults.length === 0 && (
            <p>No rooms are available for those dates. Try another destination or stay length.</p>
          )}
          {!loading && !error && !isSearch && filteredBranches.length === 0 && <p>No branches available.</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {isSearch
              ? filteredSearchResults.map((result, index) => (
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
                    onMouseEnter={() => setHoveredCardId(result.branch.id)}
                    onMouseLeave={() => setHoveredCardId(null)}
                  />
                ))
              : filteredBranches.map((branch) => (
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
                    onMouseEnter={() => setHoveredCardId(branch.id)}
                    onMouseLeave={() => setHoveredCardId(null)}
                  />
                ))}
          </div>
        </main>
      </div>
      <FullMapView
        isOpen={showFullMap}
        onClose={() => setShowFullMap(false)}
        branches={filteredBranches}
        searchResults={filteredSearchResults}
        onPropertyClick={(id) => {
          setShowFullMap(false);
          // Scroll to the card
          const cardElement = document.querySelector(`[data-property-id="${id}"]`);
          if (cardElement) {
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }}
        hoveredCardId={hoveredCardId}
      />
    </div>
  );
};

export default Hotels;
