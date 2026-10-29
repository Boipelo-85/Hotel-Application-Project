import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import SearchBar from '../components/SearchBar';
import type { RootState } from '../redux/store';

const Home: React.FC = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  return (
    <div style={{ padding: '2rem', textAlign: 'center', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Welcome to Grand-Rest Hotel</h1>
      <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2rem' }}>
        Search our branches by destination and dates, then book a room.
      </p>
      <SearchBar />
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
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
      </div>
    </div>
  );
};

export default Home;
