import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../redux/store';
import { logout } from '../redux/authSlice';

const linkStyle: React.CSSProperties = {
  color: 'white',
  textDecoration: 'none',
};

const Navbar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/');
  };

  return (
    <nav style={{ backgroundColor: '#1f2937', padding: '1rem 2rem', color: 'white' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <Link to="/" style={{ ...linkStyle, fontSize: '1.5rem', fontWeight: 'bold' }}>
          Grand-Rest Hotel
        </Link>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to="/hotels" style={linkStyle}>
            Branches
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/bookings" style={linkStyle}>
                My Bookings
              </Link>
              <Link to="/favourites" style={linkStyle}>
                Favourites
              </Link>
              <Link to="/notifications" style={linkStyle}>
                Notifications
              </Link>
              <Link to="/profile" style={linkStyle}>
                {user?.name || 'Profile'}
              </Link>
              {(user?.role === 'admin' || user?.role === 'branch_manager') && (
                <Link to="/admin" style={linkStyle}>
                  Admin
                </Link>
              )}
              <button
                type="button"
                onClick={() => void handleLogout()}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'transparent',
                  color: 'white',
                  border: '1px solid #9ca3af',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                }}
              >
                Sign out
              </button>
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
