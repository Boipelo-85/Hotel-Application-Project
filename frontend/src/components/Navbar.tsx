import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';

const Navbar: React.FC = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  return (
    <nav style={{ backgroundColor: '#1f2937', padding: '1rem 2rem', color: 'white' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontSize: '1.5rem', fontWeight: 'bold' }}>
          Grand-Rest Hotel
        </Link>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link to="/hotels" style={{ color: 'white', textDecoration: 'none' }}>
            Branches
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/bookings" style={{ color: 'white', textDecoration: 'none' }}>
                My Bookings
              </Link>
              <span style={{ color: '#9ca3af' }}>{user?.name}</span>
            </>
          ) : (
            <Link
              to="/login"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '0.25rem',
              }}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
