import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../redux/store';
import { logout } from '../redux/authSlice';

const Navbar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar__container">
        <Link to="/" className="navbar__brand">
          Grand-Rest Hotel
        </Link>
        <div className="navbar__links">
          <Link to="/hotels" className="navbar__link">
            Branches
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/bookings" className="navbar__link">
                My Bookings
              </Link>
              <Link to="/favourites" className="navbar__link">
                Favourites
              </Link>
              <Link to="/notifications" className="navbar__link">
                Notifications
              </Link>
              <Link to="/profile" className="navbar__link">
                {user?.name || 'Profile'}
              </Link>
              {(user?.role === 'admin' || user?.role === 'branch_manager') && (
                <Link to="/admin" className="navbar__link">
                  Admin
                </Link>
              )}
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="navbar__button"
              >
                Sign out
              </button>
            </>
          ) : (
            !isAuthPage && (
              <Link
                to="/login"
                className="navbar__sign-in"
              >
                Sign In
              </Link>
            )
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
