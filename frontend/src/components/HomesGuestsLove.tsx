import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import hotel1 from '../assets/hotelPictures/hotel_room_2.jpg';
import hotel2 from '../assets/hotelPictures/hotel_room_4.jpg';
import hotel3 from '../assets/hotelPictures/hotel_room5.jpg';
import hotel4 from '../assets/hotelPictures/hotel-_room_1.jpg';
import hotel5 from '../assets/hotelPictures/hotel_out_2.jpg';
import hotel6 from '../assets/hotelPictures/hotel_out_4.jpg';

interface Property {
  id: string;
  image: string;
  name: string;
  location: string;
  score: number;
  label: string;
  reviews: number;
  price: number;
}

const HomesGuestsLove: React.FC = () => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const properties: Property[] = [
    {
      id: '1',
      image: hotel1,
      name: 'Grand Suite Deluxe',
      location: 'Downtown, City Center',
      score: 9.7,
      label: 'Exceptional',
      reviews: 245,
      price: 299,
    },
    {
      id: '2',
      image: hotel2,
      name: 'Ocean View Resort',
      location: 'Beachfront, Coastal Area',
      score: 9.5,
      label: 'Superb',
      reviews: 189,
      price: 349,
    },
    {
      id: '3',
      image: hotel3,
      name: 'Mountain Lodge',
      location: 'Mountain View, Highlands',
      score: 9.3,
      label: 'Superb',
      reviews: 156,
      price: 279,
    },
    {
      id: '4',
      image: hotel4,
      name: 'City Center Hotel',
      location: 'Business District',
      score: 9.1,
      label: 'Wonderful',
      reviews: 312,
      price: 199,
    },
    {
      id: '5',
      image: hotel5,
      name: 'Garden Retreat',
      location: 'Suburban Gardens',
      score: 9.4,
      label: 'Superb',
      reviews: 98,
      price: 249,
    },
    {
      id: '6',
      image: hotel6,
      name: 'Luxury Penthouse',
      location: 'Skyline District',
      score: 9.8,
      label: 'Exceptional',
      reviews: 67,
      price: 499,
    },
  ];

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
          {properties.map((property) => (
            <Link key={property.id} to={`/hotels/${property.id}`} className="homes-guests-love__card-link">
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
                  <p className="homes-guests-love__card-location">{property.location}</p>

                  <div className="homes-guests-love__card-rating">
                    <span className="homes-guests-love__score">{property.score}</span>
                    <span className="homes-guests-love__label">{property.label}</span>
                    <span className="homes-guests-love__reviews">
                      ({property.reviews} reviews)
                    </span>
                  </div>

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
