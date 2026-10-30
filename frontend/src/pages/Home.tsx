import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import SearchBar from '../components/SearchBar';
import ImageGallery from '../components/ImageGallery';
import HomesGuestsLove from '../components/HomesGuestsLove';
import type { RootState } from '../redux/store';
import feature1 from '../assets/hotelPictures/feature_1.jpg';
import feature2 from '../assets/hotelPictures/feature_2.jpg';
import feature3 from '../assets/hotelPictures/feature_3.jpg';
import feature4 from '../assets/hotelPictures/feature_4.jpg';

const Home: React.FC = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  const featuredImages = [
    { id: '1', url: feature1, altText: 'Luxury hotel room' },
    { id: '2', url: feature2, altText: 'Hotel amenities' },
    { id: '3', url: feature3, altText: 'Hotel exterior' },
    { id: '4', url: feature4, altText: 'Hotel suite' },
  ];

  return (
    
    <div style={{ padding: '2rem', textAlign: 'center', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem',fontFamily: "'Courier New', Courier, monospace" }}>Welcome to Grand-Rest Hotel</h1>
      <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2rem',fontFamily: "'Courier New', Courier, monospace"}}>
        Search our branches by destination and dates, then book a room.
      </p>
      <SearchBar />
      <div style={{ marginTop: '3rem' }}>
        <ImageGallery images={featuredImages} name="Featured Hotels" />
      </div>
      <div style={{ marginTop: '4rem' }}>
        <HomesGuestsLove />
      </div>
      {/* <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
        <Link
          to="/hotels"
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '0.5rem',
            fontSize: '1rem',
          }}
        >
          Browse all branches
        </Link>
        <Link
          to={isAuthenticated ? '/bookings' : '/login'}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: '#10b981',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '0.5rem',
            fontSize: '1rem',
          }}
        >
          {isAuthenticated ? 'My bookings' : 'Sign In'}
        </Link>
      </div> */}
    </div>
  );
};

export default Home;
