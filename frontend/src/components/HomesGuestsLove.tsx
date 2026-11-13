import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import FavouriteButton from './FavouriteButton';
import { fetchFavourites } from '../redux/favouriteSlice';
import type { AppDispatch, RootState } from '../redux/store';

interface Property {
  id: string;
  image: string;
  name: string;
  location: string;
  province: string;
  price: number;
  currency: string;
  starRating: number;
  distanceDowntown?: string;
  distanceBeach?: string;
  description?: string;
}

interface HomesGuestsLoveProps {
  filterProvince?: string;
}

const HomesGuestsLove: React.FC<HomesGuestsLoveProps> = ({ filterProvince }) => {
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [properties, setProperties] = useState<Property[]>([]);
  const [unavailablePhotos, setUnavailablePhotos] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await fetch('/api/v1/branches', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Failed to load properties (${response.status})`);
        }
        const data = (await response.json()) as {
          branches?: Array<{
            id: string | number;
            name: string;
            city: string;
            province: string;
            images?: Array<{ url: string }>;
            price_per_night?: string | number | null;
            currency?: string;
            star_rating?: number | null;
            description?: string | null;
          }>;
        };
        if (!Array.isArray(data.branches)) {
          throw new Error('The properties response was invalid');
        }

        const mappedProperties: Property[] = data.branches.map((branch) => ({
          id: String(branch.id),
          image: branch.images?.[0]?.url || '',
          name: branch.name,
          location: `${branch.city}, ${branch.province}`,
          province: branch.province,
          price: Number(branch.price_per_night ?? 0),
          currency: branch.currency || 'USD',
          starRating: branch.star_rating || 4,
          description: branch.description || 'Beautiful hotel with excellent amenities.',
        }));

        setProperties(mappedProperties);
        setError(null);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load properties');
      } finally {
        setLoading(false);
      }
    };

    void fetchBranches();
    const refresh = () => { void fetchBranches(); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  const filteredProperties = filterProvince
    ? properties.filter(
        (property) =>
          property.province.toLowerCase() === filterProvince.toLowerCase()
      )
    : properties;

  useEffect(() => {
    if (isAuthenticated) void dispatch(fetchFavourites());
  }, [dispatch, isAuthenticated]);

  const scroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('cards-container');
    if (container) {
      const scrollAmount = container.clientWidth * 0.8;
      if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  if (loading) {
    return (
      <section className="homes-guests-love" aria-labelledby="home-branch-cards-title">
        <p style={{ padding: '2rem', color: '#666' }}>Loading properties...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="homes-guests-love" aria-labelledby="home-branch-cards-title">
        <p role="alert" style={{ padding: '2rem', color: '#991b1b' }}>{error}</p>
      </section>
    );
  }

  if (filteredProperties.length === 0) {
    return (
      <section className="homes-guests-love" aria-labelledby="home-branch-cards-title">
        <p style={{ padding: '2rem', color: '#666' }}>
          {filterProvince ? `No properties found in ${filterProvince}` : 'No properties available yet.'}
        </p>
      </section>
    );
  }

  return (
    <section className="homes-guests-love" aria-labelledby="home-branch-cards-title">

      <div className="homes-guests-love__scroll-container">
        <div id="cards-container" className="homes-guests-love__cards">
          {filteredProperties.map((property) => (
            <div key={property.id} className="homes-guests-love__card-item">
              <Link to={`/branches/${property.id}`} state={{ returnTo: `${location.pathname}${location.search}` }} className="homes-guests-love__card-link">
                <div className="homes-guests-love__card">
                  <div className="homes-guests-love__card-image">
                    {property.image && !unavailablePhotos.has(property.image) ? <img
                      src={property.image}
                      alt={property.name}
                      onError={() => setUnavailablePhotos((previous) => new Set(previous).add(property.image))}
                      className="homes-guests-love__card-img"
                    /> : <div role="img" aria-label={`No photo available for ${property.name}`} style={{ height: '100%', display: 'grid', placeItems: 'center', background: '#e5e7eb' }}>No photo available</div>}
                  </div>

                  <div className="homes-guests-love__card-content">
                    <h3 className="homes-guests-love__card-name">{property.name}</h3>

                    <div className="homes-guests-love__card-stars">
                      <span className="homes-guests-love__stars">{'★'.repeat(property.starRating)}</span>
                    </div>

                    <p className="homes-guests-love__card-location">{property.location}  </p>

                    {property.distanceDowntown && (
                      <p className="homes-guests-love__card-distance">{property.distanceDowntown}</p>
                    )}
                    {property.distanceBeach && (
                      <p className="homes-guests-love__card-distance">{property.distanceBeach}</p>
                    )}

                    {property.description && (
                      <p className="homes-guests-love__card-description">{property.description}</p>
                    )}

                    <div className="homes-guests-love__card-price">
                      <span className="homes-guests-love__price-label">Starting from</span>
                      <span className="homes-guests-love__price-amount">
                        {property.currency} {property.price}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
              <FavouriteButton branchId={property.id} loadOnMount={false} className="homes-guests-love__favorite-btn" />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scroll('right')}
          className="homes-guests-love__scroll-btn"
          aria-label="Scroll right"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </section>
  );
};

export default HomesGuestsLove;
