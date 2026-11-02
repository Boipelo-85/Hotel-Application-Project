import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Property {
  id: string;
  image: string;
  name: string;
  location: string;
  province: string;
  score: number;
  reviews: number;
  price: number;
  starRating: number;
  distanceDowntown?: string;
  distanceBeach?: string;
  description?: string;
}

interface HomesGuestsLoveProps {
  filterProvince?: string;
}

const HomesGuestsLove: React.FC<HomesGuestsLoveProps> = ({ filterProvince }) => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await fetch('/api/v1/branches');
        if (!response.ok) {
          console.error('Failed to fetch branches');
          setLoading(false);
          return;
        }
        const data = await response.json();
        const branches = data.branches || [];

        const mappedProperties: Property[] = branches.map((branch: any) => ({
          id: String(branch.id),
          image: branch.images?.[0]?.url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
          name: branch.name,
          location: `${branch.city}, ${branch.province}`,
          province: branch.province,
          score: 9.0 + Math.random() * 0.9,
          reviews: Math.floor(Math.random() * 500) + 50,
          price: branch.price_per_night || 100,
          starRating: branch.star_rating || 4,
          description: branch.description || 'Beautiful hotel with excellent amenities.',
        }));

        setProperties(mappedProperties);
      } catch (error) {
        console.error('Error fetching branches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, []);

  const filteredProperties = filterProvince
    ? properties.filter(
        (property) =>
          property.province.toLowerCase() === filterProvince.toLowerCase()
      )
    : properties;

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      return newFavorites;
    });
  };

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
      <section className="homes-guests-love">
        <div className="homes-guests-love__header">
          <h2 className="homes-guests-love__title">Homes guests love</h2>
        </div>
        <p style={{ padding: '2rem', color: '#666' }}>Loading properties...</p>
      </section>
    );
  }

  if (filteredProperties.length === 0) {
    return (
      <section className="homes-guests-love">
        <div className="homes-guests-love__header">
          <h2 className="homes-guests-love__title">Homes guests love</h2>
        </div>
        <p style={{ padding: '2rem', color: '#666' }}>
          {filterProvince ? `No properties found in ${filterProvince}` : 'No properties available yet.'}
        </p>
      </section>
    );
  }

  return (
    <section className="homes-guests-love">
      <div className="homes-guests-love__header">
        <h2 className="homes-guests-love__title">Homes guests love</h2>
        <Link to="/hotels" className="homes-guests-love__discover">
          Discover homes
        </Link>
      </div>

      <div className="homes-guests-love__scroll-container">
        <div id="cards-container" className="homes-guests-love__cards">
          {filteredProperties.map((property) => (
            <Link key={property.id} to={`/branches/${property.id}`} className="homes-guests-love__card-link">
              <div className="homes-guests-love__card">
                <div className="homes-guests-love__card-image">
                  <img
                    src={property.image}
                    alt={property.name}
                    className="homes-guests-love__card-img"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavorite(property.id);
                    }}
                    className="homes-guests-love__favorite-btn"
                    aria-label="Add to favorites"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill={favorites.has(property.id) ? '#ff4757' : 'none'}
                      stroke={favorites.has(property.id) ? '#ff4757' : '#fff'}
                      strokeWidth="2"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                </div>

                <div className="homes-guests-love__card-content">
                  <h3 className="homes-guests-love__card-name">{property.name}</h3>
                  
                  <div className="homes-guests-love__card-stars">
                    <span className="homes-guests-love__stars">{'★'.repeat(property.starRating)}</span>
                  </div>

                  <p className="homes-guests-love__card-location">{property.location}  </p>

                  <div className="homes-guests-love__card-rating">
                    <span className="homes-guests-love__score">{property.score}</span>
                    <span className="homes-guests-love__label"> 'boo  now sp' </span>
                    <span className="homes-guests-love__reviews">
                      ({property.reviews} reviews)
                    </span>
                  </div>

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
                    <span className="homes-guests-love__price-amount">${property.price}</span>
                  </div>
                </div>
              </div>
            </Link>
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
