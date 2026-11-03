import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useSearchParams } from 'react-router-dom';
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
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { branches, searchResults, loading, error } = useSelector((state: RootState) => state.hotels);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const resultsPath = `${location.pathname}${location.search}`;
  const scrollStorageKey = `hotel-results-scroll:${resultsPath}`;
  const restoringScroll = useRef(false);
  const [loadedDataKey, setLoadedDataKey] = useState<string | null>(null);

  const destination = searchParams.get('destination') || '';
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const rooms = searchParams.get('rooms') || '1';
  const guests = searchParams.get('guests') || '2';
  // Convert guests to adults/children (default to all adults for backward compatibility)
  const adults = searchParams.get('adults') || guests;
  const children = searchParams.get('children') || '0';
  const isSearch = Boolean(destination && checkIn && checkOut);
  const resultsDataKey = isSearch
    ? `search:${destination}:${checkIn}:${checkOut}:${rooms}:${guests}`
    : 'branches';

  const readFilters = (): FilterOptions => {
    const minPrice = Number(searchParams.get('minPrice'));
    const maxPrice = Number(searchParams.get('maxPrice'));
    const minStarRating = Number(searchParams.get('minStarRating'));
    const amenities = searchParams.getAll('amenity');
    return {
      ...(Number.isFinite(minPrice) && searchParams.has('minPrice') ? { minPrice } : {}),
      ...(Number.isFinite(maxPrice) && searchParams.has('maxPrice') ? { maxPrice } : {}),
      ...(Number.isFinite(minStarRating) && searchParams.has('minStarRating') ? { minStarRating } : {}),
      ...(amenities.length ? { amenities } : {}),
    };
  };
  const [filters, setFilters] = useState<FilterOptions>(readFilters);
  const [showFullMap, setShowFullMap] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const request = isSearch
      ? dispatch(searchAvailability({ destination, checkIn, checkOut, rooms, guests }))
      : dispatch(fetchBranches());
    void request.finally(() => {
      if (active) setLoadedDataKey(resultsDataKey);
    });
    return () => {
      active = false;
    };
  }, [dispatch, isSearch, destination, checkIn, checkOut, rooms, guests, resultsDataKey]);

  useEffect(() => {
    const minPrice = Number(searchParams.get('minPrice'));
    const maxPrice = Number(searchParams.get('maxPrice'));
    const minStarRating = Number(searchParams.get('minStarRating'));
    const amenities = searchParams.getAll('amenity');
    setFilters({
      ...(Number.isFinite(minPrice) && searchParams.has('minPrice') ? { minPrice } : {}),
      ...(Number.isFinite(maxPrice) && searchParams.has('maxPrice') ? { maxPrice } : {}),
      ...(Number.isFinite(minStarRating) && searchParams.has('minStarRating') ? { minStarRating } : {}),
      ...(amenities.length ? { amenities } : {}),
    });
  }, [searchParams]);

  useEffect(() => {
    const savedPosition = sessionStorage.getItem(scrollStorageKey);
    restoringScroll.current = savedPosition !== null;
    if (loadedDataKey !== resultsDataKey || savedPosition === null) return;

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo(0, Number(savedPosition));
      restoringScroll.current = false;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadedDataKey, resultsDataKey, resultsPath, scrollStorageKey]);

  useEffect(() => {
    const saveScrollPosition = () => {
      if (!restoringScroll.current) {
        sessionStorage.setItem(scrollStorageKey, String(window.scrollY));
      }
    };
    window.addEventListener('scroll', saveScrollPosition, { passive: true });
    saveScrollPosition();
    return () => {
      saveScrollPosition();
      window.removeEventListener('scroll', saveScrollPosition);
    };
  }, [scrollStorageKey]);

  const handleFilterChange = (nextFilters: FilterOptions) => {
    setFilters(nextFilters);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('minPrice');
    nextParams.delete('maxPrice');
    nextParams.delete('minStarRating');
    nextParams.delete('amenity');
    if (nextFilters.minPrice !== undefined) nextParams.set('minPrice', String(nextFilters.minPrice));
    if (nextFilters.maxPrice !== undefined) nextParams.set('maxPrice', String(nextFilters.maxPrice));
    if (nextFilters.minStarRating !== undefined) nextParams.set('minStarRating', String(nextFilters.minStarRating));
    nextFilters.amenities?.forEach((amenity) => nextParams.append('amenity', amenity));
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    if (isAuthenticated) {
      void dispatch(fetchFavourites());
    }
  }, [dispatch, isAuthenticated]);

  const hotelDetailsPath = (branchId: string) => {
    const detailsParams = new URLSearchParams();
    ['checkIn', 'checkOut', 'guests', 'rooms'].forEach((key) => {
      const value = searchParams.get(key);
      if (value) detailsParams.set(key, value);
    });
    detailsParams.set('returnTo', resultsPath);
    return `/hotels/${branchId}?${detailsParams.toString()}`;
  };

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
    <div className="hotels-page">
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
      <div className="hotels-page__layout">
        <aside>
          <SidebarMapCard
            branches={filteredBranches}
            searchResults={filteredSearchResults}
            onShowFullMap={() => setShowFullMap(true)}
            onMarkerHover={setHoveredCardId}
            hoveredCardId={hoveredCardId}
          />
          <Filter
            onFilterChange={handleFilterChange}
            initialFilters={filters}
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
          <div className="hotels-page__cards">
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
                    to={hotelDetailsPath(result.branch.id)}
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
                    to={hotelDetailsPath(branch.id)}
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
